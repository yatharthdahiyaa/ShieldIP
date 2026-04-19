terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ─────────────────────────────────────────────
# Local values
# ─────────────────────────────────────────────
locals {
  services = ["api-gateway", "fingerprint", "monitor", "risk-scoring", "enforcement"]
  default_image = "us-docker.pkg.dev/cloudrun/container/hello"
  env_vars = {
    GCP_PROJECT_ID     = var.project_id
    GCS_ASSETS_BUCKET  = google_storage_bucket.assets.name
    GCS_EVIDENCE_BUCKET = google_storage_bucket.evidence.name
    FIRESTORE_DATABASE  = "(default)"
    BIGQUERY_DATASET    = google_bigquery_dataset.shieldip.dataset_id
    TASKS_QUEUE         = google_cloud_tasks_queue.enforcement.name
    GEMINI_API_KEY      = var.gemini_api_key
    GEMINI_MODEL        = "gemini-1.5-flash"
  }
}

# ─────────────────────────────────────────────
# Cloud Storage Buckets
# ─────────────────────────────────────────────
resource "google_storage_bucket" "assets" {
  name                        = "shieldip-assets-${var.project_id}"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
}

resource "google_storage_bucket" "evidence" {
  name                        = "shieldip-evidence-${var.project_id}"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
}

# ─────────────────────────────────────────────
# Firestore Database (Native Mode)
# ─────────────────────────────────────────────
resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# ─────────────────────────────────────────────
# Pub/Sub Topics
# ─────────────────────────────────────────────
resource "google_pubsub_topic" "asset_registered" {
  name = "asset-registered"
}

resource "google_pubsub_topic" "fingerprint_ready" {
  name = "fingerprint-ready"
}

resource "google_pubsub_topic" "monitoring_tick" {
  name = "monitoring-tick"
}

resource "google_pubsub_topic" "violation_detected" {
  name = "violation-detected"
}

resource "google_pubsub_topic" "enforcement_complete" {
  name = "enforcement-complete"
}

# ─────────────────────────────────────────────
# IAM Service Accounts (one per service)
# ─────────────────────────────────────────────
resource "google_service_account" "api_gateway" {
  account_id   = "shieldip-api-gateway"
  display_name = "ShieldIP API Gateway Service Account"
}

resource "google_service_account" "fingerprint" {
  account_id   = "shieldip-fingerprint"
  display_name = "ShieldIP Fingerprint Service Account"
}

resource "google_service_account" "monitor" {
  account_id   = "shieldip-monitor"
  display_name = "ShieldIP Monitor Service Account"
}

resource "google_service_account" "risk_scoring" {
  account_id   = "shieldip-risk-scoring"
  display_name = "ShieldIP Risk Scoring Service Account"
}

resource "google_service_account" "enforcement" {
  account_id   = "shieldip-enforcement"
  display_name = "ShieldIP Enforcement Service Account"
}

# ─────────────────────────────────────────────
# IAM Bindings — Least Privilege
# ─────────────────────────────────────────────

# API Gateway: Pub/Sub publisher, Firestore user, Storage admin, BigQuery reader, Tasks enqueuer
resource "google_project_iam_member" "api_gw_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.api_gateway.email}"
}
resource "google_project_iam_member" "api_gw_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.api_gateway.email}"
}
resource "google_project_iam_member" "api_gw_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.api_gateway.email}"
}
resource "google_project_iam_member" "api_gw_bq" {
  project = var.project_id
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${google_service_account.api_gateway.email}"
}
resource "google_project_iam_member" "api_gw_bq_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.api_gateway.email}"
}
resource "google_project_iam_member" "api_gw_tasks" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.api_gateway.email}"
}

# Fingerprint: Storage reader, Vision user, Firestore user, Pub/Sub publisher, BigQuery writer
resource "google_project_iam_member" "fp_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.fingerprint.email}"
}
resource "google_project_iam_member" "fp_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.fingerprint.email}"
}
resource "google_project_iam_member" "fp_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.fingerprint.email}"
}
resource "google_project_iam_member" "fp_bq" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.fingerprint.email}"
}
resource "google_project_iam_member" "fp_bq_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.fingerprint.email}"
}

# Monitor: Storage reader, Vision user, Firestore user, Pub/Sub publisher, BigQuery writer
resource "google_project_iam_member" "mon_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.monitor.email}"
}
resource "google_project_iam_member" "mon_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.monitor.email}"
}
resource "google_project_iam_member" "mon_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.monitor.email}"
}
resource "google_project_iam_member" "mon_bq" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.monitor.email}"
}
resource "google_project_iam_member" "mon_bq_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.monitor.email}"
}

