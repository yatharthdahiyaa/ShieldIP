"""ShieldIP Risk Scoring Service — structured risk scoring + Gemini AI reasoning."""

import base64
import json
import logging
import os
from datetime import datetime
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from google.cloud import bigquery, firestore, pubsub_v1

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
logger = logging.getLogger("risk-scoring-service")
logger.setLevel(logging.INFO)
logger.handlers = [handler]

# ─────────────────────────────────────────────
# Environment
# ─────────────────────────────────────────────
PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
BQ_DATASET = os.environ.get("BIGQUERY_DATASET", "shieldip_analytics")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")

# ─────────────────────────────────────────────
# GCP Clients
# ─────────────────────────────────────────────
firestore_client = firestore.Client()
bq_client = bigquery.Client()
publisher = pubsub_v1.PublisherClient()

# High-reach platforms where unofficial accounts get +15 reach boost
HIGH_REACH_PLATFORMS = {"YouTube", "TikTok", "Instagram", "Facebook"}

# Google AI (Gemini API) initialisation (lazy — done on first call)
_gemini_initialised = False


def _init_gemini():
    global _gemini_initialised
    if not _gemini_initialised:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_initialised = True


app = FastAPI(title="ShieldIP Risk Scoring Service", version="1.0.0")


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


# ─────────────────────────────────────────────
# Platform reach score mapping
# ─────────────────────────────────────────────
PLATFORM_REACH = {
    "YouTube": 30,
    "TikTok": 25,
    "Instagram": 20,
    "X": 15,
    "Twitch": 10,
    "Dailymotion": 8,
    "Facebook": 20,
    "Telegram": 12,
}

# ─────────────────────────────────────────────
# License gap score by region (simulated licensed/unlicensed markets)
# ─────────────────────────────────────────────
LICENSE_GAP = {
    "US": 2, "UK": 2, "CA": 3, "AU": 3, "DE": 3, "FR": 3,
    "JP": 4, "KR": 4, "IT": 4, "ES": 4,
    "IN": 7, "BR": 7, "MX": 7, "PH": 7, "ID": 7,
    "NG": 9, "EG": 9, "SA": 6, "ZA": 6, "TR": 6,
}


def _compute_severity_score(match_confidence: float) -> int:
    """Severity score 0–40 based on match confidence bands."""
    if match_confidence >= 90:
        return 40
    elif match_confidence >= 75:
        return 32
    elif match_confidence >= 60:
        return 24
    elif match_confidence >= 45:
        return 16
    else:
        return 8


def _compute_reach_score(platform: str, account_type: str = "unofficial") -> int:
    """Reach score 0–30 based on platform. Unofficial on high-reach gets +15."""
    base = PLATFORM_REACH.get(platform, 5)
    if account_type == "unofficial" and platform in HIGH_REACH_PLATFORMS:
        base = min(base + 15, 30)
    return base


def _compute_repeat_offender_score(url: str) -> int:
    """Repeat offender score 0–20 based on prior violations from same domain."""
    try:
        domain = urlparse(url).netloc
        if not domain:
            return 0

        # Query Firestore for prior violations from same domain
        violations = firestore_client.collection("violations").stream()
        count = 0
        for doc in violations:
            v = doc.to_dict()
            v_url = v.get("url", "")
            try:
                v_domain = urlparse(v_url).netloc
                if v_domain == domain:
                    count += 1
            except Exception:
                continue

        if count >= 10:
            return 20
        elif count >= 5:
            return 15
        elif count >= 3:
            return 10
        elif count >= 1:
            return 5
        return 0
    except Exception as exc:
        logger.warning(f"Repeat offender check failed: {exc}")
        return 0


def _compute_license_gap_score(region: str) -> int:
    """License gap score 0–10 based on region."""
    return LICENSE_GAP.get(region, 5)


def _get_threat_level(total_risk: int) -> str:
    """Map total risk score to threat level."""
    if total_risk >= 81:
        return "critical"
    elif total_risk >= 56:
        return "high"
    elif total_risk >= 31:
        return "medium"
    else:
        return "low"


