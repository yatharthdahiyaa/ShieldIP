"""ShieldIP Monitor Service — simulates web crawling and detects piracy violations.

Tree-based traceability system:
- /violations/{id}  with parent_id, chain_id, depth for proper tree structure
- /chains/{chain_id} top-level collection with aggregated chain metadata
- trace_and_link() assigns parent at write time
- reindex_chain() re-parents if earlier origin discovered
- BigQuery propagation_tree table for analytics
"""

import base64
import json
import logging
import math
import os
import random
import re
import uuid
from datetime import datetime, timedelta
from urllib.parse import urlparse

from faker import Faker
from fastapi import FastAPI, Request
from google.cloud import bigquery, firestore, pubsub_v1, storage, vision

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
logger = logging.getLogger("monitor-service")
logger.setLevel(logging.INFO)
logger.handlers = [handler]

# ─────────────────────────────────────────────
# Environment
# ─────────────────────────────────────────────
PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
ASSETS_BUCKET = os.environ.get("GCS_ASSETS_BUCKET", "")
BQ_DATASET = os.environ.get("BIGQUERY_DATASET", "shieldip_analytics")

# ─────────────────────────────────────────────
# GCP Clients
# ─────────────────────────────────────────────
firestore_client = firestore.Client()
publisher = pubsub_v1.PublisherClient()
bq_client = bigquery.Client()
storage_client = storage.Client()
vision_client = vision.ImageAnnotatorClient()
fake = Faker()

app = FastAPI(title="ShieldIP Monitor Service", version="1.0.0")


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _parse_iso(ts: str) -> datetime:
    """Parse ISO timestamp string to datetime."""
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)


def _minutes_between(ts_a: str, ts_b: str) -> int:
    """Compute integer minutes between two ISO timestamps."""
    try:
        a = _parse_iso(ts_a)
        b = _parse_iso(ts_b)
        return abs(int((b - a).total_seconds() / 60))
    except Exception:
        return 0


# ─────────────────────────────────────────────
# Simulation data
# ─────────────────────────────────────────────
PLATFORMS = [
    {"name": "YouTube", "domain": "youtube.com", "path_prefix": "/watch?v="},
    {"name": "TikTok", "domain": "tiktok.com", "path_prefix": "/@{user}/video/"},
    {"name": "Instagram", "domain": "instagram.com", "path_prefix": "/reel/"},
    {"name": "X", "domain": "x.com", "path_prefix": "/{user}/status/"},
    {"name": "Twitch", "domain": "twitch.tv", "path_prefix": "/videos/"},
    {"name": "Dailymotion", "domain": "dailymotion.com", "path_prefix": "/video/"},
    {"name": "Facebook", "domain": "facebook.com", "path_prefix": "/watch/"},
    {"name": "Telegram", "domain": "t.me", "path_prefix": "/c/"},
]

REGIONS = [
    "US", "UK", "IN", "BR", "DE", "JP", "NG", "AU", "FR", "KR",
    "MX", "CA", "IT", "ES", "SA", "ZA", "PH", "ID", "TR", "EG",
]

VARIANT_TYPES = ["direct", "clipped", "meme", "mirrored"]
VARIANT_WEIGHTS = [40, 25, 20, 15]

OFFICIAL_KEYWORDS = [
    "official", "verified", "corp", "inc", "studio", "media",
    "entertainment", "records", "network", "news",
]


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _extract_account_handle(url: str) -> str:
    """Extract probable account handle from a URL path."""
    try:
        parsed = urlparse(url)
        parts = [p.strip("@") for p in parsed.path.split("/") if p.strip("@")]
        skip = {"watch", "reel", "video", "status", "videos", "c", "p", "reels"}
        for part in parts:
            if len(part) > 2 and part.lower() not in skip:
                return part
        return "unknown"
    except Exception:
        return "unknown"


def _classify_account(handle: str, asset_owner: str = "ShieldIP Demo Corp") -> str:
    """Classify account as official / unofficial / unknown."""
    if not handle or handle == "unknown":
        return "unknown"
    owner_slug = re.sub(r"[^a-z0-9]", "", asset_owner.lower())
    handle_slug = re.sub(r"[^a-z0-9]", "", handle.lower())
    if handle_slug == owner_slug or owner_slug in handle_slug:
        return "official"
    for kw in OFFICIAL_KEYWORDS:
        if kw in handle_slug:
            return "official"
    return "unofficial"


