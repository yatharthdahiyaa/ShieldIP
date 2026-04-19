output "api_gateway_url" {
  description = "URL of the API Gateway Cloud Run service"
  value       = google_cloud_run_v2_service.api_gateway.uri
}

output "fingerprint_service_url" {
  description = "URL of the fingerprint Cloud Run service"
  value       = google_cloud_run_v2_service.fingerprint.uri
}

output "monitor_service_url" {
  description = "URL of the monitor Cloud Run service"
  value       = google_cloud_run_v2_service.monitor.uri
}

output "risk_scoring_service_url" {
  description = "URL of the risk-scoring Cloud Run service"
  value       = google_cloud_run_v2_service.risk_scoring.uri
}

output "enforcement_service_url" {
  description = "URL of the enforcement Cloud Run service"
  value       = google_cloud_run_v2_service.enforcement.uri
}

output "assets_bucket" {
  description = "GCS bucket for content assets"
  value       = google_storage_bucket.assets.name
}

output "evidence_bucket" {
  description = "GCS bucket for evidence bundles"
  value       = google_storage_bucket.evidence.name
}

output "bigquery_dataset" {
  description = "BigQuery dataset ID"
  value       = google_bigquery_dataset.shieldip.dataset_id
}
