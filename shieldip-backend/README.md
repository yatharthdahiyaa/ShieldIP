# ShieldIP Backend

AI-powered content piracy detection platform built entirely on Google Cloud Platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT / REACT FRONTEND                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│              API GATEWAY  →  Cloud Run: api-gateway-service          │
│    POST /assets/register    GET /violations    GET /analytics/*      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                     ┌─────────┴──────────┐
                     ▼                    ▼
              ┌─────────────┐    ┌────────────────┐
              │  Pub/Sub     │    │  Cloud Tasks    │
              │  Topics      │    │  Queue          │
              └──┬──┬──┬──┬─┘    └───────┬────────┘
                 │  │  │  │              │
        ┌────────┘  │  │  └────────┐     │
        ▼           ▼  ▼           ▼     ▼
┌──────────────┐ ┌─────────┐ ┌──────────────────┐ ┌───────────────┐
│ fingerprint  │ │ monitor │ │  risk-scoring    │ │ enforcement   │
│ service      │ │ service │ │  service         │ │ service       │
└──────┬───────┘ └────┬────┘ └────────┬─────────┘ └───────┬───────┘
       │              │               │                    │
       ▼              ▼               ▼                    ▼
┌──────────┐  ┌──────────┐  ┌──────────────────┐  ┌──────────────┐
│ Cloud    │  │Firestore │  │ Vertex AI        │  │ Cloud        │
│ Storage  │  │          │  │ (Gemini 1.5      │  │ Storage      │
│ + Vision │  │          │  │  Flash)          │  │ (Evidence)   │
│ API      │  │          │  └──────────────────┘  └──────────────┘
└──────┬───┘  └──────────┘
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BigQuery Analytics                                │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────┐               │
│  │ assets   │  │ violations  │  │ enforcement_log  │               │
│  └──────────┘  └─────────────┘  └──────────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
```

## GCP Services Used

| Service | Purpose |
|---------|---------|
| **Cloud Run** | Hosts all 5 microservices as serverless containers |
| **Cloud Pub/Sub** | Asynchronous event bus between services |
| **Cloud Firestore** | NoSQL document store for assets, fingerprints, violations |
| **Cloud Storage** | Stores uploaded content assets and evidence bundles |
| **Cloud Vision API** | Image fingerprinting, label/logo detection, web entities |
| **Video Intelligence API** | Video content analysis — shots, labels, objects, OCR |
| **Vertex AI (Gemini 1.5 Flash)** | Risk reasoning, DMCA notice generation |
| **BigQuery** | Analytics warehouse — KPIs, platform breakdowns |
| **Cloud Tasks** | Enforcement action queue with retry + exponential backoff |
| **Cloud Scheduler** | Triggers monitoring crawl simulation every 2 minutes |
| **Cloud Build** | CI/CD — builds Docker images and deploys to Cloud Run |
| **Artifact Registry** | Stores Docker container images |
| **IAM** | Least-privilege service accounts per microservice |
| **Terraform** | Infrastructure as Code for all resources |

## Demo Scale Note

The **monitor-service** includes a simulation layer that generates synthetic
piracy violation candidates using randomised platform URLs, regions, and
confidence scores. This simulates what a production web crawler would find.
All simulated data is clearly labelled in code comments. In production, you
would replace the simulation with a real web crawler (e.g., Google Custom
Search API, third-party OSINT feeds).

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- Terraform >= 1.5
- Docker
- A GCP project with billing enabled

## Deploy — Step by Step

```bash
# 1. Clone this repo
cd shieldip-backend

# 2. Set your GCP project ID
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"

# 3. Run the setup script (enables APIs, provisions infra, builds & deploys)
chmod +x setup.sh
./setup.sh
```

That's it. The script will:
1. Set the active GCP project
2. Enable all required APIs
3. Create an Artifact Registry repository
4. Run `terraform init && terraform apply` to provision all infrastructure
5. Trigger Cloud Build to build and deploy all 5 services

## API Endpoint Reference

Once deployed, your API Gateway service URL will be printed by Terraform.
All endpoints are prefixed with that base URL.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/assets/register` | Upload a file (multipart), register it as a protected asset |
| `GET` | `/assets/{asset_id}` | Fetch asset metadata + fingerprint hash |
| `GET` | `/violations` | List all violations (paginated: `?page=1&page_size=20`) |
| `GET` | `/violations/{id}` | Single violation with AI risk analysis |
| `POST` | `/violations/{id}/enforce` | Trigger enforcement (takedown / monetize / legal) |
| `GET` | `/analytics/summary` | KPI aggregates from BigQuery |
| `GET` | `/analytics/by-platform` | Violations grouped by platform |
| `GET` | `/health` | Health check |

### Request / Response Envelope

Every response follows this structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2025-01-15T12:00:00Z"
}
```

## Connecting the React Frontend

1. After deployment, get the API Gateway Cloud Run URL:
   ```bash
   gcloud run services describe api-gateway-service \
     --region us-central1 --format 'value(status.url)'
   ```
2. Set that as the `REACT_APP_API_BASE_URL` (or `VITE_API_BASE_URL`) in
   your React app's `.env` file.
3. All API calls from the frontend go to `${BASE_URL}/assets/register`,
   `${BASE_URL}/violations`, etc.
4. CORS is configured on the gateway to allow `http://localhost:3000` and
   `https://*.web.app` origins.

## Project Structure

```
shieldip-backend/
├── infra/
│   ├── main.tf              # All GCP resources
│   ├── variables.tf          # Input variables
│   └── outputs.tf            # Output values (URLs, names)
├── services/
│   ├── api-gateway/          # FastAPI gateway — public entry point
│   ├── fingerprint/          # Vision/Video AI fingerprinting
│   ├── monitor/              # Simulated crawl + violation detection
│   ├── risk-scoring/         # Structured risk score + Gemini reasoning
│   └── enforcement/          # DMCA generation + evidence bundling
├── cloudbuild.yaml           # CI/CD pipeline
├── setup.sh                  # One-command deploy script
└── README.md                 # This file
```

## License

Internal use — ShieldIP Demo Corp.