def _pick_variant_type() -> str:
    return random.choices(VARIANT_TYPES, weights=VARIANT_WEIGHTS, k=1)[0]


def _find_web_violations(asset_id: str, gcs_uri: str, asset_owner: str) -> list:
    """REAL: Use Cloud Vision API to find matching images on the web."""
    try:
        image = vision.Image(source=vision.ImageSource(image_uri=gcs_uri))
        features = [vision.Feature(type_=vision.Feature.Type.WEB_DETECTION)]
        request_obj = vision.AnnotateImageRequest(image=image, features=features)
        response = vision_client.annotate_image(request=request_obj)
        
        candidates = []
        if response.web_detection and response.web_detection.pages_with_matching_images:
            for page in response.web_detection.pages_with_matching_images:
                url = page.url
                platform_name = "Unknown Website"
                for p in PLATFORMS:
                    if p["domain"] in url:
                        platform_name = p["name"]
                        break
                
                handle = _extract_account_handle(url)
                account_type = _classify_account(handle, asset_owner)
                
                candidates.append({
                    "asset_id": asset_id,
                    "platform": platform_name,
                    "url": url,
                    "region": random.choice(REGIONS),
                    "base_confidence": 85.0,  # WEB_DETECTION match score — fused further downstream
                    "account_handle": handle,
                    "account_type": account_type,
                    "variant_type": None,  # classified in _run_monitoring_tick using fingerprint
                })
        return candidates
    except Exception as exc:
        logger.error(f"Vision API WEB_DETECTION failed: {exc}", exc_info=True)
        return []




def _compute_match_confidence(base_confidence: float, fingerprint: dict) -> float:
    """
    4-signal confidence fusion:
      S1 (40pts) – base_confidence from Vision WEB_DETECTION
      S2 (25pts) – web_entity overlap between fingerprint and candidate
      S3 (20pts) – dominant colour palette proximity
      S4 (15pts) – label semantic overlap
    Returns 0–100.
    """
    if not fingerprint:
        return base_confidence

    # S1 — vision web detection base (normalise to 0–40)
    s1 = min(base_confidence / 100 * 40, 40.0)

    # S2 — web entity overlap (fingerprint entities vs candidate domain keywords)
    fp_entities = {e.get("description", "").lower() for e in fingerprint.get("web_entities", [])}
    fp_labels = {lbl.get("description", "").lower() for lbl in fingerprint.get("vision_labels", [])}
    overlap = len(fp_entities & fp_labels)  # proxy: entities that also appear in content labels
    s2 = min(overlap * 5, 25.0)  # 5pts per overlapping signal, max 25

    # S3 — dominant colour palette proximity (avg colour distance)
    palette = fingerprint.get("dominant_palette", [])
    if palette:
        # Use top-3 colours; compute average of R+G+B normalised distance to white (255,255,255)
        # as a proxy for whether colours are preserved (low distance = colour-grade variant)
        top = palette[:3]
        avg_brightness = sum((c["r"] + c["g"] + c["b"]) / 765 for c in top) / len(top)
        # Score higher if colours are rich (not washed out)
        s3 = round(avg_brightness * 20, 2)
    else:
        s3 = 10.0  # neutral

    # S4 — label overlap (fingerprint labels in common with known IP categories)
    ip_keywords = {"music", "film", "movie", "sport", "game", "show", "video", "media",
                   "entertainment", "news", "clip", "highlight", "trailer", "series"}
    matched_labels = fp_labels & ip_keywords
    s4 = min(len(matched_labels) * 3, 15.0)

    total = round(s1 + s2 + s3 + s4, 2)
    logger.debug(f"Confidence fusion: s1={s1} s2={s2} s3={s3} s4={s4} total={total}")
    return min(total, 100.0)


def _classify_variant_from_fingerprint(fingerprint: dict, candidate_url: str) -> str:
    """
    Classify variant type using fingerprint signals:
    - meme_edit:  fingerprint has significant text_baseline (overlay text likely)
    - clipped:    candidate is on a short-form platform (TikTok/Reels/Shorts)
    - mirrored:   dominant palette brightness is inverted relative to avg (heuristic)
    - direct:     fallback
    """
    text_baseline = fingerprint.get("text_baseline", [])
    if len(text_baseline) > 3:
        return "meme"

    short_form_signals = ["tiktok.com", "instagram.com/reel", "youtube.com/shorts", "reels"]
    if any(sig in candidate_url for sig in short_form_signals):
        palette = fingerprint.get("dominant_palette", [])
        if palette:
            avg_brightness = sum((c["r"] + c["g"] + c["b"]) / 765 for c in palette[:3]) / max(len(palette[:3]), 1)
            if avg_brightness < 0.4:  # unusually dark — possible clipped edit
                return "clipped"
        return "clipped"

    scenes = fingerprint.get("scenes", [])
    if scenes:
        return "clipped"  # has scene data → video asset → likely clipped highlight

    return "direct"


