"""ShieldIP API Gateway Service — public entry point for the platform."""

import json
import logging
import os
import uuid
from datetime import datetime

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import bigquery, firestore, pubsub_v1, storage, tasks_v2
from google.protobuf import timestamp_pb2

from models import (
    AnalyticsSummary,
    APIResponse,
    AssetDetail,
    EnforceRequest,
    PlatformBreakdown,
    ViolationDetail,
    ViolationSummary,
)

# ─────────────────────────────────────────────
# Structured JSON logging for Cloud Logging
# ─────────────────────────────────────────────
class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger("api-gateway")
logger.setLevel(logging.INFO)
logger.handlers = [handler]

# ─────────────────────────────────────────────
# Environment
# ─────────────────────────────────────────────
PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
ASSETS_BUCKET = os.environ.get("GCS_ASSETS_BUCKET", "")
EVIDENCE_BUCKET = os.environ.get("GCS_EVIDENCE_BUCKET", "")
BQ_DATASET = os.environ.get("BIGQUERY_DATASET", "shieldip_analytics")
TASKS_QUEUE = os.environ.get("TASKS_QUEUE", "enforcement-actions")
VERTEX_LOCATION = os.environ.get("VERTEX_AI_LOCATION", "us-central1")

# ─────────────────────────────────────────────
# GCP Clients (Application Default Credentials)
# ─────────────────────────────────────────────
storage_client = storage.Client()
firestore_client = firestore.Client()
publisher = pubsub_v1.PublisherClient()
bq_client = bigquery.Client()
tasks_client = tasks_v2.CloudTasksClient()

