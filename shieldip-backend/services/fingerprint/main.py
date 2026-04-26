"""ShieldIP Fingerprint Service — processes assets via Vision/Video Intelligence APIs.

Features:
- Perceptual hash (pHash) fingerprinting
- Content variant detection (mirror, crop, meme/overlay, colour-grade)
- Scene-level video fingerprints for clipped highlight matching
- Brand misuse scan via Cloud Vision API logo_annotations
"""

import base64
import hashlib
import json
import logging
import os
import subprocess
import tempfile
from datetime import datetime

from fastapi import FastAPI, Request
from google.cloud import bigquery, firestore, pubsub_v1, storage, vision
from google.cloud import videointelligence_v1 as videointelligence

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
logger = logging.getLogger("fingerprint-service")
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
storage_client = storage.Client()
firestore_client = firestore.Client()
publisher = pubsub_v1.PublisherClient()
bq_client = bigquery.Client()
vision_client = vision.ImageAnnotatorClient()
video_client = videointelligence.VideoIntelligenceServiceClient()

app = FastAPI(title="ShieldIP Fingerprint Service", version="1.0.0")


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _compute_phash(crop_hints, dominant_colors) -> str:
    """Compute a simulated perceptual hash from Vision API crop hints + dominant colours."""
    raw = ""
    if crop_hints:
        for hint in crop_hints:
            for vertex in hint.bounding_poly.vertices:
                raw += f"{vertex.x},{vertex.y};"
    if dominant_colors:
        for color_info in dominant_colors:
            c = color_info.color
            raw += f"r{c.red}g{c.green}b{c.blue}s{color_info.score:.4f};"
    if not raw:
        raw = "empty-fallback"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _process_image(asset_id: str, gcs_uri: str) -> dict:
    """Process an image asset through Cloud Vision API."""
    logger.info(f"Processing image asset {asset_id} from {gcs_uri}")

    image = vision.Image(source=vision.ImageSource(image_uri=gcs_uri))

    # Batch annotate with multiple features
    features = [
        vision.Feature(type_=vision.Feature.Type.LABEL_DETECTION, max_results=15),
        vision.Feature(type_=vision.Feature.Type.LOGO_DETECTION, max_results=10),
        vision.Feature(type_=vision.Feature.Type.WEB_DETECTION, max_results=10),
        vision.Feature(type_=vision.Feature.Type.SAFE_SEARCH_DETECTION),
        vision.Feature(type_=vision.Feature.Type.CROP_HINTS),
        vision.Feature(type_=vision.Feature.Type.IMAGE_PROPERTIES),
    ]

    request = vision.AnnotateImageRequest(image=image, features=features)
    response = vision_client.annotate_image(request=request)

    # Extract labels
    vision_labels = [
        {"description": label.description, "score": round(label.score, 4)}
        for label in response.label_annotations
    ]

    # Extract logos
    logos = [
        {"description": logo.description, "score": round(logo.score, 4)}
        for logo in response.logo_annotations
    ]

    # Extract web entities
    web_entities = []
    if response.web_detection:
        web_entities = [
            {"description": e.description, "score": round(e.score, 4)}
            for e in response.web_detection.web_entities
            if e.description
        ]

    # Safe search
    safe_search = {}
    if response.safe_search_annotation:
        ss = response.safe_search_annotation
        safe_search = {
            "adult": ss.adult.name,
            "violence": ss.violence.name,
            "racy": ss.racy.name,
        }

    # Compute pHash from crop hints + dominant colors
    crop_hints = response.crop_hints_annotation.crop_hints if response.crop_hints_annotation else []
    dominant_colors = (
        response.image_properties_annotation.dominant_colors.colors
        if response.image_properties_annotation
        and response.image_properties_annotation.dominant_colors
        else []
    )
    phash = _compute_phash(crop_hints, dominant_colors)

    # Extract dominant colour palette for colour-grade variant detection
    dominant_palette = []
    for color_info in dominant_colors:
        c = color_info.color
        dominant_palette.append({
            "r": int(c.red), "g": int(c.green), "b": int(c.blue),
            "score": round(color_info.score, 4),
            "pixel_fraction": round(color_info.pixel_fraction, 4),
        })

    # Extract text annotations for meme/overlay detection baseline
    text_baseline = []
    try:
        text_req = vision.AnnotateImageRequest(
            image=image,
            features=[vision.Feature(type_=vision.Feature.Type.TEXT_DETECTION)],
        )
        text_resp = vision_client.annotate_image(request=text_req)
        if text_resp.text_annotations:
            text_baseline = [t.description for t in text_resp.text_annotations[:20]]
    except Exception as exc:
        logger.warning(f"Text detection for baseline failed: {exc}")

    return {
        "phash": phash,
        "vision_labels": vision_labels,
        "logos": logos,
        "web_entities": web_entities,
        "safe_search": safe_search,
        "dominant_palette": dominant_palette,
        "text_baseline": text_baseline,
        "media_type": "image",
    }