# ═══════════════════════════════════════════════
# TRACEABILITY ENGINE
# ═══════════════════════════════════════════════

def trace_and_link(violation_id: str, candidate: dict, match_confidence: float, detected_at: str):
    """
    Core tracing algorithm — assigns parent_id, chain_id, depth at write time.

    STEP 1: Query recent violations for same asset (last 48h)
    STEP 2: Find parent using temporal + platform heuristics
    STEP 3: Write violation, update parent children_count, upsert chain doc
    STEP 4: Write to BigQuery propagation_tree
    """
    asset_id = candidate["asset_id"]
    platform = candidate["platform"]
    account_handle = candidate["account_handle"]

    # STEP 1 — fetch recent violations for this asset
    cutoff = (datetime.utcnow() - timedelta(hours=48)).isoformat() + "Z"
    existing_q = (
        firestore_client.collection("violations")
        .where("asset_id", "==", asset_id)
        .where("detected_at", ">=", cutoff)
        .order_by("detected_at")
        .stream()
    )
    existing = [doc.to_dict() for doc in existing_q]

    # STEP 2 — determine parent, depth, chain_id
    parent_id = None
    chain_id = None
    depth = 0
    is_origin = False

    if not existing:
        # This IS the origin
        is_origin = True
        chain_id = violation_id
        depth = 0
        parent_id = None
    else:
        # Origin is the earliest existing violation
        origin = existing[0]
        chain_id = origin.get("chain_id", origin["violation_id"])

        # Find best parent:
        # a) Same platform + different account → earliest on that platform
        same_platform = [
            v for v in existing
            if v["platform"] == platform and v.get("account_handle") != account_handle
        ]
        if same_platform:
            parent = same_platform[0]
            parent_id = parent["violation_id"]
            depth = parent.get("depth", 0) + 1
        else:
            # b) Different platform → closest in time BEFORE this one, gap < 6h
            before = [
                v for v in existing
                if _parse_iso(v["detected_at"]) < _parse_iso(detected_at)
            ]
            best_parent = None
            for v in reversed(before):  # most recent first
                gap_min = _minutes_between(v["detected_at"], detected_at)
                if gap_min <= 360:  # 6 hours
                    best_parent = v
                    break

            if best_parent:
                parent_id = best_parent["violation_id"]
                depth = best_parent.get("depth", 0) + 1
            else:
                # c) Gap > 6h → parent = original origin
                parent_id = origin["violation_id"]
                depth = origin.get("depth", 0) + 1

    time_from_origin_minutes = 0
    if not is_origin and existing:
        origin_ts = existing[0].get("detected_at", detected_at)
        time_from_origin_minutes = _minutes_between(origin_ts, detected_at)

    # Build violation document
    violation_doc = {
        "violation_id": violation_id,
        "asset_id": asset_id,
        "parent_id": parent_id,
        "chain_id": chain_id,
        "depth": depth,
        "is_origin": is_origin,
        "platform": platform,
        "url": candidate["url"],
        "account_handle": account_handle,
        "account_type": candidate["account_type"],
        "region": candidate["region"],
        "match_confidence": match_confidence,
        "variant_type": candidate["variant_type"],
        "detected_at": detected_at,
        "time_from_origin_minutes": time_from_origin_minutes,
        "children_count": 0,
        "status": "detected",
        "enforcement_status": "pending",
        "brand_misuse": _check_brand_misuse(asset_id, candidate["url"]),
    }

    # STEP 3a — Write violation to Firestore
    firestore_client.collection("violations").document(violation_id).set(violation_doc)

    # STEP 3b — Increment parent's children_count
    if parent_id:
        try:
            firestore_client.collection("violations").document(parent_id).update({
                "children_count": firestore.Increment(1),
            })
        except Exception as exc:
            logger.warning(f"Failed to increment children_count on {parent_id}: {exc}")

    # STEP 3c — Upsert /chains/{chain_id}
    _upsert_chain(chain_id, violation_doc, existing)

    # STEP 4 — Write to BigQuery propagation_tree
    _write_propagation_to_bq(violation_doc)

    # Publish violation-detected event
    try:
        topic_path = publisher.topic_path(PROJECT_ID, "violation-detected")
        publisher.publish(
            topic_path,
            data=json.dumps({"violation_id": violation_id}).encode(),
        )
    except Exception as exc:
        logger.warning(f"Failed to publish violation-detected: {exc}")

    logger.info(
        f"Traced violation {violation_id}: chain={chain_id}, "
        f"parent={parent_id}, depth={depth}, platform={platform}, "
        f"variant={candidate['variant_type']}, T+{time_from_origin_minutes}m"
    )

    return violation_doc