# Risk Scoring: Firestore user, BigQuery writer, Pub/Sub publisher
resource "google_project_iam_member" "rs_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.risk_scoring.email}"
}
resource "google_project_iam_member" "rs_bq" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.risk_scoring.email}"
}
resource "google_project_iam_member" "rs_bq_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.risk_scoring.email}"
}
resource "google_project_iam_member" "rs_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.risk_scoring.email}"
}

# Enforcement: Firestore user, Storage admin, BigQuery writer, Pub/Sub publisher
resource "google_project_iam_member" "enf_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.enforcement.email}"
}
resource "google_project_iam_member" "enf_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.enforcement.email}"
}
resource "google_project_iam_member" "enf_bq" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.enforcement.email}"
}
resource "google_project_iam_member" "enf_bq_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.enforcement.email}"
}
resource "google_project_iam_member" "enf_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.enforcement.email}"
}

# ─────────────────────────────────────────────
# BigQuery Dataset + Tables
# ─────────────────────────────────────────────
resource "google_bigquery_dataset" "shieldip" {
  dataset_id = "shieldip_analytics"
  location   = var.region
}

resource "google_bigquery_table" "assets" {
  dataset_id = google_bigquery_dataset.shieldip.dataset_id
  table_id   = "assets"
  schema     = jsonencode([
    { name = "asset_id",      type = "STRING",    mode = "REQUIRED" },
    { name = "filename",      type = "STRING",    mode = "NULLABLE" },
    { name = "media_type",    type = "STRING",    mode = "NULLABLE" },
    { name = "phash",         type = "STRING",    mode = "NULLABLE" },
    { name = "registered_at", type = "TIMESTAMP", mode = "NULLABLE" }
  ])
  deletion_protection = false
}

resource "google_bigquery_table" "violations" {
  dataset_id = google_bigquery_dataset.shieldip.dataset_id
  table_id   = "violations"
  schema     = jsonencode([
    { name = "violation_id",      type = "STRING",    mode = "REQUIRED" },
    { name = "asset_id",          type = "STRING",    mode = "NULLABLE" },
    { name = "platform",          type = "STRING",    mode = "NULLABLE" },
    { name = "url",               type = "STRING",    mode = "NULLABLE" },
    { name = "region",            type = "STRING",    mode = "NULLABLE" },
    { name = "match_confidence",  type = "FLOAT64",   mode = "NULLABLE" },
    { name = "risk_score",        type = "INT64",     mode = "NULLABLE" },
    { name = "threat_level",      type = "STRING",    mode = "NULLABLE" },
    { name = "recommended_action",type = "STRING",    mode = "NULLABLE" },
    { name = "detected_at",       type = "TIMESTAMP", mode = "NULLABLE" },
    { name = "is_latest",         type = "BOOL",      mode = "NULLABLE" }
  ])
  deletion_protection = false
}

resource "google_bigquery_table" "enforcement_log" {
  dataset_id = google_bigquery_dataset.shieldip.dataset_id
  table_id   = "enforcement_log"
  schema     = jsonencode([
    { name = "enforcement_id", type = "STRING",    mode = "REQUIRED" },
    { name = "violation_id",   type = "STRING",    mode = "NULLABLE" },
    { name = "action",         type = "STRING",    mode = "NULLABLE" },
    { name = "status",         type = "STRING",    mode = "NULLABLE" },
    { name = "enforced_at",    type = "TIMESTAMP", mode = "NULLABLE" }
  ])
  deletion_protection = false
}

# ─────────────────────────────────────────────
# Cloud Tasks Queue
# ─────────────────────────────────────────────
resource "google_cloud_tasks_queue" "enforcement" {
  name     = "enforcement-actions"
  location = var.region

  retry_config {
    max_attempts       = 3
    min_backoff        = "1s"
    max_backoff        = "60s"
    max_doublings      = 3
  }

  rate_limits {
    max_dispatches_per_second = 10
    max_concurrent_dispatches = 5
  }
}

