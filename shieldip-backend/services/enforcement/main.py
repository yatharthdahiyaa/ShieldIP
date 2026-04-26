"""ShieldIP Enforcement Service — DMCA generation, monetisation, and legal evidence bundling."""

import json
import logging
import os
import uuid
from datetime import datetime

from fastapi import FastAPI, Request
from google.cloud import bigquery, firestore, pubsub_v1, storage

# ─────────────────────────────────────────────
# Structured JSON logging
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
logger = logging.getLogger("enforcement-service")
logger.setLevel(logging.INFO)
logger.handlers = [handler]

# ─────────────────────────────────────────────
# Environment
# ─────────────────────────────────────────────
PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
EVIDENCE_BUCKET = os.environ.get("GCS_EVIDENCE_BUCKET", "")
BQ_DATASET = os.environ.get("BIGQUERY_DATASET", "shieldip_analytics")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# ─────────────────────────────────────────────
# GCP Clients
# ─────────────────────────────────────────────
firestore_client = firestore.Client()
storage_client = storage.Client()
publisher = pubsub_v1.PublisherClient()
bq_client = bigquery.Client()

_gemini_initialised = False


def _init_gemini():
    global _gemini_initialised
    if not _gemini_initialised:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_initialised = True


app = FastAPI(title="ShieldIP Enforcement Service", version="1.0.0")


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _generate_dmca_notice(platform: str, url: str, violation_date: str) -> str:
    """
    Generate a formal DMCA takedown notice using Gemini via Google AI Studio.
    Falls back to a template-based notice if the AI call fails.
    """
    try:
        _init_gemini()
        import google.generativeai as genai

        model = genai.GenerativeModel(GEMINI_MODEL)

        prompt = (
            f"Generate a formal DMCA takedown notice for: "
            f"platform={platform}, url={url}, content_owner=ShieldIP Demo Corp, "
            f"violation_date={violation_date}. Return only the notice text, 3 paragraphs."
        )

        response = model.generate_content(prompt)
        notice_text = response.text.strip()
        logger.info("DMCA notice generated via Gemini")
        return notice_text

    except Exception as exc:
        logger.warning(f"Gemini DMCA generation failed (using template): {exc}")

        # Fallback template-based DMCA notice
        return (
            f"DMCA TAKEDOWN NOTICE\n\n"
            f"To Whom It May Concern at {platform},\n\n"
            f"I, acting on behalf of ShieldIP Demo Corp (the 'Content Owner'), hereby "
            f"notify you pursuant to the Digital Millennium Copyright Act (17 U.S.C. § 512) "
            f"that copyrighted material owned by the Content Owner is being infringed upon "
            f"at the following URL: {url}. The infringing content was detected on "
            f"{violation_date}. The Content Owner has not authorised the reproduction, "
            f"distribution, or public display of this material on your platform.\n\n"
            f"I have a good faith belief that the use of the copyrighted material described "
            f"above is not authorised by the copyright owner, its agent, or the law. The "
            f"information in this notification is accurate, and under penalty of perjury, "
            f"I am authorised to act on behalf of ShieldIP Demo Corp. We request the "
            f"immediate removal or disabling of access to the infringing material.\n\n"
            f"Sincerely,\n"
            f"IP Protection Division\n"
            f"ShieldIP Demo Corp\n"
            f"Date: {_now_iso()}"
        )


def _handle_takedown(violation: dict, violation_id: str) -> dict:
    """Generate DMCA notice, store in Firestore and GCS."""
    platform = violation.get("platform", "Unknown")
    url = violation.get("url", "")
    detected_at = violation.get("detected_at", _now_iso())

    notice_text = _generate_dmca_notice(platform, url, detected_at)

    # Store DMCA notice as .txt file in GCS
    try:
        bucket = storage_client.bucket(EVIDENCE_BUCKET)
        blob = bucket.blob(f"dmca/dmca_{violation_id}.txt")
        blob.upload_from_string(notice_text, content_type="text/plain")
        gcs_path = f"gs://{EVIDENCE_BUCKET}/dmca/dmca_{violation_id}.txt"
        logger.info(f"DMCA notice stored at {gcs_path}")
    except Exception as exc:
        logger.error(f"Failed to store DMCA notice in GCS: {exc}", exc_info=True)
        gcs_path = ""

    # Store in Firestore
    enforcement_id = str(uuid.uuid4())
    enforcement_doc = {
        "enforcement_id": enforcement_id,
        "violation_id": violation_id,
        "action": "takedown",
        "dmca_notice": notice_text,
        "gcs_path": gcs_path,
        "status": "completed",
        "enforced_at": _now_iso(),
    }
    firestore_client.collection("enforcement").document(enforcement_id).set(enforcement_doc)

    return enforcement_doc