def _upsert_chain(chain_id: str, new_violation: dict, existing: list):
    """Create or update the /chains/{chain_id} document."""
    try:
        now = _now_iso()
        all_nodes = existing + [new_violation]
        total_nodes = len(all_nodes)
        max_depth = max(v.get("depth", 0) for v in all_nodes)
        platforms_reached = list(set(v["platform"] for v in all_nodes))

        # Compute spread_velocity = total_nodes / hours since origin
        origin_ts = all_nodes[0].get("detected_at", now)
        hours_elapsed = max(_minutes_between(origin_ts, now) / 60.0, 0.0167)  # min 1 min
        spread_velocity = round(total_nodes / hours_elapsed, 2)

        chain_ref = firestore_client.collection("chains").document(chain_id)
        chain_doc = chain_ref.get()

        if chain_doc.exists:
            chain_ref.update({
                "total_nodes": total_nodes,
                "max_depth": max_depth,
                "spread_velocity": spread_velocity,
                "platforms_reached": platforms_reached,
                "last_updated": now,
            })
        else:
            # New chain — origin is either the new violation or first existing
            origin = new_violation if new_violation.get("is_origin") else all_nodes[0]
            chain_ref.set({
                "chain_id": chain_id,
                "asset_id": new_violation["asset_id"],
                "origin_id": origin["violation_id"],
                "origin_platform": origin["platform"],
                "origin_url": origin["url"],
                "origin_detected_at": origin["detected_at"],
                "total_nodes": total_nodes,
                "max_depth": max_depth,
                "spread_velocity": spread_velocity,
                "platforms_reached": platforms_reached,
                "last_updated": now,
            })
    except Exception as exc:
        logger.error(f"Failed to upsert chain {chain_id}: {exc}", exc_info=True)


def reindex_chain(chain_id: str):
    """
    Re-parent an entire chain when a new earlier origin is discovered.
    Finds the actual earliest violation, sets it as origin, recalculates
    depth for all nodes, and updates the chain document.
    """
    try:
        logger.info(f"Reindexing chain {chain_id}")
        all_docs = list(
            firestore_client.collection("violations")
            .where("chain_id", "==", chain_id)
            .order_by("detected_at")
            .stream()
        )
        if not all_docs:
            return

        nodes = [doc.to_dict() for doc in all_docs]
        true_origin = nodes[0]  # earliest by detected_at
        true_origin_id = true_origin["violation_id"]

        # If chain_id doesn't match true origin, update all nodes
        if chain_id != true_origin_id:
            new_chain_id = true_origin_id
            for node in nodes:
                firestore_client.collection("violations").document(node["violation_id"]).update({
                    "chain_id": new_chain_id,
                })
            # Rename chain doc
            old_chain = firestore_client.collection("chains").document(chain_id).get()
            if old_chain.exists:
                chain_data = old_chain.to_dict()
                chain_data["chain_id"] = new_chain_id
                chain_data["origin_id"] = true_origin_id
                chain_data["origin_platform"] = true_origin["platform"]
                chain_data["origin_url"] = true_origin["url"]
                chain_data["origin_detected_at"] = true_origin["detected_at"]
                firestore_client.collection("chains").document(new_chain_id).set(chain_data)
                firestore_client.collection("chains").document(chain_id).delete()
            chain_id = new_chain_id

        # Reset origin flags
        for node in nodes:
            vid = node["violation_id"]
            is_orig = vid == true_origin_id
            firestore_client.collection("violations").document(vid).update({
                "is_origin": is_orig,
            })

        # Rebuild parent_id and depth using temporal heuristic
        # Origin has parent_id=None, depth=0
        firestore_client.collection("violations").document(true_origin_id).update({
            "parent_id": None, "depth": 0, "is_origin": True,
        })

        for i, node in enumerate(nodes):
            if node["violation_id"] == true_origin_id:
                continue
            # Find parent: closest earlier node
            best_parent = nodes[0]  # default to origin
            for prev in nodes[:i]:
                gap = _minutes_between(prev["detected_at"], node["detected_at"])
                if gap <= 360:
                    best_parent = prev

            new_depth = best_parent.get("depth", 0) + 1
            tfom = _minutes_between(true_origin["detected_at"], node["detected_at"])
            firestore_client.collection("violations").document(node["violation_id"]).update({
                "parent_id": best_parent["violation_id"],
                "depth": new_depth,
                "time_from_origin_minutes": tfom,
            })
            node["depth"] = new_depth  # update in-memory for subsequent iterations

        # Update chain doc
        max_depth = max(n.get("depth", 0) for n in nodes)
        platforms = list(set(n["platform"] for n in nodes))
        hours_elapsed = max(_minutes_between(true_origin["detected_at"], _now_iso()) / 60.0, 0.0167)
        velocity = round(len(nodes) / hours_elapsed, 2)

        firestore_client.collection("chains").document(chain_id).update({
            "total_nodes": len(nodes),
            "max_depth": max_depth,
            "platforms_reached": platforms,
            "spread_velocity": velocity,
            "last_updated": _now_iso(),
        })

        logger.info(f"Reindexed chain {chain_id}: {len(nodes)} nodes, max_depth={max_depth}")
    except Exception as exc:
        logger.error(f"reindex_chain({chain_id}) failed: {exc}", exc_info=True)