# ─────────────────────────────────────────────
# Cloud Run Services
# ─────────────────────────────────────────────
resource "google_cloud_run_v2_service" "api_gateway" {
  name     = "api-gateway-service"
  location = var.region

  template {
    service_account = google_service_account.api_gateway.email

    containers {
      image = var.api_gateway_image != "" ? var.api_gateway_image : local.default_image

      ports {
        container_port = 8080
      }

      dynamic "env" {
        for_each = local.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      env {
        name  = "ENFORCEMENT_SERVICE_URL"
        value = ""
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }
}

# Allow unauthenticated access to API Gateway only
resource "google_cloud_run_v2_service_iam_member" "api_gateway_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api_gateway.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service" "fingerprint" {
  name     = "fingerprint-service"
  location = var.region

  template {
    service_account = google_service_account.fingerprint.email

    containers {
      image = var.fingerprint_image != "" ? var.fingerprint_image : local.default_image

      ports {
        container_port = 8080
      }

      dynamic "env" {
        for_each = local.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }
}

resource "google_cloud_run_v2_service" "monitor" {
  name     = "monitor-service"
  location = var.region

  template {
    service_account = google_service_account.monitor.email

    containers {
      image = var.monitor_image != "" ? var.monitor_image : local.default_image

      ports {
        container_port = 8080
      }

      dynamic "env" {
        for_each = local.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }
}

resource "google_cloud_run_v2_service" "risk_scoring" {
  name     = "risk-scoring-service"
  location = var.region

  template {
    service_account = google_service_account.risk_scoring.email

    containers {
      image = var.risk_scoring_image != "" ? var.risk_scoring_image : local.default_image

      ports {
        container_port = 8080
      }

      dynamic "env" {
        for_each = local.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }
}

resource "google_cloud_run_v2_service" "enforcement" {
  name     = "enforcement-service"
  location = var.region

  template {
    service_account = google_service_account.enforcement.email

    containers {
      image = var.enforcement_image != "" ? var.enforcement_image : local.default_image

      ports {
        container_port = 8080
      }

      dynamic "env" {
        for_each = local.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }
}

# ─────────────────────────────────────────────
# Cloud Run IAM — internal services require auth
# ─────────────────────────────────────────────
resource "google_cloud_run_v2_service_iam_member" "fingerprint_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.fingerprint.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.fingerprint.email}"
}

resource "google_cloud_run_v2_service_iam_member" "monitor_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.monitor.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.monitor.email}"
}

resource "google_cloud_run_v2_service_iam_member" "risk_scoring_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.risk_scoring.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.risk_scoring.email}"
}

resource "google_cloud_run_v2_service_iam_member" "enforcement_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.enforcement.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.enforcement.email}"
}

# Allow Pub/Sub SA to invoke internal services
data "google_project" "current" {}

resource "google_project_iam_member" "pubsub_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# ─────────────────────────────────────────────
# Pub/Sub Push Subscriptions
# ─────────────────────────────────────────────
resource "google_pubsub_subscription" "asset_registered_sub" {
  name  = "asset-registered-fingerprint-push"
  topic = google_pubsub_topic.asset_registered.id

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.fingerprint.uri}/pubsub"
    oidc_token {
      service_account_email = google_service_account.fingerprint.email
    }
  }

  ack_deadline_seconds = 60
}

resource "google_pubsub_subscription" "fingerprint_ready_sub" {
  name  = "fingerprint-ready-monitor-push"
  topic = google_pubsub_topic.fingerprint_ready.id

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.monitor.uri}/pubsub"
    oidc_token {
      service_account_email = google_service_account.monitor.email
    }
  }

  ack_deadline_seconds = 60
}

resource "google_pubsub_subscription" "monitoring_tick_sub" {
  name  = "monitoring-tick-monitor-push"
  topic = google_pubsub_topic.monitoring_tick.id

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.monitor.uri}/pubsub"
    oidc_token {
      service_account_email = google_service_account.monitor.email
    }
  }

  ack_deadline_seconds = 60
}

resource "google_pubsub_subscription" "violation_detected_sub" {
  name  = "violation-detected-risk-scoring-push"
  topic = google_pubsub_topic.violation_detected.id

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.risk_scoring.uri}/pubsub"
    oidc_token {
      service_account_email = google_service_account.risk_scoring.email
    }
  }

  ack_deadline_seconds = 120
}

# ─────────────────────────────────────────────
# Cloud Scheduler — triggers monitoring every 2 min
# ─────────────────────────────────────────────
resource "google_cloud_scheduler_job" "monitoring_tick" {
  name     = "shieldip-monitoring-tick"
  schedule = "*/2 * * * *"
  time_zone = "UTC"

  pubsub_target {
    topic_name = google_pubsub_topic.monitoring_tick.id
    data       = base64encode("{\"trigger\":\"scheduler\",\"timestamp\":\"${timestamp()}\"}")
  }
}