def _handle_monetize(violation: dict, violation_id: str) -> dict:
    """Set violation status to monetized and log revenue claim."""
    enforcement_id = str(uuid.uuid4())
    enforcement_doc = {
        "enforcement_id": enforcement_id,
        "violation_id": violation_id,
        "action": "monetize",
        "revenue_claim": {
            "platform": violation.get("platform", ""),
            "url": violation.get("url", ""),
            "claim_type": "revenue_share",
            "claimed_at": _now_iso(),
        },
        "status": "completed",
        "enforced_at": _now_iso(),
    }
    firestore_client.collection("enforcement").document(enforcement_id).set(enforcement_doc)
    logger.info(f"Monetization claim created for violation {violation_id}")

    return enforcement_doc


def _handle_legal(violation: dict, violation_id: str) -> dict:
    """Package violation data into a structured evidence bundle and store in GCS."""
    evidence_bundle = {
        "evidence_id": str(uuid.uuid4()),
        "violation_id": violation_id,
        "violation_details": {
            "platform": violation.get("platform", ""),
            "url": violation.get("url", ""),
            "region": violation.get("region", ""),
            "match_confidence": violation.get("match_confidence", 0),
            "risk_score": violation.get("risk_score"),
            "threat_level": violation.get("threat_level"),
            "reasoning": violation.get("reasoning", ""),
            "detected_at": violation.get("detected_at", ""),
        },
        "content_owner": "ShieldIP Demo Corp",
        "packaged_at": _now_iso(),
        "legal_status": "evidence_preserved",
        "chain_of_custody": [
            {"event": "violation_detected", "timestamp": violation.get("detected_at", "")},
            {"event": "risk_scored", "timestamp": violation.get("analysed_at", "")},
            {"event": "evidence_packaged", "timestamp": _now_iso()},
        ],
    }

    # Store evidence bundle in GCS
    try:
        bucket = storage_client.bucket(EVIDENCE_BUCKET)
        blob = bucket.blob(f"evidence/evidence_{violation_id}.json")
        blob.upload_from_string(
            json.dumps(evidence_bundle, indent=2),
            content_type="application/json",
        )
        gcs_path = f"gs://{EVIDENCE_BUCKET}/evidence/evidence_{violation_id}.json"
        logger.info(f"Evidence bundle stored at {gcs_path}")
    except Exception as exc:
        logger.error(f"Failed to store evidence in GCS: {exc}", exc_info=True)
        gcs_path = ""

    enforcement_id = str(uuid.uuid4())
    enforcement_doc = {
        "enforcement_id": enforcement_id,
        "violation_id": violation_id,
        "action": "legal",
        "evidence_gcs_path": gcs_path,
        "status": "completed",
        "enforced_at": _now_iso(),
    }
    firestore_client.collection("enforcement").document(enforcement_id).set(enforcement_doc)

    return enforcement_doc


def _write_enforcement_to_bq(enforcement: dict):
    """Write enforcement event to BigQuery — non-blocking."""
    try:
        table_ref = f"{PROJECT_ID}.{BQ_DATASET}.enforcement_log"
        row = {
            "enforcement_id": enforcement.get("enforcement_id", ""),
            "violation_id": enforcement.get("violation_id", ""),
            "action": enforcement.get("action", ""),
            "status": enforcement.get("status", ""),
            "enforced_at": enforcement.get("enforced_at", _now_iso()),
        }
        errors = bq_client.insert_rows_json(table_ref, [row])
        if errors:
            logger.error(f"BigQuery enforcement insert errors: {errors}")
        else:
            logger.info(f"Written enforcement {enforcement.get('enforcement_id')} to BigQuery")
    except Exception as exc:
        logger.error(f"BigQuery write failed: {exc}", exc_info=True)