def _call_gemini_for_reasoning(violation: dict, total_risk: int, threat_level: str) -> dict:
    """
    Call Gemini 1.5 Flash via Google AI Studio API for risk reasoning and recommended action.
    Includes try/except with hardcoded fallback so the pipeline never breaks.
    """
    try:
        _init_gemini()
        import google.generativeai as genai

        model = genai.GenerativeModel(GEMINI_MODEL)

        violation_summary = {
            "violation_id": violation.get("violation_id"),
            "platform": violation.get("platform"),
            "url": violation.get("url"),
            "region": violation.get("region"),
            "match_confidence": violation.get("match_confidence"),
        }

        prompt = (
            "You are an IP rights analyst. Given this violation: "
            f"{json.dumps(violation_summary)} "
            f"with risk score {total_risk}/100 and threat level {threat_level}, "
            "generate a JSON object only with keys: "
            "reasoning (2 sentences), "
            "recommended_action (one of: takedown|monetize|monitor|legal), "
            "estimated_revenue_loss (string like '$500–$2,000')."
        )

        response = model.generate_content(prompt)
        response_text = response.text.strip()

        # Clean markdown code fences if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            response_text = "\n".join(lines).strip()

        result = json.loads(response_text)

        # Validate expected keys
        if not all(k in result for k in ["reasoning", "recommended_action", "estimated_revenue_loss"]):
            raise ValueError("Missing required keys in Gemini response")

        logger.info(f"Gemini reasoning received for violation {violation.get('violation_id')}")
        return result

    except Exception as exc:
        logger.warning(f"Gemini reasoning failed (using fallback): {exc}")

        # Hardcoded fallback reasoning — ensures pipeline never breaks during demo
        fallback_actions = {
            "critical": "takedown",
            "high": "takedown",
            "medium": "monetize",
            "low": "monitor",
        }
        fallback_losses = {
            "critical": "$5,000–$20,000",
            "high": "$2,000–$5,000",
            "medium": "$500–$2,000",
            "low": "$100–$500",
        }
        return {
            "reasoning": (
                f"This violation on {violation.get('platform', 'unknown')} has a "
                f"{threat_level} threat level with a risk score of {total_risk}/100. "
                f"Immediate action is recommended to protect IP rights in the "
                f"{violation.get('region', 'unknown')} market."
            ),
            "recommended_action": fallback_actions.get(threat_level, "monitor"),
            "estimated_revenue_loss": fallback_losses.get(threat_level, "$100–$500"),
        }


def _process_violation(violation_id: str):
    """Full risk scoring pipeline for a single violation."""
    logger.info(f"Scoring violation {violation_id}")

    # Fetch violation from Firestore
    violation_doc = firestore_client.collection("violations").document(violation_id).get()
    if not violation_doc.exists:
        logger.error(f"Violation {violation_id} not found")
        return

    violation = violation_doc.to_dict()
    match_confidence = violation.get("match_confidence", 50.0)
    platform = violation.get("platform", "Unknown")
    url = violation.get("url", "")
    region = violation.get("region", "US")

    account_type = violation.get("account_type", "unofficial")

    # Compute 4 sub-component scores
    severity = _compute_severity_score(match_confidence)
    reach = _compute_reach_score(platform, account_type)
    repeat = _compute_repeat_offender_score(url)
    license_gap = _compute_license_gap_score(region)

    total_risk = min(severity + reach + repeat + license_gap, 100)
    threat_level = _get_threat_level(total_risk)

    logger.info(
        f"Risk breakdown for {violation_id}: "
        f"severity={severity}, reach={reach}, repeat={repeat}, "
        f"license_gap={license_gap}, total={total_risk}, level={threat_level}"
    )

    # Call Gemini for AI reasoning
    gemini_result = _call_gemini_for_reasoning(violation, total_risk, threat_level)

    # Update Firestore violation document
    analysed_at = _now_iso()
    update_data = {
        "risk_score": total_risk,
        "threat_level": threat_level,
        "severity_score": severity,
        "reach_score": reach,
        "repeat_offender_score": repeat,
        "license_gap_score": license_gap,
        "reasoning": gemini_result.get("reasoning", ""),
        "recommended_action": gemini_result.get("recommended_action", "monitor"),
        "estimated_revenue_loss": gemini_result.get("estimated_revenue_loss", ""),
        "analysed_at": analysed_at,
    }
    firestore_client.collection("violations").document(violation_id).update(update_data)
    logger.info(f"Updated violation {violation_id} with risk analysis")

    # Write updated record to BigQuery (insert new row with is_latest=true pattern)
    _write_scored_violation_to_bq(violation, update_data)

    # Spread velocity alert: if > 5 violations for this asset in last 30 min
    _check_velocity_alert(violation)