# ─────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────
app = FastAPI(title="ShieldIP API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5199",
        "https://*.web.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _response(data=None, error=None) -> dict:
    return APIResponse(
        success=error is None,
        data=data,
        error=error,
        timestamp=_now_iso(),
    ).model_dump()


# ─────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    return _response(data={"status": "healthy", "service": "api-gateway"})


# ─────────────────────────────────────────────
# POST /assets/register
# ─────────────────────────────────────────────
@app.post("/assets/register")
async def register_asset(
    file: UploadFile = File(...),
    owner: str = Form(default="ShieldIP Demo Corp"),
):
    asset_id = str(uuid.uuid4())
    filename = file.filename or "unknown"
    content_type = file.content_type or "application/octet-stream"

    # Determine media type
    if content_type.startswith("image/"):
        media_type = "image"
    elif content_type.startswith("video/"):
        media_type = "video"
    else:
        media_type = "other"

    # Upload to GCS
    try:
        bucket = storage_client.bucket(ASSETS_BUCKET)
        blob = bucket.blob(f"assets/{asset_id}/{filename}")
        contents = await file.read()
        blob.upload_from_string(contents, content_type=content_type)
        gcs_uri = f"gs://{ASSETS_BUCKET}/assets/{asset_id}/{filename}"
        logger.info(f"Uploaded asset {asset_id} to {gcs_uri}")
    except Exception as exc:
        logger.error(f"GCS upload failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="File upload failed")

    # Write asset doc to Firestore
    registered_at = _now_iso()
    asset_doc = {
        "asset_id": asset_id,
        "filename": filename,
        "media_type": media_type,
        "content_type": content_type,
        "gcs_uri": gcs_uri,
        "owner": owner,
        "registered_at": registered_at,
    }
    firestore_client.collection("assets").document(asset_id).set(asset_doc)

    # Publish to asset-registered topic
    topic_path = publisher.topic_path(PROJECT_ID, "asset-registered")
    message_data = json.dumps({"asset_id": asset_id, "media_type": media_type}).encode()
    publisher.publish(topic_path, data=message_data)
    logger.info(f"Published asset-registered for {asset_id}")

    return _response(data={
        "asset_id": asset_id,
        "filename": filename,
        "media_type": media_type,
        "gcs_uri": gcs_uri,
        "registered_at": registered_at,
    })


# ─────────────────────────────────────────────
# GET /assets/{asset_id}
# ─────────────────────────────────────────────
@app.get("/assets/{asset_id}")
def get_asset(asset_id: str):
    doc = firestore_client.collection("assets").document(asset_id).get()
    if not doc.exists:
        return _response(error="Asset not found")

    asset_data = doc.to_dict()

    # Try to fetch fingerprint hash
    fp_doc = firestore_client.collection("fingerprints").document(asset_id).get()
    if fp_doc.exists:
        asset_data["phash"] = fp_doc.to_dict().get("phash")

    return _response(data=asset_data)


# ─────────────────────────────────────────────
# GET /violations
# ─────────────────────────────────────────────
@app.get("/violations")
def list_violations(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    offset = (page - 1) * page_size

    query = (
        firestore_client.collection("violations")
        .order_by("detected_at", direction=firestore.Query.DESCENDING)
        .offset(offset)
        .limit(page_size)
    )
    docs = query.stream()
    violations = [d.to_dict() for d in docs]

    return _response(data={
        "violations": violations,
        "page": page,
        "page_size": page_size,
    })


# ─────────────────────────────────────────────
# GET /violations/{violation_id}
# ─────────────────────────────────────────────
@app.get("/violations/{violation_id}")
def get_violation(violation_id: str):
    doc = firestore_client.collection("violations").document(violation_id).get()
    if not doc.exists:
        return _response(error="Violation not found")
    return _response(data=doc.to_dict())


# ─────────────────────────────────────────────
# POST /violations/{violation_id}/enforce
# ─────────────────────────────────────────────
@app.post("/violations/{violation_id}/enforce")
def enforce_violation(violation_id: str, body: EnforceRequest):
    doc = firestore_client.collection("violations").document(violation_id).get()
    if not doc.exists:
        return _response(error="Violation not found")

    # Create Cloud Task
    try:
        parent = tasks_client.queue_path(PROJECT_ID, VERTEX_LOCATION, TASKS_QUEUE)

        enforcement_service_url = os.environ.get("ENFORCEMENT_SERVICE_URL", "")
        task_url = f"{enforcement_service_url}/task"

        task_payload = json.dumps({
            "violation_id": violation_id,
            "action": body.action,
            "requested_by": body.requested_by,
        }).encode()

        task = tasks_v2.Task(
            http_request=tasks_v2.HttpRequest(
                http_method=tasks_v2.HttpMethod.POST,
                url=task_url,
                headers={"Content-Type": "application/json"},
                body=task_payload,
            )
        )

        created_task = tasks_client.create_task(
            parent=parent,
            task=task,
        )
        logger.info(f"Created enforcement task for violation {violation_id}: {created_task.name}")
    except Exception as exc:
        logger.error(f"Failed to create Cloud Task: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to enqueue enforcement action")

    # Update violation enforcement status in Firestore
    firestore_client.collection("violations").document(violation_id).update({
        "enforcement_status": "queued",
    })

    return _response(data={
        "violation_id": violation_id,
        "action": body.action,
        "enforcement_status": "queued",
    })


# ─────────────────────────────────────────────
# GET /analytics/summary
# ─────────────────────────────────────────────
@app.get("/analytics/summary")
def analytics_summary():
    try:
        query = f"""
        SELECT
            (SELECT COUNT(*) FROM `{PROJECT_ID}.{BQ_DATASET}.assets`) AS total_assets,
            (SELECT COUNT(*) FROM `{PROJECT_ID}.{BQ_DATASET}.violations` WHERE is_latest = TRUE) AS total_violations,
            (SELECT COUNT(*) FROM `{PROJECT_ID}.{BQ_DATASET}.enforcement_log`) AS total_enforcements,
            (SELECT AVG(risk_score) FROM `{PROJECT_ID}.{BQ_DATASET}.violations` WHERE is_latest = TRUE AND risk_score IS NOT NULL) AS avg_risk_score,
            (SELECT COUNT(*) FROM `{PROJECT_ID}.{BQ_DATASET}.violations` WHERE is_latest = TRUE AND threat_level = 'critical') AS critical_violations,
            (SELECT COUNT(*) FROM `{PROJECT_ID}.{BQ_DATASET}.violations` WHERE is_latest = TRUE AND threat_level = 'high') AS high_violations
        """
        result = bq_client.query(query).result()
        row = list(result)[0]
        summary = {
            "total_assets": row.total_assets or 0,
            "total_violations": row.total_violations or 0,
            "total_enforcements": row.total_enforcements or 0,
            "avg_risk_score": round(float(row.avg_risk_score), 2) if row.avg_risk_score else 0.0,
            "critical_violations": row.critical_violations or 0,
            "high_violations": row.high_violations or 0,
        }
        return _response(data=summary)
    except Exception as exc:
        logger.error(f"BigQuery analytics/summary failed: {exc}", exc_info=True)
        return _response(data={
            "total_assets": 0,
            "total_violations": 0,
            "total_enforcements": 0,
            "avg_risk_score": 0.0,
            "critical_violations": 0,
            "high_violations": 0,
        })


# ─────────────────────────────────────────────
# GET /analytics/by-platform
# ─────────────────────────────────────────────
@app.get("/analytics/by-platform")
def analytics_by_platform():
    try:
        query = f"""
        SELECT
            platform,
            COUNT(*) AS violation_count,
            AVG(match_confidence) AS avg_confidence
        FROM `{PROJECT_ID}.{BQ_DATASET}.violations`
        WHERE is_latest = TRUE
        GROUP BY platform
        ORDER BY violation_count DESC
        """
        result = bq_client.query(query).result()
        rows = [
            {
                "platform": row.platform,
                "violation_count": row.violation_count,
                "avg_confidence": round(float(row.avg_confidence), 2) if row.avg_confidence else 0.0,
            }
            for row in result
        ]
        return _response(data=rows)
    except Exception as exc:
        logger.error(f"BigQuery analytics/by-platform failed: {exc}", exc_info=True)
        return _response(data=[])


# ═══════════════════════════════════════════════
# CHAIN / TRACEABILITY ENDPOINTS
# ═══════════════════════════════════════════════

def _parse_iso(ts: str):
    from datetime import datetime as dt
    return dt.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)


def _minutes_between(ts_a: str, ts_b: str) -> int:
    try:
        return abs(int((_parse_iso(ts_b) - _parse_iso(ts_a)).total_seconds() / 60))
    except Exception:
        return 0


def _build_tree(nodes: list) -> list:
    """Build recursive nested tree from flat list of violations with parent_id."""
    by_id = {n["violation_id"]: {**n, "children": []} for n in nodes}
    roots = []
    for n in by_id.values():
        pid = n.get("parent_id")
        if pid and pid in by_id:
            by_id[pid]["children"].append(n)
        else:
            roots.append(n)
    return roots


def _serialize_node(v: dict) -> dict:
    """Serialize a violation for API response."""
    return {
        "violation_id": v.get("violation_id"),
        "depth": v.get("depth", 0),
        "platform": v.get("platform"),
        "url": v.get("url"),
        "account_handle": v.get("account_handle", ""),
        "account_type": v.get("account_type", "unknown"),
        "variant_type": v.get("variant_type", ""),
        "detected_at": v.get("detected_at"),
        "time_from_origin_minutes": v.get("time_from_origin_minutes", 0),
        "match_confidence": v.get("match_confidence", 0),
        "enforcement_status": v.get("enforcement_status", "pending"),
        "brand_misuse": v.get("brand_misuse", False),
        "region": v.get("region", ""),
        "children_count": v.get("children_count", 0),
        "is_origin": v.get("is_origin", False),
        "children": [_serialize_node(c) for c in v.get("children", [])],
    }


# ─────────────────────────────────────────────
# GET /chains
# ─────────────────────────────────────────────
@app.get("/chains")
def list_chains():
    """Return all active chains sorted by spread_velocity DESC."""
    try:
        docs = (
            firestore_client.collection("chains")
            .order_by("spread_velocity", direction=firestore.Query.DESCENDING)
            .stream()
        )
        chains = []
        for doc in docs:
            c = doc.to_dict()
            chains.append({
                "chain_id": c.get("chain_id"),
                "asset_id": c.get("asset_id"),
                "origin_platform": c.get("origin_platform"),
                "origin_url": c.get("origin_url"),
                "origin_detected_at": c.get("origin_detected_at"),
                "total_nodes": c.get("total_nodes", 0),
                "max_depth": c.get("max_depth", 0),
                "platforms_reached": c.get("platforms_reached", []),
                "spread_velocity": c.get("spread_velocity", 0),
                "last_updated": c.get("last_updated"),
            })
        return _response(data=chains)
    except Exception as exc:
        logger.error(f"GET /chains failed: {exc}", exc_info=True)
        return _response(data=[])


# ─────────────────────────────────────────────
# GET /chains/{chain_id}
# ─────────────────────────────────────────────
@app.get("/chains/{chain_id}")
def get_chain(chain_id: str):
    """Return chain metadata + full recursive tree (built server-side)."""
    try:
        # Chain metadata
        chain_doc = firestore_client.collection("chains").document(chain_id).get()
        if not chain_doc.exists:
            return _response(error="Chain not found")
        chain_meta = chain_doc.to_dict()

        # Fetch all violations for this chain
        v_docs = (
            firestore_client.collection("violations")
            .where("chain_id", "==", chain_id)
            .order_by("detected_at")
            .stream()
        )
        nodes = [d.to_dict() for d in v_docs]

        # Build recursive tree server-side
        tree_roots = _build_tree(nodes)
        tree = [_serialize_node(r) for r in tree_roots]

        return _response(data={
            "chain": {
                "chain_id": chain_meta.get("chain_id"),
                "asset_id": chain_meta.get("asset_id"),
                "origin_id": chain_meta.get("origin_id"),
                "origin_platform": chain_meta.get("origin_platform"),
                "origin_url": chain_meta.get("origin_url"),
                "origin_detected_at": chain_meta.get("origin_detected_at"),
                "total_nodes": chain_meta.get("total_nodes", 0),
                "max_depth": chain_meta.get("max_depth", 0),
                "spread_velocity": chain_meta.get("spread_velocity", 0),
                "platforms_reached": chain_meta.get("platforms_reached", []),
                "last_updated": chain_meta.get("last_updated"),
            },
            "tree": tree,
        })
    except Exception as exc:
        logger.error(f"GET /chains/{chain_id} failed: {exc}", exc_info=True)
        return _response(error=str(exc))


# ─────────────────────────────────────────────
# GET /chains/{chain_id}/timeline
# ─────────────────────────────────────────────
@app.get("/chains/{chain_id}/timeline")
def get_chain_timeline(chain_id: str):
    """Flat timeline of violations in a chain, sorted by detected_at."""
    try:
        v_docs = (
            firestore_client.collection("violations")
            .where("chain_id", "==", chain_id)
            .order_by("detected_at")
            .stream()
        )
        timeline = []
        for d in v_docs:
            v = d.to_dict()
            timeline.append({
                "violation_id": v.get("violation_id"),
                "platform": v.get("platform"),
                "url": v.get("url"),
                "account_handle": v.get("account_handle", ""),
                "account_type": v.get("account_type", "unknown"),
                "variant_type": v.get("variant_type", ""),
                "depth": v.get("depth", 0),
                "detected_at": v.get("detected_at"),
                "time_from_origin_minutes": v.get("time_from_origin_minutes", 0),
                "match_confidence": v.get("match_confidence", 0),
                "enforcement_status": v.get("enforcement_status", "pending"),
                "region": v.get("region", ""),
                "parent_id": v.get("parent_id"),
            })
        return _response(data=timeline)
    except Exception as exc:
        logger.error(f"GET /chains/{chain_id}/timeline failed: {exc}", exc_info=True)
        return _response(data=[])


# ─────────────────────────────────────────────
# GET /assets/{asset_id}/chains
# ─────────────────────────────────────────────
@app.get("/assets/{asset_id}/chains")
def get_asset_chains(asset_id: str):
    """Return all chains linked to a specific asset."""
    try:
        docs = (
            firestore_client.collection("chains")
            .where("asset_id", "==", asset_id)
            .order_by("spread_velocity", direction=firestore.Query.DESCENDING)
            .stream()
        )
        chains = []
        for doc in docs:
            c = doc.to_dict()
            chains.append({
                "chain_id": c.get("chain_id"),
                "origin_platform": c.get("origin_platform"),
                "total_nodes": c.get("total_nodes", 0),
                "max_depth": c.get("max_depth", 0),
                "platforms_reached": c.get("platforms_reached", []),
                "spread_velocity": c.get("spread_velocity", 0),
                "last_updated": c.get("last_updated"),
            })
        return _response(data=chains)
    except Exception as exc:
        logger.error(f"GET /assets/{asset_id}/chains failed: {exc}", exc_info=True)
        return _response(data=[])


# ─────────────────────────────────────────────
# GET /analytics/traceability-summary
# ─────────────────────────────────────────────
@app.get("/analytics/traceability-summary")
def traceability_summary():
    """Return traceability KPIs for the dashboard."""
    try:
        chains = list(firestore_client.collection("chains").stream())
        origin_count = len(chains)
        deepest = 0
        fastest_velocity = 0.0
        fastest_chain = None

        for doc in chains:
            c = doc.to_dict()
            d = c.get("max_depth", 0)
            v = c.get("spread_velocity", 0.0)
            if d > deepest:
                deepest = d
            if v > fastest_velocity:
                fastest_velocity = v
                fastest_chain = c

        # Platforms reached today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0).isoformat() + "Z"
        today_q = (
            firestore_client.collection("violations")
            .where("detected_at", ">=", today_start)
            .stream()
        )
        platforms_today = set()
        for d in today_q:
            platforms_today.add(d.to_dict().get("platform", ""))

        return _response(data={
            "origin_sources": origin_count,
            "deepest_chain": deepest,
            "fastest_spread_velocity": fastest_velocity,
            "fastest_chain": {
                "chain_id": fastest_chain.get("chain_id"),
                "origin_platform": fastest_chain.get("origin_platform"),
                "total_nodes": fastest_chain.get("total_nodes", 0),
                "spread_velocity": fastest_chain.get("spread_velocity", 0),
                "platforms_reached": fastest_chain.get("platforms_reached", []),
            } if fastest_chain else None,
            "platforms_reached_today": list(platforms_today),
        })
    except Exception as exc:
        logger.error(f"traceability-summary failed: {exc}", exc_info=True)
        return _response(data={
            "origin_sources": 0,
            "deepest_chain": 0,
            "fastest_spread_velocity": 0.0,
            "fastest_chain": None,
            "platforms_reached_today": [],
        })
