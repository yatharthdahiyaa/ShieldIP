# ShieldIP — AI-Powered Content Piracy Detection Platform

> Full-stack IP protection platform: real-time fingerprinting, multi-layer violation detection, AI risk scoring, automated DMCA enforcement, and traceability chains.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Fingerprint Pipeline](#fingerprint-pipeline)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Quick Start — Frontend](#quick-start--frontend)
- [Deploying the GCP Backend](#deploying-the-gcp-backend)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)

---

## Overview

ShieldIP monitors your registered content across the web, detects piracy violations using a multi-layer AI fingerprint pipeline, scores risk with Gemini 2.5 Flash, and generates DMCA takedown notices automatically. Everything flows through a real-time React dashboard backed by five GCP Cloud Run microservices.

```
ShieldIP-frontend/     → React 18 + Vite dashboard
shieldip-backend/      → 5 GCP Cloud Run microservices
  services/
    api-gateway/       → Public REST API (FastAPI)
    fingerprint/       → Vision + Video Intelligence + FFmpeg keyframes
    monitor/           → Web violation detection (L1–L4 pipeline)
    risk-scoring/      → Gemini 2.5 Flash risk analysis + alerts
    enforcement/       → DMCA notice generation + evidence bundling
  infra/               → Terraform (Firestore, BigQuery, Pub/Sub, Cloud Tasks)
```

---

## Architecture

```
Browser  ──►  API Gateway (Cloud Run)
               │
               ├── GET /assets, /violations, /analytics/*
               ├── GET /alerts, PATCH /alerts/{id}/read
               ├── GET/POST/DELETE /api-keys
               ├── GET /audit-events
               └── POST /violations/{id}/enforce  ──► Cloud Tasks
                                                        │
                          Pub/Sub ◄──────────────────────┤
                          │                              │
               ┌──────────┴──────────┐       Enforcement Service
               │                     │         (DMCA / GCS evidence)
        Fingerprint Service     Monitor Service
        (Vision API +           (Vision WEB_DETECTION
         Video Intelligence +    per keyframe + L1/L2/L3/L4)
         FFmpeg keyframes)              │
               │                       ▼
               └──────────► Risk-Scoring Service
                             (Gemini 2.5 Flash + Alerts)
```

**Data stores:**

| Store | Used for |
|---|---|
| Cloud Firestore | `assets`, `fingerprints`, `violations`, `chains`, `alerts`, `api_keys`, `audit_events` |
| Cloud Storage | Uploaded assets, extracted keyframes, DMCA evidence bundles |
| BigQuery | `violations`, `assets`, `enforcement_log`, `propagation_tree` analytics tables |
| Cloud Tasks | Async enforcement action queue |
| Cloud Pub/Sub | `asset-registered`, `fingerprint-ready`, `violation-detected`, `velocity-alert` |

---

## Fingerprint Pipeline

Every registered asset goes through a 4-stage pipeline before monitoring begins.

### Stage 1 — Image Fingerprinting (Cloud Vision API)
- `LABEL_DETECTION` — content labels stored as `vision_labels`
- `LOGO_DETECTION` — brand logos stored as `logos` / `protected_brands`
- `WEB_DETECTION` — web entities stored as `web_entities`
- `IMAGE_PROPERTIES` — dominant colour palette stored as `dominant_palette`
- `CROP_HINTS` — used to compute a perceptual hash (`phash`)
- `TEXT_DETECTION` — OCR text stored as `text_baseline` (used in L4 S5 signal)

### Stage 2 — Video Fingerprinting (Cloud Video Intelligence API)
- `SHOT_CHANGE_DETECTION` — shot boundaries → `shots[]` + `scenes[]` (with per-shot hashes)
- `LABEL_DETECTION` — segment-level content labels
- `OBJECT_TRACKING` — tracked objects → `objects_tracked`
- `TEXT_DETECTION` — on-screen text → `text_baseline` (unified with image)

### Stage 3 — Keyframe Extraction (FFmpeg)
For video assets, one JPEG frame is extracted at each shot boundary using FFmpeg and uploaded to GCS (`assets/{id}/keyframes/kf_NNN.jpg`). The resulting `keyframe_uris` are stored in the fingerprint document and used by the monitor for per-frame Vision searches.

### Stage 4 — Brand Misuse Scan
Logos with confidence > 0.5 are stored as `protected_brands` on the asset. The monitor flags any candidate URL that contains a protected brand name in its path as `brand_misuse: true`.

---

### Monitor Detection Pipeline (L1 → L4)

Each monitoring tick processes every registered fingerprint through four layers:

| Layer | What it does |
|---|---|
| **L1 — Metadata keyword filter** | Skips candidate URLs with no overlap between fingerprint labels/entities and URL path tokens. High-reach platforms (YouTube, TikTok, Instagram…) always pass. |
| **L2 — Semantic similarity** | For borderline confidence (35–65%), calls Gemini 2.5 Flash to assess whether the candidate URL semantically relates to the fingerprint content. Adds 0–15pt boost. |
| **L3 — Multi-frame Vision scan** | Runs `WEB_DETECTION` on up to 4 keyframe images + the original asset URI. Deduplicates candidate URLs across all scan passes. |
| **L4 — Multimodal 6-signal fusion** | Computes final match confidence 0–100: |

**L4 signal breakdown (max 100 pts):**

| Signal | Max | Source |
|---|---|---|
| S1 Vision WEB_DETECTION base | 30 | Real per-frame score from Vision API |
| S2 Entity ∩ label overlap | 20 | `web_entities` ∩ `vision_labels` |
| S3 Colour palette richness | 15 | `dominant_palette` brightness proxy |
| S4 IP-category label match | 10 | Labels ∈ {music, film, sport, game, …} |
| S5 OCR / text depth | 15 | Unique tokens in `text_baseline` |
| S6 Scene / shot depth | 10 | Number of distinct scenes in video |

Violations with fused confidence > 45% are written to Firestore and BigQuery.

---

## Core Features

### Asset Registry
Upload images or videos. Vision/Video Intelligence fingerprints them automatically. Perceptual hash, labels, logos, colour palette, OCR text, and scene hashes are stored.

### Violation Detection
Real Cloud Vision `WEB_DETECTION` finds matching pages online. Each match goes through L1→L4 before being recorded. Violations track platform, URL, region, confidence, brand misuse flag, and propagation chain.

### Traceability Chains
Every violation is assigned a `chain_id`, `parent_id`, and `depth`. The traceability engine tracks how content spreads from its origin across platforms. `spread_velocity` (violations/hour) is computed per chain.

### Risk Scoring
Gemini 2.5 Flash analyses each violation across four dimensions:
- **Severity** (0–40) — confidence band
- **Reach** (0–30) — platform audience + account type bonus
- **Repeat Offender** (0–20) — prior violations from same domain
- **License Gap** (0–10) — region enforcement difficulty

Outputs: `risk_score`, `threat_level`, `reasoning`, `recommended_action`, `estimated_revenue_loss`.

### Real-Time Alerts
The risk-scoring service writes to `/alerts` in Firestore:
- **Threat alert** — when a critical/high violation is scored
- **Velocity alert** — when > 5 violations for one asset occur within 30 minutes

The frontend polls every 15 s and shows unread count in the sidebar badge.

### Enforcement
Four actions available per violation:
- **Takedown** — AI-generated DMCA notice (GCS + Firestore)
- **Monetize** — revenue-share claim record
- **Legal** — full evidence bundle (chain of custody, screenshots, metadata)
- **Monitor** — mark for observation

### API Keys
Create named API keys with scopes (read / write / admin). Raw key shown once at creation. Keys are SHA-256 hashed before storage. Revoke at any time.

### Audit Log
Every significant action writes a structured event to `/audit_events`:
`asset_registered` · `violation_detected` · `risk_scored` · `enforcement_queued` · `api_key_created` · `api_key_revoked`

Filterable by action type, searchable, and CSV-exportable from the dashboard.

### Analytics
- KPI tiles: total assets, violations, enforcements, avg risk score
- Violations by platform (bar chart, real Firestore data)
- Threat level distribution (pie chart)
- Traceability summary: origin sources, fastest spread, platforms reached today

---

## Tech Stack

| Component | Technology |
|---|---|
| **Frontend** | React 18, Vite, TailwindCSS, Framer Motion, Recharts, react-simple-maps, TanStack Query, Zustand |
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **AI / Vision** | Google Gemini 2.5 Flash, Cloud Vision API, Cloud Video Intelligence API |
| **Video** | FFmpeg (keyframe extraction in fingerprint service container) |
| **Infrastructure** | Terraform, Docker, Cloud Build CI/CD, Artifact Registry |
| **GCP Services** | Cloud Run, Firestore, Cloud Storage, BigQuery, Pub/Sub, Cloud Tasks, Cloud Scheduler |
| **Icons / UI** | Lucide React, date-fns, papaparse |

---

## Quick Start — Frontend

```bash
cd ShieldIP-frontend
npm install
npm run dev
```

Dashboard → **http://localhost:5173**

Create `ShieldIP-frontend/.env.local`:

```env
VITE_API_BASE_URL=https://<your-api-gateway-cloud-run-url>
VITE_GEMINI_API_KEY=AIza...
```

> The frontend works fully with the deployed GCP backend. Without `VITE_API_BASE_URL` it falls back to mock data for most pages.

---

## Deploying the GCP Backend

### Prerequisites

- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- Terraform ≥ 1.5
- Docker
- GCP project with billing enabled
- Gemini API key from [Google AI Studio](https://aistudio.google.com)

### Steps

```bash
cd shieldip-backend

# Set variables
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export GEMINI_API_KEY="AIza..."

# Enable APIs, provision infra, build & deploy
chmod +x setup.sh
./setup.sh
```

The script:
1. Enables all required GCP APIs
2. Creates Artifact Registry repository
3. Runs Terraform (Firestore, BigQuery, Pub/Sub topics, Cloud Tasks queue, IAM)
4. Uploads a placeholder asset to GCS
5. Triggers Cloud Build to build + push + deploy all 5 services
6. Prints the API Gateway URL

### Re-deploy after code changes

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_GEMINI_API_KEY=$GEMINI_API_KEY \
  .
```

---

## Environment Variables

### Backend services (set via Cloud Build `--set-env-vars`)

| Variable | Description |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCS_ASSETS_BUCKET` | `shieldip-assets-{PROJECT_ID}` |
| `GCS_EVIDENCE_BUCKET` | `shieldip-evidence-{PROJECT_ID}` |
| `FIRESTORE_DATABASE` | `(default)` |
| `BIGQUERY_DATASET` | `shieldip_analytics` |
| `TASKS_QUEUE` | `enforcement-actions` |
| `GEMINI_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `ENFORCEMENT_SERVICE_URL` | Auto-set by Cloud Build post-deploy |

### Frontend (`.env.local`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | API Gateway Cloud Run URL |
| `VITE_GEMINI_API_KEY` | Gemini API key for client-side AI features |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/assets/register` | Upload and register an asset |
| `GET` | `/assets` | List all registered assets |
| `GET` | `/assets/{id}` | Get asset details + phash |
| `GET` | `/violations` | List violations (paginated) |
| `POST` | `/violations/{id}/enforce` | Queue enforcement action |
| `GET` | `/analytics/summary` | KPI summary |
| `GET` | `/analytics/platform-breakdown` | Violations by platform |
| `GET` | `/analytics/traceability-summary` | Chain spread metrics |
| `GET` | `/chains` | All traceability chains |
| `GET` | `/chains/{id}/timeline` | Chain timeline |
| `GET` | `/alerts` | Fetch alerts (supports `?limit=`) |
| `PATCH` | `/alerts/{id}/read` | Mark alert as read |
| `PATCH` | `/alerts/read-all` | Mark all alerts as read |
| `GET` | `/api-keys` | List API keys (masked) |
| `POST` | `/api-keys` | Create API key (raw key returned once) |
| `DELETE` | `/api-keys/{id}` | Revoke API key |
| `GET` | `/audit-events` | Fetch audit events (supports `?limit=&action=`) |
| `GET` | `/health` | Health check |

---

## License

MIT — ShieldIP.
