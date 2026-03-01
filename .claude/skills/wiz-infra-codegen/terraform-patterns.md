# Terraform Patterns for GCP

Canonical HCL blocks for every GCP resource the skill generates. Each block includes inline comments showing which IRS/cost-estimate fields map to which arguments.

---

## Provider and Backend

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# backend.tf
# IMPORTANT: Create this bucket before running terraform init:
#   gcloud storage buckets create gs://<project-name>-tfstate --location=us-central1
terraform {
  backend "gcs" {
    bucket = "<project-name>-tfstate"  # Replace with actual project name
    prefix = "terraform/state"
  }
}

# provider block in main.tf
provider "google" {
  project = var.project_id
  region  = var.region
}
```

---

## API Enablement

```hcl
# apis.tf — enable all required GCP APIs
# Include only the APIs needed based on detected services

resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "sqladmin" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "redis" {
  service            = "redis.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "compute" {
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "vpcaccess" {
  service            = "vpcaccess.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secretmanager" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "servicenetworking" {
  service            = "servicenetworking.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "pubsub" {
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "dns" {
  service            = "dns.googleapis.com"
  disable_on_destroy = false
}
```

---

## Networking (VPC + Connector + NAT)

Supports multi-region deployments. Pass a `regions` map (e.g., `{ primary = "us-central1", secondary = "us-east1" }`) and the module creates per-region subnets, VPC connectors, routers, and NAT gateways.

```hcl
# modules/networking/main.tf

locals {
  # Each VPC connector needs a unique /28 CIDR
  connector_cidrs = {
    for idx, key in keys(var.regions) :
    key => cidrsubnet("10.8.0.0/24", 4, idx)
  }
}

resource "google_compute_network" "vpc" {
  name                    = "${var.project_name}-vpc"
  auto_create_subnetworks = false
}

# One private subnet per region
resource "google_compute_subnetwork" "private" {
  for_each = var.regions

  name          = "${var.project_name}-private-${each.key}"
  ip_cidr_range = cidrsubnet("10.0.0.0/16", 4, index(keys(var.regions), each.key))
  region        = each.value
  network       = google_compute_network.vpc.id

  private_ip_google_access = true
}

# One VPC access connector per region (required for Cloud Run → private resources)
resource "google_vpc_access_connector" "connector" {
  for_each = var.regions

  name          = "${var.project_name}-vpc-cx-${each.key}"
  region        = each.value
  ip_cidr_range = local.connector_cidrs[each.key]
  network       = google_compute_network.vpc.id

  min_instances = 2
  max_instances = 3
}

# Cloud NAT router (one per region for egress)
resource "google_compute_router" "router" {
  for_each = var.regions

  name    = "${var.project_name}-router-${each.key}"
  region  = each.value
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  for_each = var.regions

  name                               = "${var.project_name}-nat-${each.key}"
  router                             = google_compute_router.router[each.key].name
  region                             = each.value
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
```

**Variables:**
```hcl
variable "project_name" {
  type        = string
  description = "Project name for resource naming"
}

variable "regions" {
  type        = map(string)
  description = "Map of region key to region name (e.g., { primary = \"us-central1\", secondary = \"us-east1\" })"
}

variable "labels" {
  type        = map(string)
  description = "Resource labels"
  default     = {}
}
```

**Outputs:**
```hcl
output "vpc_id" {
  value = google_compute_network.vpc.id
}

output "vpc_name" {
  value = google_compute_network.vpc.name
}

output "subnet_ids" {
  value = { for k, s in google_compute_subnetwork.private : k => s.id }
}

output "vpc_connector_ids" {
  value = { for k, c in google_vpc_access_connector.connector : k => c.id }
}
```

**Usage in root main.tf:**
```hcl
module "networking" {
  source = "./modules/networking"

  project_name = var.project_name
  regions = {
    primary   = var.primary_region
    secondary = var.secondary_region
  }
  labels = local.labels
}

# Reference connectors by region key:
# module.networking.vpc_connector_ids["primary"]
# module.networking.vpc_connector_ids["secondary"]
```

---

## Cloud Run v2 Service

```hcl
# modules/cloud-run/main.tf
# Reusable module — called once per service from root main.tf

resource "google_cloud_run_v2_service" "service" {
  name     = var.service_name
  location = var.region
  ingress  = var.ingress  # "INGRESS_TRAFFIC_ALL" for frontend, "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER" if behind LB

  template {
    scaling {
      min_instance_count = var.min_instances  # From cost estimate: min=N
      max_instance_count = var.max_instances  # Default 10, or from cost estimate: max=N
    }

    dynamic "vpc_access" {
      for_each = var.vpc_connector_id != "" ? [1] : []
      content {
        connector = var.vpc_connector_id
        egress    = "PRIVATE_RANGES_ONLY"
      }
    }

    service_account = var.service_account_email

    containers {
      image = var.image  # e.g., "${artifact_registry_url}/${image_name}:${image_tag}"

      resources {
        limits = {
          cpu    = var.cpu     # From cost estimate: "1" for 1 vCPU, "0.5" for 0.5 vCPU
          memory = var.memory  # From cost estimate: "512Mi" for 512 MB, "1Gi" for 1 GB
        }
        cpu_idle          = var.min_instances == 0  # Allow CPU throttling when idle if scale-to-zero
        startup_cpu_boost = true
      }

      # Static environment variables
      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secret environment variables (from Secret Manager)
      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      ports {
        container_port = var.container_port  # Default 8080
      }
    }
  }

  labels = var.labels

  # When CI/CD manages image deployments, add this lifecycle block to prevent
  # Terraform from reverting the image after CI/CD deploys a new version.
  # Only include this when the cicd module is part of the project.
  # lifecycle {
  #   ignore_changes = [template[0].containers[0].image]
  # }
}

# Public access (for frontend services)
resource "google_cloud_run_v2_service_iam_member" "public" {
  count = var.allow_public_access ? 1 : 0

  location = google_cloud_run_v2_service.service.location
  name     = google_cloud_run_v2_service.service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

**Variables:**
```hcl
variable "service_name" {
  type = string
}

variable "region" {
  type = string
}

variable "image" {
  type = string
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "512Mi"
}

variable "min_instances" {
  type    = number
  default = 1
}

variable "max_instances" {
  type    = number
  default = 10
}

variable "container_port" {
  type    = number
  default = 8080
}

variable "service_account_email" {
  type = string
}

variable "vpc_connector_id" {
  type    = string
  default = ""
}

variable "ingress" {
  type    = string
  default = "INGRESS_TRAFFIC_ALL"
}

variable "allow_public_access" {
  type    = bool
  default = false
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "secret_env_vars" {
  type    = map(string)
  default = {}
}

variable "labels" {
  type    = map(string)
  default = {}
}
```

**Outputs:**
```hcl
output "service_url" {
  value = google_cloud_run_v2_service.service.uri
}

output "service_name" {
  value = google_cloud_run_v2_service.service.name
}
```

---

## Cloud SQL (PostgreSQL / MySQL)

```hcl
# modules/cloud-sql/main.tf

# Private IP allocation for Cloud SQL
resource "google_compute_global_address" "db_private_ip" {
  name          = "${var.project_name}-db-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = var.vpc_id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = var.vpc_id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.db_private_ip.name]
}

resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-db"
  database_version = var.db_version  # e.g., "POSTGRES_16" from IRS Data table
  region           = var.region

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier              = var.db_tier       # From cost estimate: "db-g1-small", "db-f1-micro", etc.
    disk_size         = var.db_disk_size  # From cost estimate: 10, 20, 50, etc. (in GB)
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    availability_type = var.ha ? "REGIONAL" : "ZONAL"  # From cost estimate: "HA" token

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.ha
      start_time                     = "03:00"
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
      }
    }

    ip_configuration {
      ipv4_enabled    = false  # Always private — no public IP
      private_network = var.vpc_id
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 4  # 4 AM
      update_track = "stable"
    }

    user_labels = var.labels
  }

  deletion_protection = var.environment == "production"
}

resource "google_sql_database" "app" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = var.database_user
  instance = google_sql_database_instance.main.name
  password = var.database_password  # Should come from Secret Manager or be set manually
}
```

**Variables:**
```hcl
variable "project_name" {
  type = string
}

variable "region" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "db_version" {
  type    = string
  default = "POSTGRES_16"
}

variable "db_tier" {
  type = string  # e.g., "db-g1-small"
}

variable "db_disk_size" {
  type = number  # in GB
}

variable "ha" {
  type    = bool
  default = false
}

variable "database_name" {
  type    = string
  default = "app"
}

variable "database_user" {
  type    = string
  default = "app"
}

variable "database_password" {
  type      = string
  sensitive = true
}

variable "labels" {
  type    = map(string)
  default = {}
}
```

**Outputs:**
```hcl
output "connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "private_ip" {
  value = google_sql_database_instance.main.private_ip_address
}

output "database_name" {
  value = google_sql_database.app.name
}

output "instance_name" {
  value = google_sql_database_instance.main.name
}
```

---

## Memorystore Redis

```hcl
# modules/memorystore/main.tf

resource "google_redis_instance" "cache" {
  name               = "${var.project_name}-redis"
  tier               = var.redis_tier      # From cost estimate: "BASIC" or "STANDARD_HA"
  memory_size_gb     = var.redis_size_gb   # From cost estimate: 1, 2, 5, etc.
  region             = var.region
  authorized_network = var.vpc_id

  redis_version = "REDIS_7_0"

  labels = var.labels
}
```

**Variables:**
```hcl
variable "project_name" {
  type = string
}

variable "region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "redis_tier" {
  type    = string
  default = "BASIC"
}

variable "redis_size_gb" {
  type    = number
  default = 1
}

variable "labels" {
  type    = map(string)
  default = {}
}
```

**Outputs:**
```hcl
output "host" {
  value = google_redis_instance.cache.host
}

output "port" {
  value = google_redis_instance.cache.port
}
```

---

## Cloud Storage

```hcl
# modules/storage/main.tf

resource "google_storage_bucket" "main" {
  name          = "${var.project_name}-${var.environment}-storage"
  location      = var.region
  storage_class = var.storage_class  # From cost estimate: "STANDARD", "NEARLINE", etc.
  force_destroy = var.environment != "production"

  uniform_bucket_level_access = true

  versioning {
    enabled = var.environment == "production"
  }

  # CORS for user uploads (if applicable)
  dynamic "cors" {
    for_each = var.enable_cors ? [1] : []
    content {
      origin          = var.cors_origins
      method          = ["GET", "PUT", "POST", "DELETE"]
      response_header = ["Content-Type", "Content-Disposition"]
      max_age_seconds = 3600
    }
  }

  # Lifecycle rule to move old objects to cheaper storage
  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_age_days > 0 ? [1] : []
    content {
      action {
        type          = "SetStorageClass"
        storage_class = "NEARLINE"
      }
      condition {
        age = var.lifecycle_age_days
      }
    }
  }

  labels = var.labels
}
```

**Variables:**
```hcl
variable "project_name" {
  type = string
}

variable "region" {
  type = string
}

variable "environment" {
  type = string
}

variable "storage_class" {
  type    = string
  default = "STANDARD"
}

variable "enable_cors" {
  type    = bool
  default = false
}

variable "cors_origins" {
  type    = list(string)
  default = ["*"]
}

variable "lifecycle_age_days" {
  type    = number
  default = 0
}

variable "labels" {
  type    = map(string)
  default = {}
}
```

**Outputs:**
```hcl
output "bucket_name" {
  value = google_storage_bucket.main.name
}

output "bucket_url" {
  value = google_storage_bucket.main.url
}
```

---

## Global HTTPS Load Balancer (Multi-Region)

For multi-region HA, the load balancer uses one serverless NEG per region. For single-region or CDN use, use the same pattern with one entry in `cloud_run_services`.

```hcl
# modules/load-balancer/main.tf

# Static IP
resource "google_compute_global_address" "lb_ip" {
  name = "${var.project_name}-lb-ip"
}

# Managed SSL certificate (only if domain provided)
resource "google_compute_managed_ssl_certificate" "cert" {
  count = var.domain != "" ? 1 : 0
  name  = "${var.project_name}-ssl-cert"

  managed {
    domains = [var.domain]
  }
}

# One serverless NEG per region
resource "google_compute_region_network_endpoint_group" "neg" {
  for_each = var.cloud_run_services

  name                  = "${var.project_name}-neg-${each.key}"
  region                = each.value.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = each.value.service_name
  }
}

# Backend service with all NEGs
resource "google_compute_backend_service" "default" {
  name                  = "${var.project_name}-api-backend"
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  dynamic "backend" {
    for_each = google_compute_region_network_endpoint_group.neg
    content {
      group = backend.value.id
    }
  }

  # Enable CDN only if var.enable_cdn is true
  enable_cdn = var.enable_cdn

  dynamic "cdn_policy" {
    for_each = var.enable_cdn ? [1] : []
    content {
      cache_mode                   = "CACHE_ALL_STATIC"
      default_ttl                  = 3600
      max_ttl                      = 86400
      signed_url_cache_max_age_sec = 0
    }
  }
}

# URL map
resource "google_compute_url_map" "default" {
  name            = "${var.project_name}-url-map"
  default_service = google_compute_backend_service.default.id
}

# HTTPS proxy (only if domain provided)
resource "google_compute_target_https_proxy" "default" {
  count = var.domain != "" ? 1 : 0

  name             = "${var.project_name}-https-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.cert[0].id]
}

# HTTPS forwarding rule (only if domain provided)
resource "google_compute_global_forwarding_rule" "https" {
  count = var.domain != "" ? 1 : 0

  name                  = "${var.project_name}-https"
  target                = google_compute_target_https_proxy.default[0].id
  port_range            = "443"
  ip_address            = google_compute_global_address.lb_ip.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# HTTP proxy — serves traffic directly (no domain) or redirects to HTTPS (with domain)
resource "google_compute_target_http_proxy" "default" {
  name    = "${var.project_name}-http-proxy"
  url_map = var.domain != "" ? google_compute_url_map.http_redirect[0].id : google_compute_url_map.default.id
}

# HTTP forwarding rule
resource "google_compute_global_forwarding_rule" "http" {
  name                  = "${var.project_name}-http"
  target                = google_compute_target_http_proxy.default.id
  port_range            = "80"
  ip_address            = google_compute_global_address.lb_ip.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# HTTP-to-HTTPS redirect (only if domain provided)
resource "google_compute_url_map" "http_redirect" {
  count = var.domain != "" ? 1 : 0

  name = "${var.project_name}-http-redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

```

**Variables:**
```hcl
variable "project_name" {
  type = string
}

variable "domain" {
  type    = string
  default = ""
}

variable "enable_cdn" {
  type    = bool
  default = false
}

variable "cloud_run_services" {
  type = map(object({
    region       = string
    service_name = string
  }))
  description = "Map of Cloud Run services to load balance (e.g., { primary = { region = \"us-central1\", service_name = \"myapp-api\" } })"
}
```

**Outputs:**
```hcl
output "lb_ip" {
  value = google_compute_global_address.lb_ip.address
}

output "lb_ip_name" {
  value = google_compute_global_address.lb_ip.name
}
```

**Usage in root main.tf:**
```hcl
module "load_balancer" {
  source = "./modules/load-balancer"

  project_name = var.project_name
  domain       = var.domain

  cloud_run_services = {
    primary = {
      region       = var.primary_region
      service_name = module.api_primary.service_name
    }
    secondary = {
      region       = var.secondary_region
      service_name = module.api_secondary.service_name
    }
  }
}
```

---

## IAM (Service Accounts + Bindings)

```hcl
# modules/iam/main.tf

# Create a service account for each Cloud Run service
resource "google_service_account" "service" {
  for_each = var.services

  account_id   = "${var.project_name}-${each.key}"
  display_name = "${var.project_name} ${each.key} service account"
}

# Assign roles to each service account
resource "google_project_iam_member" "service_roles" {
  for_each = {
    for binding in local.iam_bindings : "${binding.service}-${binding.role}" => binding
  }

  project = var.project_id
  role    = each.value.role
  member  = "serviceAccount:${google_service_account.service[each.value.service].email}"
}

locals {
  # Flatten the services map into individual role bindings
  iam_bindings = flatten([
    for service_name, config in var.services : [
      for role in config.roles : {
        service = service_name
        role    = role
      }
    ]
  ])
}
```

**Variables:**
```hcl
variable "project_id" {
  type = string
}

variable "project_name" {
  type = string
}

variable "services" {
  type = map(object({
    roles = list(string)
  }))
  # Example:
  # {
  #   frontend = { roles = [] }
  #   backend  = { roles = ["roles/cloudsql.client", "roles/storage.objectAdmin"] }
  #   worker   = { roles = ["roles/cloudsql.client", "roles/pubsub.subscriber"] }
  # }
}
```

**Outputs:**
```hcl
output "service_account_emails" {
  value = { for k, sa in google_service_account.service : k => sa.email }
}
```

---

## CI/CD (Artifact Registry + Cloud Build)

```hcl
# modules/cicd/main.tf

resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "${var.project_name}-docker"
  format        = "DOCKER"
  description   = "Docker images for ${var.project_name}"

  labels = var.labels
}

# Cloud Build trigger per service
resource "google_cloudbuild_trigger" "service" {
  for_each = var.services

  name     = "${var.project_name}-${each.key}-deploy"
  location = var.region

  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = var.trigger_branch
    }
  }

  included_files = each.value.included_files

  build {
    # IMPORTANT: Use each.value.cloud_run_service_name (not each.key) as the image name.
    # This ensures the image name in Artifact Registry matches what Cloud Run expects.
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}/${each.value.cloud_run_service_name}:$COMMIT_SHA",
        "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}/${each.value.cloud_run_service_name}:latest",
        "-f", each.value.dockerfile,
        each.value.context,
      ]
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "--all-tags",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}/${each.value.cloud_run_service_name}",
      ]
    }

    step {
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk"
      entrypoint = "gcloud"
      args = [
        "run", "deploy", each.value.cloud_run_service_name,
        "--image", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}/${each.value.cloud_run_service_name}:$COMMIT_SHA",
        "--region", each.value.deploy_region,
      ]
    }

    options {
      logging = "CLOUD_LOGGING_ONLY"
    }
  }
}
```

**Variables:**
```hcl
variable "project_id" {
  type = string
}

variable "project_name" {
  type = string
}

variable "region" {
  type = string
}

variable "github_owner" {
  type = string
}

variable "github_repo" {
  type = string
}

variable "trigger_branch" {
  type    = string
  default = "^main$"
}

variable "labels" {
  type    = map(string)
  default = {}
}

variable "services" {
  type = map(object({
    dockerfile             = string
    context                = string
    included_files         = list(string)
    cloud_run_service_name = string
    deploy_region          = string
  }))
  # Example:
  # {
  #   frontend = {
  #     dockerfile             = "apps/frontend/Dockerfile"
  #     context                = "."
  #     included_files         = ["apps/frontend/**"]
  #     cloud_run_service_name = "myapp-frontend"
  #   }
  # }
}
```

**Outputs:**
```hcl
output "artifact_registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

output "repository_id" {
  value = google_artifact_registry_repository.docker.repository_id
}

output "trigger_ids" {
  value = { for k, t in google_cloudbuild_trigger.service : k => t.id }
}
```

---

## Cloud Scheduler (Cron Jobs)

```hcl
# Use when Background Processing table shows cron jobs

resource "google_cloud_scheduler_job" "cron" {
  for_each = var.cron_jobs

  name      = "${var.project_name}-${each.key}"
  schedule  = each.value.schedule   # e.g., "0 3 * * *" for daily at 3 AM
  time_zone = "UTC"
  region    = var.region

  http_target {
    uri         = each.value.target_url
    http_method = "POST"

    oidc_token {
      service_account_email = each.value.service_account_email
    }
  }
}
```

---

## Pub/Sub (Message Queues)

```hcl
# Use when Background Processing table shows queue-based jobs

resource "google_pubsub_topic" "topic" {
  for_each = var.topics

  name   = "${var.project_name}-${each.key}"
  labels = var.labels
}

resource "google_pubsub_subscription" "sub" {
  for_each = var.topics

  name  = "${var.project_name}-${each.key}-sub"
  topic = google_pubsub_topic.topic[each.key].id

  push_config {
    push_endpoint = each.value.push_endpoint

    oidc_token {
      service_account_email = each.value.service_account_email
      audience              = each.value.push_endpoint
    }
  }

  ack_deadline_seconds = 60

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}
```

---

## Secret Manager

```hcl
# For sensitive environment variables referenced by Cloud Run services

resource "google_secret_manager_secret" "secret" {
  for_each = var.secrets

  secret_id = each.key

  replication {
    auto {}
  }

  labels = var.labels
}

# Grant Cloud Run service accounts access to their secrets
resource "google_secret_manager_secret_iam_member" "accessor" {
  for_each = var.secret_accessors

  secret_id = google_secret_manager_secret.secret[each.value.secret].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value.service_account_email}"
}
```

---

## Common Labels Pattern

Every resource should include this labels block:

```hcl
labels = {
  project     = var.project_name
  environment = var.environment
  managed-by  = "terraform"
}
```

Pass these as a `var.labels` map from root to all modules.