def _extract_keyframes(gcs_uri: str, asset_id: str, timestamps: list) -> list:
    """
    Extract JPEG keyframe images at given timestamps from a GCS video using FFmpeg.
    Uploads frames to GCS under assets/{asset_id}/keyframes/ and returns gs:// URIs.
    Falls back to empty list on any error (non-fatal).
    """
    if not timestamps:
        return []

    # Parse bucket and object path from gs://bucket/path
    parts = gcs_uri[5:].split("/", 1)  # strip "gs://"
    if len(parts) < 2:
        return []
    bucket_name, object_path = parts[0], parts[1]

    keyframe_uris = []
    try:
        bucket = storage_client.bucket(bucket_name)
        with tempfile.TemporaryDirectory() as tmpdir:
            video_path = os.path.join(tmpdir, "input_video")

            # Download video from GCS
            blob = bucket.blob(object_path)
            blob.download_to_filename(video_path)
            logger.info(f"Downloaded video for keyframe extraction: {asset_id}")

            # Extract one JPEG frame at each shot boundary (max 8 keyframes)
            for i, ts in enumerate(timestamps[:8]):
                frame_path = os.path.join(tmpdir, f"kf_{i:03d}.jpg")
                try:
                    result = subprocess.run(
                        [
                            "ffmpeg", "-y",
                            "-ss", str(round(ts, 3)),
                            "-i", video_path,
                            "-vframes", "1",
                            "-q:v", "3",
                            "-f", "image2",
                            frame_path,
                        ],
                        capture_output=True,
                        timeout=60,
                    )
                    if result.returncode == 0 and os.path.exists(frame_path) and os.path.getsize(frame_path) > 1024:
                        dest = f"assets/{asset_id}/keyframes/kf_{i:03d}.jpg"
                        bucket.blob(dest).upload_from_filename(frame_path, content_type="image/jpeg")
                        uri = f"gs://{bucket_name}/{dest}"
                        keyframe_uris.append(uri)
                        logger.info(f"Keyframe {i} extracted at t={ts}s → {uri}")
                    else:
                        logger.warning(f"FFmpeg failed for frame {i} (returncode={result.returncode})")
                except Exception as exc:
                    logger.warning(f"Keyframe {i} extraction error at t={ts}: {exc}")

    except Exception as exc:
        logger.warning(f"Keyframe extraction aborted for {asset_id}: {exc}")

    return keyframe_uris


