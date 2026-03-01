# Provider Registry

Maps provider-agnostic IRS service categories to cloud-specific Terraform resources. Use this to determine which Terraform resource blocks to generate for the target cloud provider.

---

## GCP (Fully Supported)

| IRS Category | GCP Service | Terraform Resource | Provider |
|---|---|---|---|
| HTTP Server / SSR frontend | Cloud Run | `google_cloud_run_v2_service` | `hashicorp/google ~> 5.0` |
| SPA / SSG frontend | Firebase Hosting | `google_firebase_hosting_site` | `hashicorp/google ~> 5.0` |
| Queue consumer / Worker | Cloud Run | `google_cloud_run_v2_service` | `hashicorp/google ~> 5.0` |
| Cron job | Cloud Scheduler → Cloud Run | `google_cloud_scheduler_job` | `hashicorp/google ~> 5.0` |
| Relational DB (PostgreSQL) | Cloud SQL | `google_sql_database_instance` | `hashicorp/google ~> 5.0` |
| Relational DB (MySQL) | Cloud SQL | `google_sql_database_instance` | `hashicorp/google ~> 5.0` |
| Key-value cache (Redis) | Memorystore | `google_redis_instance` | `hashicorp/google ~> 5.0` |
| Object / file storage | Cloud Storage | `google_storage_bucket` | `hashicorp/google ~> 5.0` |
| CDN | Cloud CDN | `google_compute_backend_service` (cdn_policy) | `hashicorp/google ~> 5.0` |
| Load Balancer (HTTPS) | Cloud Load Balancing | `google_compute_global_forwarding_rule` | `hashicorp/google ~> 5.0` |
| Message queue | Pub/Sub | `google_pubsub_topic` + `google_pubsub_subscription` | `hashicorp/google ~> 5.0` |
| CI/CD (build) | Cloud Build | `google_cloudbuild_trigger` | `hashicorp/google ~> 5.0` |
| CI/CD (registry) | Artifact Registry | `google_artifact_registry_repository` | `hashicorp/google ~> 5.0` |
| IAM (service accounts) | IAM | `google_service_account` + `google_project_iam_member` | `hashicorp/google ~> 5.0` |
| Secrets | Secret Manager | `google_secret_manager_secret` | `hashicorp/google ~> 5.0` |
| VPC / Networking | VPC | `google_compute_network` + `google_compute_subnetwork` | `hashicorp/google ~> 5.0` |
| Serverless VPC connector | VPC Access | `google_vpc_access_connector` | `hashicorp/google ~> 5.0` |
| DNS | Cloud DNS | `google_dns_managed_zone` + `google_dns_record_set` | `hashicorp/google ~> 5.0` |

### GCP Backend Configuration

```hcl
terraform {
  backend "gcs" {
    bucket = "<project-name>-tfstate"
    prefix = "terraform/state"
  }
}
```

### GCP Required APIs

Map of IRS categories to GCP APIs that must be enabled:

| IRS Category | GCP API |
|---|---|
| HTTP Server / SSR / Worker | `run.googleapis.com` |
| Relational DB | `sqladmin.googleapis.com` |
| Redis cache | `redis.googleapis.com` |
| CDN / Load Balancer | `compute.googleapis.com` |
| VPC connector | `vpcaccess.googleapis.com` |
| CI/CD (build) | `cloudbuild.googleapis.com` |
| CI/CD (registry) | `artifactregistry.googleapis.com` |
| Secrets | `secretmanager.googleapis.com` |
| Private DB networking | `servicenetworking.googleapis.com` |
| Message queue | `pubsub.googleapis.com` |

---

## AWS (Placeholder — Future Support)

When an `aws-cost-estimate` skill is added, this section provides the mapping template.

