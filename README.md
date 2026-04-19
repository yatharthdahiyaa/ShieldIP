# ShieldIP — AI-Powered Content Piracy Detection Platform

> **Hackathon MVP** | Detects, analyses, and enforces against IP violations using AI.

ShieldIP is an AI-powered content piracy detection platform that offers a full-stack solution for monitoring, risk-scoring, and taking enforcement action against intellectual property violations.

This monorepo contains the following components:
- **`ShieldIP-frontend/`**: The React/Vite web application providing the user interface and AI triage dashboards.
- **`shieldip-backend/`**: The GCP-based microservices architecture for scalable infrastructure, monitoring, and database management.
- **`shieldip-service/`**: Additional service module for the application.

---

## 🚀 Quick Start (Frontend)

To run the frontend dashboard locally:

```bash
cd ShieldIP-frontend
npm install
npm run dev
```

- **Frontend Dashboard** → http://localhost:5173
- **Local Backend (pHash)** → http://localhost:3001

Add your Anthropic API key to `ShieldIP-frontend/.env.local`:
```env
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

---

## ☁️ Deploying the GCP Backend

The backend is built entirely on Google Cloud Platform using serverless containers (Cloud Run), Pub/Sub, Firestore, and Vertex AI.

### Prerequisites
- Google Cloud SDK (`gcloud`) installed and authenticated
- Terraform >= 1.5
- Docker
- A GCP project with billing enabled

### Deployment Steps
```bash
# 1. Enter the backend directory
cd shieldip-backend

# 2. Set your GCP project ID
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"

# 3. Run the setup script
chmod +x setup.sh
./setup.sh
```

---

## 🏗️ Architecture Overview

The system uses a highly decoupled microservices architecture.

### Client / React Frontend
Provides the UI for Asset Registration, Piracy Monitoring Feed, AI Risk Scoring, and the Enforcement Engine.

### API Gateway (Cloud Run)
Acts as the entry point for all frontend requests, routing traffic to appropriate microservices.

### Backend Microservices
1. **Fingerprint Service**: Vision/Video AI for perceptual hashing and matching.
2. **Monitor Service**: Simulated web crawler and violation detection using Cloud Scheduler.
3. **Risk-Scoring Service**: Structured risk score generation powered by Vertex AI / Gemini.
4. **Enforcement Service**: Automated DMCA takedown notice generation and evidence bundling.

### Data Layer & Asynchronous Processing
- **Cloud Pub/Sub**: Event bus for asynchronous communication between microservices.
- **Cloud Firestore**: NoSQL document store for assets and violations.
- **Cloud Storage**: Object storage for content assets and evidence bundles.
- **BigQuery**: Analytics data warehouse for KPI aggregations.
- **Cloud Tasks**: Enforcement action queue with retry logic.

---

## 🧠 How AI is Used

| Layer | Feature | Description |
|-------|---------|-------------|
| **Violation Triage** | Threat Assessment | Evaluates violation metadata (platform, confidence %, region) to determine a `threat_level` (low/medium/high/critical), reasoning, and estimated revenue loss. |
| **Risk Scoring** | Automated Intelligence | Uses Gemini 1.5 Flash (Backend) or Claude 3.5 Sonnet (Frontend Demo) to generate risk intelligence. |
| **Enforcement Engine** | DMCA Notice Generation | AI automatically drafts legally-styled DMCA takedown notices based on the violator's URL and platform. |

---

## 📦 Core Features

- **Content Registration**: Upload assets and generate perceptual hashes.
- **Piracy Monitoring Feed**: Live feed tracking violations across major platforms (YouTube, TikTok, Instagram, X, Twitch).
- **Risk Scoring Dashboard**: Animated gauges and metrics for Domain Authority, Prior Offenses, and License Coverage.
- **Enforcement Engine**: One-click actions for DMCA Takedown, Monetization Claims, or Legal Flagging.
- **Analytics Dashboard**: World map hotspots, platform breakdown charts, and KPIs for total violations and revenue recovered.

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | React 18, Vite, TailwindCSS, Recharts, react-simple-maps |
| **Backend** | Node.js, Express (Frontend Local API), Python FastAPI (GCP Services) |
| **Infrastructure**| Terraform, Docker, Cloud Build, Artifact Registry |
| **GCP Services** | Cloud Run, Pub/Sub, Firestore, Cloud Storage, BigQuery, Cloud Tasks |
| **AI / ML** | Anthropic Claude (`claude-3-5-sonnet`), Google Vertex AI (`gemini-1.5-flash`), Cloud Vision API |

## License

Internal use — ShieldIP Demo Corp.