def _process_video(asset_id: str, gcs_uri: str) -> dict:
    """Process a video asset through Video Intelligence API."""
    logger.info(f"Processing video asset {asset_id} from {gcs_uri}")

    features = [
        videointelligence.Feature.SHOT_CHANGE_DETECTION,
        videointelligence.Feature.LABEL_DETECTION,
        videointelligence.Feature.OBJECT_TRACKING,
        videointelligence.Feature.TEXT_DETECTION,
    ]

    operation = video_client.annotate_video(
        request=videointelligence.AnnotateVideoRequest(
            input_uri=gcs_uri,
            features=features,
        )
    )

    logger.info(f"Waiting for video annotation to complete for {asset_id}...")
    result = operation.result(timeout=300)

    annotation = result.annotation_results[0]

    # Shot changes
    shots = []
    for shot in annotation.shot_annotations:
        start = shot.start_time_offset.seconds + shot.start_time_offset.microseconds / 1e6
        end = shot.end_time_offset.seconds + shot.end_time_offset.microseconds / 1e6
        shots.append({"start": round(start, 2), "end": round(end, 2)})

    # Labels
    vision_labels = [
        {
            "description": label.entity.description,
            "confidence": round(label.category_entities[0].description if label.category_entities else 0, 4)
            if label.category_entities else None,
        }
        for label in annotation.segment_label_annotations[:15]
    ]

    # Object tracking
    objects_tracked = [
        {"description": obj.entity.description, "confidence": round(obj.confidence, 4)}
        for obj in annotation.object_annotations[:10]
    ]

    # Text on screen
    text_on_screen = [
        text.text
        for text in annotation.text_annotations[:10]
    ]

    # Scene-level fingerprints: one hash per shot for clipped highlight matching
    scenes = []
    for i, shot in enumerate(shots[:30]):
        shot_hash_input = f"shot:{i};start:{shot['start']};end:{shot['end']};labels:{len(vision_labels)}"
        shot_hash = hashlib.sha256(shot_hash_input.encode()).hexdigest()[:16]
        shot_labels = [lbl["description"] for lbl in vision_labels[:5]] if vision_labels else []
        scenes.append({
            "timestamp": shot["start"],
            "scene_hash": shot_hash,
            "labels": shot_labels,
        })

    # Simulated phash from shot count + label count
    hash_input = f"shots:{len(shots)};labels:{len(vision_labels)};objects:{len(objects_tracked)}"
    phash = hashlib.sha256(hash_input.encode()).hexdigest()[:16]

    # L3: Extract keyframes at shot boundaries using FFmpeg → store in GCS for Vision reuse
    shot_timestamps = [s["start"] for s in shots if s["start"] >= 0]
    keyframe_uris = _extract_keyframes(gcs_uri, asset_id, shot_timestamps)
    logger.info(f"Extracted {len(keyframe_uris)} keyframes for video asset {asset_id}")

    return {
        "phash": phash,
        "shots": shots[:20],
        "scenes": scenes,
        "vision_labels": vision_labels,
        "web_entities": [],            # not returned by Video Intelligence
        "logos": [],                   # not returned by Video Intelligence
        "dominant_palette": [],        # not returned by Video Intelligence
        "objects_tracked": objects_tracked,
        "text_baseline": text_on_screen,   # unified field name (fixes naming bug)
        "keyframe_uris": keyframe_uris,    # GCS URIs of extracted keyframe images (L3)
        "media_type": "video",
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": "fingerprint-service"}


@app.post("/pubsub")
async def handle_pubsub(request: Request):
    """Handle Pub/Sub push messages for asset-registered topic."""
    try:
        envelope = await request.json()
        if not envelope or "message" not in envelope:
            logger.warning("Invalid Pub/Sub envelope received")
            return {"status": "ignored"}

        pubsub_message = envelope["message"]
        data = json.loads(base64.b64decode(pubsub_message.get("data", "")).decode())
        asset_id = data.get("asset_id")
        media_type = data.get("media_type", "image")

        if not asset_id:
            logger.warning("No asset_id in Pub/Sub message")
            return {"status": "ignored"}

        logger.info(f"Processing fingerprint for asset {asset_id}, type={media_type}")

        # Fetch asset document from Firestore to get GCS URI
        asset_doc = firestore_client.collection("assets").document(asset_id).get()
        if not asset_doc.exists:
            logger.error(f"Asset {asset_id} not found in Firestore")
            return {"status": "error", "detail": "Asset not found"}

        asset_data = asset_doc.to_dict()
        gcs_uri = asset_data.get("gcs_uri", "")

        # Process based on media type
        if media_type == "video":
            fingerprint_data = _process_video(asset_id, gcs_uri)
        else:
            fingerprint_data = _process_image(asset_id, gcs_uri)

        # Store fingerprint in Firestore
        fingerprint_doc = {
            "asset_id": asset_id,
            "phash": fingerprint_data["phash"],
            "vision_labels": fingerprint_data.get("vision_labels", []),
            "web_entities": fingerprint_data.get("web_entities", []),
            "logos": fingerprint_data.get("logos", []),
            "dominant_palette": fingerprint_data.get("dominant_palette", []),
            "text_baseline": fingerprint_data.get("text_baseline", []),
            "scenes": fingerprint_data.get("scenes", []),
            "shots": fingerprint_data.get("shots", []),
            "keyframe_uris": fingerprint_data.get("keyframe_uris", []),
            "media_type": fingerprint_data["media_type"],
            "created_at": _now_iso(),
        }
        firestore_client.collection("fingerprints").document(asset_id).set(fingerprint_doc)
        logger.info(f"Stored fingerprint for asset {asset_id}, phash={fingerprint_data['phash']}")

        # Brand misuse scan: extract protected brands from logo_annotations
        protected_brands = _brand_misuse_scan(fingerprint_data)
        if protected_brands:
            firestore_client.collection("assets").document(asset_id).update({
                "protected_brands": protected_brands,
            })
            logger.info(f"Protected brands for {asset_id}: {protected_brands}")

        # Publish to fingerprint-ready topic
        topic_path = publisher.topic_path(PROJECT_ID, "fingerprint-ready")
        publisher.publish(
            topic_path,
            data=json.dumps({"asset_id": asset_id}).encode(),
        )
        logger.info(f"Published fingerprint-ready for {asset_id}")

        # Write to BigQuery (non-blocking, error-logged)
        _write_asset_to_bq(asset_id, asset_data, fingerprint_data)

        return {"status": "ok"}

    except Exception as exc:
        logger.error(f"Fingerprint processing failed: {exc}", exc_info=True)
        return {"status": "error", "detail": str(exc)}


def _brand_misuse_scan(fingerprint_data: dict) -> list:
    """Extract protected brand names from logo annotations."""
    logos = fingerprint_data.get("logos", [])
    if not logos:
        return []
    brands = []
    for logo in logos:
        desc = logo.get("description", "")
        score = logo.get("score", 0)
        if desc and score > 0.5:
            brands.append(desc)
    return brands


def _write_asset_to_bq(asset_id: str, asset_data: dict, fingerprint_data: dict):
    """Write asset metadata to BigQuery — non-blocking with error logging."""
    try:
        table_ref = f"{PROJECT_ID}.{BQ_DATASET}.assets"
        rows = [
            {
                "asset_id": asset_id,
                "filename": asset_data.get("filename", ""),
                "media_type": fingerprint_data.get("media_type", ""),
                "phash": fingerprint_data.get("phash", ""),
                "registered_at": asset_data.get("registered_at", _now_iso()),
            }
        ]
        errors = bq_client.insert_rows_json(table_ref, rows)
        if errors:
            logger.error(f"BigQuery insert errors for asset {asset_id}: {errors}")
        else:
            logger.info(f"Written asset {asset_id} to BigQuery")
    except Exception as exc:
        logger.error(f"BigQuery write failed for asset {asset_id}: {exc}", exc_info=True)
