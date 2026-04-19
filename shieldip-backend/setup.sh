#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# ShieldIP Backend — One-command setup and deployment script
# Usage: export PROJECT_ID="your-project" GEMINI_API_KEY="your-key" && ./setup.sh
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

# ──────────── Configuration ────────────
PROJECT_ID="${PROJECT_ID:?ERROR: Set PROJECT_ID environment variable first}"
GEMINI_API_KEY="${GEMINI_API_KEY:?ERROR: Set GEMINI_API_KEY environment variable first (get one at aistudio.google.com)}"
REGION="${REGION:-us-central1}"
REPO_NAME="shieldip"

echo "============================================"
echo "  ShieldIP Backend — Setup & Deploy"
echo "  Project: ${PROJECT_ID}"
echo "  Region:  ${REGION}"
echo "============================================"

# ──────────── 1. Set GCP Project ────────────
echo ""
echo ">>> Step 1: Setting GCP project..."
gcloud config set project "${PROJECT_ID}"

# ──────────── 2. Enable all required APIs ────────────
echo ""
echo ">>> Step 2: Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  pubsub.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  vision.googleapis.com \
  videointelligence.googleapis.com \
  bigquery.googleapis.com \
  cloudtasks.googleapis.com \
  cloudscheduler.googleapis.com \
  generativelanguage.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  apigateway.googleapis.com

echo "All APIs enabled."

# ──────────── 3. Create Artifact Registry Repository ────────────
echo ""
echo ">>> Step 3: Creating Artifact Registry repository..."
gcloud artifacts repositories create "${REPO_NAME}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="ShieldIP container images" \
  2>/dev/null || echo "Repository already exists — skipping."

# Configure Docker auth for Artifact Registry
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ──────────── 4. Terraform — provision all infrastructure ────────────
echo ""
echo ">>> Step 4: Running Terraform..."
cd infra

terraform init -input=false

terraform apply \
  -auto-approve \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="gemini_api_key=${GEMINI_API_KEY}"

cd ..

echo "Terraform apply complete."

# ──────────── 5. Upload placeholder comparison image for monitor ────────────
echo ""
echo ">>> Step 5: Uploading placeholder comparison image..."

# Create a minimal 1x1 PNG for the Vision API comparison target
python3 -c "
import base64, struct, zlib
def create_png():
    # 1x1 red PNG
    raw = b'\x00\xff\x00\x00\xff'
    compressed = zlib.compress(raw)
    ihdr = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')

with open('/tmp/placeholder.png', 'wb') as f:
    f.write(create_png())
print('Created placeholder.png')
"

gsutil cp /tmp/placeholder.png "gs://shieldip-assets-${PROJECT_ID}/comparison/placeholder.png" \
  2>/dev/null || echo "Placeholder upload skipped (bucket may not be ready)."

# ──────────── 6. Trigger Cloud Build ────────────
echo ""
echo ">>> Step 6: Triggering Cloud Build..."
gcloud builds submit . \
  --config=cloudbuild.yaml \
  --substitutions="_REGION=${REGION},_GEMINI_API_KEY=${GEMINI_API_KEY}" \
  --region="${REGION}"

# ──────────── 7. Print service URLs ────────────
echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "Service URLs:"
for svc in api-gateway-service fingerprint-service monitor-service risk-scoring-service enforcement-service; do
  URL=$(gcloud run services describe "${svc}" --region="${REGION}" --format='value(status.url)' 2>/dev/null || echo "not yet deployed")
  echo "  ${svc}: ${URL}"
done

echo ""
echo "API Gateway (public): $(gcloud run services describe api-gateway-service --region=${REGION} --format='value(status.url)' 2>/dev/null)"
echo ""
echo "Done! Set REACT_APP_API_BASE_URL to the API Gateway URL above."
