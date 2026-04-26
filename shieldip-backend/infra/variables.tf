variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_number" {
  description = "GCP project number (run: gcloud projects describe PROJECT_ID --format='value(projectNumber)')"
  type        = string
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "api_gateway_image" {
  description = "Container image for api-gateway-service"
  type        = string
  default     = ""
}

variable "fingerprint_image" {
  description = "Container image for fingerprint-service"
  type        = string
  default     = ""
}

variable "monitor_image" {
  description = "Container image for monitor-service"
  type        = string
  default     = ""
}

variable "risk_scoring_image" {
  description = "Container image for risk-scoring-service"
  type        = string
  default     = ""
}

variable "enforcement_image" {
  description = "Container image for enforcement-service"
  type        = string
  default     = ""
}

variable "gemini_api_key" {
  description = "Google AI Studio (Gemini) API key from aistudio.google.com"
  type        = string
  sensitive   = true
}