def _write_propagation_to_bq(violation: dict):
    """Write to BigQuery propagation_tree table."""
    try:
        table_ref = f"{PROJECT_ID}.{BQ_DATASET}.propagation_tree"
        row = {
            "chain_id": violation.get("chain_id", ""),
            "violation_id": violation["violation_id"],
            "parent_id": violation.get("parent_id"),
            "depth": violation.get("depth", 0),
            "platform": violation["platform"],
            "detected_at": violation["detected_at"],
            "account_handle": violation.get("account_handle", ""),
            "variant_type": violation.get("variant_type", ""),
            "time_from_origin_minutes": violation.get("time_from_origin_minutes", 0),
        }
        errors = bq_client.insert_rows_json(table_ref, [row])
        if errors:
            logger.error(f"BQ propagation_tree insert errors: {errors}")
    except Exception as exc:
        logger.error(f"BQ propagation_tree write failed: {exc}", exc_info=True)


def _write_violation_to_bq(violation: dict):
    """Write violation to BigQuery violations table."""
    try:
        table_ref = f"{PROJECT_ID}.{BQ_DATASET}.violations"
        row = {
            "violation_id": violation["violation_id"],
            "asset_id": violation["asset_id"],
            "platform": violation["platform"],
            "url": violation["url"],
            "region": violation["region"],
            "match_confidence": violation["match_confidence"],
            "risk_score": None,
            "threat_level": None,
            "recommended_action": None,
            "detected_at": violation["detected_at"],
            "is_latest": True,
            "chain_id": violation.get("chain_id"),
            "parent_id": violation.get("parent_id"),
            "depth": violation.get("depth", 0),
            "account_handle": violation.get("account_handle"),
            "account_type": violation.get("account_type"),
            "variant_type": violation.get("variant_type"),
            "brand_misuse": violation.get("brand_misuse", False),
        }
        errors = bq_client.insert_rows_json(table_ref, [row])
        if errors:
            logger.error(f"BigQuery insert errors: {errors}")
    except Exception as exc:
        logger.error(f"BigQuery write failed: {exc}", exc_info=True)


# ═══════════════════════════════════════════════
# MONITORING TICK
# ═══════════════════════════════════════════════

def _check_brand_misuse(asset_id: str, candidate_url: str) -> bool:
    """
    Return True if the candidate URL is associated with a protected brand
    from the asset's fingerprint logo scan.
    """
    try:
        fp_doc = firestore_client.collection("fingerprints").document(asset_id).get()
        if not fp_doc.exists:
            return False
        protected_brands = fp_doc.to_dict().get("logos", [])
        if not protected_brands:
            return False
        url_lower = candidate_url.lower()
        for brand in protected_brands:
            name = brand.get("description", "").lower()
            # Flag if brand name appears in the URL (e.g., fake/impersonation accounts)
            if name and name in url_lower:
                return True
        return False
    except Exception as exc:
        logger.warning(f"Brand misuse check failed for {asset_id}: {exc}")
        return False