| IRS Category | AWS Service | Terraform Resource | Provider |
|---|---|---|---|
| HTTP Server / SSR frontend | ECS Fargate | `aws_ecs_service` + `aws_ecs_task_definition` | `hashicorp/aws ~> 5.0` |
| SPA / SSG frontend | S3 + CloudFront | `aws_s3_bucket` + `aws_cloudfront_distribution` | `hashicorp/aws ~> 5.0` |
| Queue consumer / Worker | ECS Fargate | `aws_ecs_service` | `hashicorp/aws ~> 5.0` |
| Cron job | EventBridge + ECS | `aws_scheduler_schedule` | `hashicorp/aws ~> 5.0` |
| Relational DB (PostgreSQL) | RDS | `aws_db_instance` | `hashicorp/aws ~> 5.0` |
| Relational DB (MySQL) | RDS | `aws_db_instance` | `hashicorp/aws ~> 5.0` |
| Key-value cache (Redis) | ElastiCache | `aws_elasticache_replication_group` | `hashicorp/aws ~> 5.0` |
| Object / file storage | S3 | `aws_s3_bucket` | `hashicorp/aws ~> 5.0` |
| CDN | CloudFront | `aws_cloudfront_distribution` | `hashicorp/aws ~> 5.0` |
| Load Balancer (HTTPS) | ALB | `aws_lb` + `aws_lb_listener` | `hashicorp/aws ~> 5.0` |
| Message queue | SQS / SNS | `aws_sqs_queue` / `aws_sns_topic` | `hashicorp/aws ~> 5.0` |
| CI/CD (build) | CodeBuild | `aws_codebuild_project` | `hashicorp/aws ~> 5.0` |
| CI/CD (registry) | ECR | `aws_ecr_repository` | `hashicorp/aws ~> 5.0` |
| IAM | IAM | `aws_iam_role` + `aws_iam_role_policy_attachment` | `hashicorp/aws ~> 5.0` |
| Secrets | Secrets Manager | `aws_secretsmanager_secret` | `hashicorp/aws ~> 5.0` |
| VPC / Networking | VPC | `aws_vpc` + `aws_subnet` | `hashicorp/aws ~> 5.0` |

### AWS Backend Configuration

```hcl
terraform {
  backend "s3" {
    bucket         = "<project-name>-tfstate"
    key            = "terraform/state/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "<project-name>-tflock"
    encrypt        = true
  }
}
```

---

## Azure (Placeholder — Future Support)

| IRS Category | Azure Service | Terraform Resource | Provider |
|---|---|---|---|
| HTTP Server / SSR frontend | Container Apps | `azurerm_container_app` | `hashicorp/azurerm ~> 4.0` |
| SPA / SSG frontend | Static Web Apps | `azurerm_static_web_app` | `hashicorp/azurerm ~> 4.0` |
| Queue consumer / Worker | Container Apps | `azurerm_container_app` | `hashicorp/azurerm ~> 4.0` |
| Cron job | Logic Apps / Functions | `azurerm_logic_app_workflow` | `hashicorp/azurerm ~> 4.0` |
| Relational DB (PostgreSQL) | PostgreSQL Flexible | `azurerm_postgresql_flexible_server` | `hashicorp/azurerm ~> 4.0` |
| Relational DB (MySQL) | MySQL Flexible | `azurerm_mysql_flexible_server` | `hashicorp/azurerm ~> 4.0` |
| Key-value cache (Redis) | Azure Cache for Redis | `azurerm_redis_cache` | `hashicorp/azurerm ~> 4.0` |
| Object / file storage | Blob Storage | `azurerm_storage_account` + `azurerm_storage_container` | `hashicorp/azurerm ~> 4.0` |
| CDN | Azure CDN / Front Door | `azurerm_cdn_frontdoor_profile` | `hashicorp/azurerm ~> 4.0` |
| Load Balancer (HTTPS) | Application Gateway | `azurerm_application_gateway` | `hashicorp/azurerm ~> 4.0` |
| Message queue | Service Bus | `azurerm_servicebus_namespace` | `hashicorp/azurerm ~> 4.0` |
| CI/CD | Azure DevOps / ACR | `azurerm_container_registry` | `hashicorp/azurerm ~> 4.0` |
| IAM | Managed Identity | `azurerm_user_assigned_identity` | `hashicorp/azurerm ~> 4.0` |
| Secrets | Key Vault | `azurerm_key_vault` | `hashicorp/azurerm ~> 4.0` |
| VPC / Networking | Virtual Network | `azurerm_virtual_network` + `azurerm_subnet` | `hashicorp/azurerm ~> 4.0` |

### Azure Backend Configuration

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "<project-name>-rg"
    storage_account_name = "<project>tfstate"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}
```

---

## Adding a New Provider

To add full support for a new cloud provider:

1. Create a new cost estimate skill: `.claude/skills/<provider>-cost-estimate/SKILL.md`
2. Fill in the full resource mapping table in this file (replace placeholders)
3. Add canonical HCL blocks to `terraform-patterns.md` under a new `## <Provider>` section
4. Update the `infra-codegen` SKILL.md Step 1 to recognize the new provider keyword