def _process_enforcement(violation_id: str, action: str, requested_by: str):
    """Execute enforcement action for a violation."""
    logger.info(f"Processing enforcement: violation={violation_id}, action={action}, by={requested_by}")

    # Fetch violation from Firestore
    violation_doc = firestore_client.collection("violations").document(violation_id).get()
    if not violation_doc.exists:
        logger.error(f"Violation {violation_id} not found for enforcement")
        return

    violation = violation_doc.to_dict()

    # Route to appropriate handler
    if action == "takedown":
        enforcement_doc = _handle_takedown(violation, violation_id)
    elif action == "monetize":
        enforcement_doc = _handle_monetize(violation, violation_id)
    elif action == "legal":
        enforcement_doc = _handle_legal(violation, violation_id)
    else:
        logger.error(f"Unknown enforcement action: {action}")
        return

    # Update violation in Firestore
    firestore_client.collection("violations").document(violation_id).update({
        "enforcement_status": action,
        "enforced_at": _now_iso(),
        "action_taken": action,
    })

    # Write enforcement event to BigQuery
    _write_enforcement_to_bq(enforcement_doc)

    # Publish enforcement-complete event
    try:
        topic_path = publisher.topic_path(PROJECT_ID, "enforcement-complete")
        publisher.publish(
            topic_path,
            data=json.dumps({
                "enforcement_id": enforcement_doc.get("enforcement_id"),
                "violation_id": violation_id,
                "action": action,
            }).encode(),
        )
        logger.info(f"Published enforcement-complete for {violation_id}")
    except Exception as exc:
        logger.error(f"Failed to publish enforcement-complete: {exc}", exc_info=True)


@app.get("/health")
def health():
    return {"status": "healthy", "service": "enforcement-service"}


@app.post("/task")
async def handle_task(request: Request):
    """Handle Cloud Tasks HTTP requests for enforcement actions."""
    try:
        payload = await request.json()
        violation_id = payload.get("violation_id")
        action = payload.get("action")
        requested_by = payload.get("requested_by", "system")

        if not violation_id or not action:
            logger.warning(f"Invalid task payload: {payload}")
            return {"status": "error", "detail": "Missing violation_id or action"}

        _process_enforcement(violation_id, action, requested_by)
        return {"status": "ok"}

    except Exception as exc:
        logger.error(f"Enforcement task handler failed: {exc}", exc_info=True)
        return {"status": "error", "detail": str(exc)}


@app.post("/velocity-alert")
async def handle_velocity_alert(request: Request):
    """
    Handle Pub/Sub push messages from velocity-alert topic.
    Auto-creates a high-priority takedown enforcement job for fast-spreading assets.
    """
    try:
        envelope = await request.json()
        if not envelope or "message" not in envelope:
            logger.warning("Invalid velocity-alert Pub/Sub envelope")
            return {"status": "ignored"}

        import base64 as b64
        pubsub_message = envelope["message"]
        data = json.loads(b64.b64decode(pubsub_message.get("data", "")).decode())
        asset_id = data.get("asset_id")
        violations_last_30min = data.get("violations_last_30min", 0)
        spread_velocity = data.get("spread_velocity", 0)

        if not asset_id:
            logger.warning("No asset_id in velocity-alert message")
            return {"status": "ignored"}

        logger.info(
            f"VELOCITY ALERT received: asset={asset_id}, "
            f"violations_30m={violations_last_30min}, velocity={spread_velocity}/hr"
        )

        # Fetch latest unresolved violations for this asset and auto-enforce takedown
        recent_violations = (
            firestore_client.collection("violations")
            .where("asset_id", "==", asset_id)
            .where("enforcement_status", "==", "pending")
            .order_by("detected_at", direction=firestore.Query.DESCENDING)
            .limit(5)
            .stream()
        )

        enforced_count = 0
        for doc in recent_violations:
            violation = doc.to_dict()
            vid = violation.get("violation_id")
            if not vid:
                continue
            _process_enforcement(vid, "takedown", "velocity-alert-system")
            # Tag the violation as velocity-triggered
            firestore_client.collection("violations").document(vid).update({
                "velocity_alert": True,
                "velocity_auto_enforced": True,
            })
            enforced_count += 1
            logger.info(f"Auto-enforced takedown for {vid} via velocity alert")

        return {
            "status": "ok",
            "asset_id": asset_id,
            "auto_enforced": enforced_count,
        }

    except Exception as exc:
        logger.error(f"Velocity alert handler failed: {exc}", exc_info=True)
        return {"status": "error", "detail": str(exc)}