def _run_monitoring_tick():
    """Execute one monitoring cycle: fetch fingerprints, generate candidates, trace and link."""
    logger.info("Starting monitoring tick")

    fingerprints = list(firestore_client.collection("fingerprints").stream())
    if not fingerprints:
        logger.info("No fingerprints registered yet — skipping tick")
        return {"violations_created": 0}

    violations_created = 0

    for fp_doc in fingerprints:
        fp_data = fp_doc.to_dict()
        asset_id = fp_data.get("asset_id", fp_doc.id)

        asset_owner = "ShieldIP Demo Corp"
        gcs_uri = None
        try:
            a_doc = firestore_client.collection("assets").document(asset_id).get()
            if a_doc.exists:
                a_data = a_doc.to_dict()
                asset_owner = a_data.get("owner", asset_owner)
                gcs_uri = a_data.get("gcs_uri")
        except Exception:
            pass

        if not gcs_uri:
            logger.warning(f"Asset {asset_id} missing gcs_uri, skipping web detection.")
            continue

        # Use REAL Cloud Vision WEB_DETECTION
        candidates = _find_web_violations(asset_id, gcs_uri, asset_owner)

        for candidate in candidates:
            # Classify variant_type using fingerprint signals now that we have fp_data
            if candidate["variant_type"] is None:
                candidate["variant_type"] = _classify_variant_from_fingerprint(fp_data, candidate["url"])

            match_confidence = _compute_match_confidence(candidate["base_confidence"], fp_data)

            if match_confidence > 45.0:
                # ── Deduplication: skip if this URL was already recorded ──
                existing_v = (
                    firestore_client.collection("violations")
                    .where("url", "==", candidate["url"])
                    .where("asset_id", "==", candidate["asset_id"])
                    .limit(1)
                    .stream()
                )
                if any(True for _ in existing_v):
                    logger.info(f"Skipping duplicate violation for URL: {candidate['url'][:80]}")
                    continue

                violation_id = str(uuid.uuid4())
                detected_at = _now_iso()

                trace_and_link(violation_id, candidate, match_confidence, detected_at)
                _write_violation_to_bq({
                    "violation_id": violation_id,
                    "asset_id": candidate["asset_id"],
                    "platform": candidate["platform"],
                    "url": candidate["url"],
                    "region": candidate["region"],
                    "match_confidence": match_confidence,
                    "detected_at": detected_at,
                    "account_handle": candidate["account_handle"],
                    "account_type": candidate["account_type"],
                    "variant_type": candidate["variant_type"],
                })

                _write_audit_event_fs(violation_id, candidate["asset_id"], candidate["platform"])
                violations_created += 1

    logger.info(f"Monitoring tick complete: {violations_created} violations created")
    return {"violations_created": violations_created}


def _write_audit_event_fs(violation_id: str, asset_id: str, platform: str):
    """Write violation_detected audit event to Firestore /audit_events."""
    try:
        event_id = str(uuid.uuid4())
        firestore_client.collection("audit_events").document(event_id).set({
            "event_id":    event_id,
            "action":      "violation_detected",
            "entity_type": "violation",
            "entity_id":   violation_id,
            "details":     {"asset_id": asset_id, "platform": platform},
            "created_at":  _now_iso(),
        })
    except Exception as exc:
        logger.warning(f"Failed to write audit event: {exc}")


@app.get("/health")
def health():
    return {"status": "healthy", "service": "monitor-service"}


@app.post("/pubsub")
async def handle_pubsub(request: Request):
    """Handle Pub/Sub push messages (monitoring-tick / fingerprint-ready)."""
    try:
        envelope = await request.json()
        if not envelope or "message" not in envelope:
            logger.warning("Invalid Pub/Sub envelope")
            return {"status": "ignored"}

        pubsub_message = envelope["message"]
        raw_data = base64.b64decode(pubsub_message.get("data", "")).decode()
        logger.info(f"Monitor received Pub/Sub message: {raw_data[:200]}")

        result = _run_monitoring_tick()
        return {"status": "ok", "violations_created": result["violations_created"]}

    except Exception as exc:
        logger.error(f"Monitor Pub/Sub handler failed: {exc}", exc_info=True)
        return {"status": "error", "detail": str(exc)}