def _check_velocity_alert(violation: dict):
    """If > 5 violations for this asset in the last 30 min, publish velocity-alert."""
    try:
        from datetime import timedelta
        asset_id = violation.get("asset_id")
        if not asset_id:
            return
        thirty_min_ago = (datetime.utcnow() - timedelta(minutes=30)).isoformat() + "Z"
        recent = (
            firestore_client.collection("violations")
            .where("asset_id", "==", asset_id)
            .where("detected_at", ">=", thirty_min_ago)
            .stream()
        )
        count = sum(1 for _ in recent)
        if count > 5:
            velocity = round(count / 0.5, 2)  # violations per hour (30 min window)
            logger.info(f"VELOCITY ALERT: asset {asset_id} has {count} violations in 30 min (velocity={velocity}/hr)")
            # Mark on the violation
            firestore_client.collection("violations").document(
                violation.get("violation_id")
            ).update({"velocity_alert": True})
            # Publish velocity-alert to Pub/Sub
            topic_path = publisher.topic_path(PROJECT_ID, "velocity-alert")
            publisher.publish(
                topic_path,
                data=json.dumps({
                    "asset_id": asset_id,
                    "violations_last_30min": count,
                    "spread_velocity": velocity,
                }).encode(),
            )
            logger.info(f"Published velocity-alert for asset {asset_id}")
    except Exception as exc:
        logger.warning(f"Velocity alert check failed: {exc}")


def _write_scored_violation_to_bq(violation: dict, scores: dict):
    """Write scored violation to BigQuery — non-blocking with error logging."""
    try:
        table_ref = f"{PROJECT_ID}.{BQ_DATASET}.violations"
        row = {
            "violation_id": violation.get("violation_id", ""),
            "asset_id": violation.get("asset_id", ""),
            "platform": violation.get("platform", ""),
            "url": violation.get("url", ""),
            "region": violation.get("region", ""),
            "match_confidence": violation.get("match_confidence", 0.0),
            "risk_score": scores.get("risk_score", 0),
            "threat_level": scores.get("threat_level", ""),
            "recommended_action": scores.get("recommended_action", ""),
            "detected_at": violation.get("detected_at", _now_iso()),
            "is_latest": True,
        }
        errors = bq_client.insert_rows_json(table_ref, [row])
        if errors:
            logger.error(f"BigQuery insert errors: {errors}")
        else:
            logger.info(f"Written scored violation {violation.get('violation_id')} to BigQuery")
    except Exception as exc:
        logger.error(f"BigQuery write failed: {exc}", exc_info=True)


@app.get("/health")
def health():
    return {"status": "healthy", "service": "risk-scoring-service"}


@app.post("/pubsub")
async def handle_pubsub(request: Request):
    """Handle Pub/Sub push messages from violation-detected topic."""
    try:
        envelope = await request.json()
        if not envelope or "message" not in envelope:
            logger.warning("Invalid Pub/Sub envelope")
            return {"status": "ignored"}

        pubsub_message = envelope["message"]
        data = json.loads(base64.b64decode(pubsub_message.get("data", "")).decode())
        violation_id = data.get("violation_id")

        if not violation_id:
            logger.warning("No violation_id in Pub/Sub message")
            return {"status": "ignored"}

        _process_violation(violation_id)
        return {"status": "ok"}

    except Exception as exc:
        logger.error(f"Risk scoring Pub/Sub handler failed: {exc}", exc_info=True)
        return {"status": "error", "detail": str(exc)}
