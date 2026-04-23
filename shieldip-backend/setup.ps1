$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "sharp-avatar-494218-r8"
$GEMINI_API_KEY = "AIzaSyBYG5kjCJ_RgfHCjJ_574xF6in7u5jToSs"
$REGION = "us-central1"
$REPO_NAME = "shieldip"

# Set PATH to include gcloud just in case it's not
$env:PATH += ";$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin;C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin"

Write-Host "============================================"
Write-Host "  ShieldIP Backend - Setup and Deploy (Windows)"
Write-Host "  Project: $PROJECT_ID"
Write-Host "  Region:  $REGION"
Write-Host "============================================"

# 1. Set GCP Project
Write-Host "`n>>> Step 1: Setting GCP project..."
gcloud config set project $PROJECT_ID

# 2. Enable APIs
Write-Host "`n>>> Step 2: Enabling required GCP APIs..."
gcloud services enable run.googleapis.com pubsub.googleapis.com firestore.googleapis.com storage.googleapis.com vision.googleapis.com videointelligence.googleapis.com bigquery.googleapis.com cloudtasks.googleapis.com cloudscheduler.googleapis.com generativelanguage.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com apigateway.googleapis.com
Write-Host "All APIs enabled."

# 3. Artifact Registry
Write-Host "`n>>> Step 3: Creating Artifact Registry repository..."
try {
    gcloud artifacts repositories create $REPO_NAME --repository-format=docker --location=$REGION --description="ShieldIP container images"
} catch {
    Write-Host "Repository already exists - skipping."
}

gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

# 4. Terraform
Write-Host "`n>>> Step 4: Running Terraform..."
Set-Location infra
& "C:\Users\yatha\Downloads\terraform_1.14.9_windows_386\terraform.exe" init "-input=false"
& "C:\Users\yatha\Downloads\terraform_1.14.9_windows_386\terraform.exe" apply -auto-approve -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="gemini_api_key=$GEMINI_API_KEY"
Set-Location ..
Write-Host "Terraform apply complete."

# 5. Upload placeholder comparison image
Write-Host "`n>>> Step 5: Uploading placeholder comparison image..."
$pythonScript = @"
import base64, struct, zlib
def create_png():
    raw = b'\x00\xff\x00\x00\xff'
    compressed = zlib.compress(raw)
    ihdr = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')

with open('placeholder.png', 'wb') as f:
    f.write(create_png())
"@
Set-Content -Path "create_png.py" -Value $pythonScript
python create_png.py
try {
    gsutil cp placeholder.png "gs://shieldip-assets-${PROJECT_ID}/comparison/placeholder.png"
} catch {
    Write-Host "Placeholder upload skipped (bucket may not be ready)."
}
Remove-Item placeholder.png -ErrorAction Ignore
Remove-Item create_png.py -ErrorAction Ignore

# 6. Trigger Cloud Build
Write-Host "`n>>> Step 6: Triggering Cloud Build..."
gcloud builds submit . --config=cloudbuild.yaml --substitutions="_REGION=$REGION,_GEMINI_API_KEY=$GEMINI_API_KEY" --region=$REGION

# 7. Print URLs
Write-Host "`n============================================"
Write-Host "  Deployment Complete!"
Write-Host "============================================"
Write-Host "`nService URLs:"
$services = "api-gateway-service", "fingerprint-service", "monitor-service", "risk-scoring-service", "enforcement-service"
foreach ($svc in $services) {
    $url = ""
    try {
        $url = (gcloud run services describe $svc --region=$REGION --format="value(status.url)" 2>$null)
    } catch {}
    if (-not $url) { $url = "not yet deployed" }
    Write-Host "  ${svc}: $url"
}

$apiGatewayUrl = (gcloud run services describe api-gateway-service --region=$REGION --format="value(status.url)" 2>$null)
Write-Host "`nAPI Gateway (public): $apiGatewayUrl"
Write-Host "`nDone! Set REACT_APP_API_BASE_URL to the API Gateway URL above."
