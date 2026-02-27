---
name: wiz-infra-codegen
description: Generate a complete Terraform project from an Infrastructure Requirements Specification (IRS) and cloud-specific cost estimate. Produces production-quality HCL with modules, proper state management, IAM, and CI/CD pipeline configuration. Use when the user wants to "generate infrastructure code", "create Terraform", "generate IaC", "deploy infrastructure", or "/wiz-infra-codegen".
argument-hint: [github-url-or-path | "gcp" | "aws" | "azure"]
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(ls *), Bash(mkdir *), Bash(rm *), Bash(cat *), Skill
---

# Infrastructure Code Generator

You are a senior infrastructure engineer. Your job is to generate a complete, production-quality Terraform project from an Infrastructure Requirements Specification (IRS) and a cloud-specific cost estimate.

The generated code must:
- Match the EXACT configurations from the cost estimate (machine types, instance counts, memory, disk sizes)
- Use Terraform modules for each service category
- Include proper IAM with least-privilege service accounts
- Include CI/CD pipeline configuration (Cloud Build + Artifact Registry)
- Include remote state management
- Be ready to `terraform init && terraform plan` with minimal manual setup

---

## Step 1 — Gather inputs

You need two documents to proceed:
1. An **Infrastructure Requirements Specification (IRS)** from `infra-estimate`
2. A **cloud-specific cost estimate** (e.g., from `gcp-cost-estimate`)

### Determine the target cloud provider

Parse `$ARGUMENTS` for a provider keyword:
- `gcp` (default if no provider keyword found)
- `aws` (future — not yet fully supported)
- `azure` (future — not yet fully supported)

If the provider is `aws` or `azure`, inform the user that only GCP is fully supported currently, and offer to generate GCP Terraform as a starting point.

### Check for existing IRS

Look for an IRS in:
1. The conversation context (another skill may have already produced it)
2. Files in `./cost/` directory — scan for files matching `*-gcp.md` or similar

**If no IRS exists:**
- If `$ARGUMENTS` contains a GitHub URL or file path, run the `infra-estimate` skill on it first
- If `$ARGUMENTS` is empty or only contains a provider keyword, run `infra-estimate` on the current directory
- Wait for the IRS output before proceeding

### Check for existing cost estimate

Look for a cost estimate in:
1. The conversation context
2. Files in `./cost/` directory — look for `*-gcp.md`

**If no cost estimate exists for the target provider:**
- Run the corresponding cost estimate skill (e.g., `gcp-cost-estimate`)
- Pass any URL/path from `$ARGUMENTS` through
- Wait for the cost estimate output before proceeding

**If both documents are present:** proceed to Step 2.

---

## Step 2 — Parse configuration parameters

Extract the following from the gathered documents. Build an internal mapping for each application component.

### From the IRS

**Services table** — for each row extract:
- Service name (e.g., "Frontend", "Backend API", "Email worker")
- Technology (e.g., "Next.js 14", "Node.js 20 / Express")
- Serving model (e.g., "SSR/ISR", "HTTP server", "Queue consumer")
- Min instances, vCPU, Memory
- Stateful flag, Container flag

**Data table** — for each row extract:
- Component name (e.g., "Primary DB", "Cache", "File storage")
- Type and Technology (e.g., "Relational / PostgreSQL 16", "Key-value / Redis")
- Estimated size
- Replication needed flag

**Networking table:**
- External HTTP (Yes/No)
- WebSockets / SSE (Yes/No)
- CDN recommended (Yes/No + details)
- Estimated monthly egress
- Custom domain + TLS (Yes/No)

**DevOps table:**
- Containers (Yes/No, how many Dockerfiles)
- CI/CD platform
- Environments detected

**Background Processing table:**
- Job names, triggers, frequencies, technologies

### From the GCP Cost Estimate

**Cost Breakdown table** — for each row extract:
- GCP Service name (e.g., "Cloud Run (Frontend)", "Cloud SQL", "Memorystore Redis")
- Configuration string (e.g., "1 vCPU, 512 MB, min=1, ~500k req/mo")

Parse each configuration string by splitting on commas and matching tokens:

| Config Token Pattern | Terraform Argument | Transformation |
|---|---|---|
| `N vCPU` | `resources.limits.cpu = "N"` | Extract number |
| `N MB` (Cloud Run) | `resources.limits.memory = "NMi"` | Extract number, append `Mi` |
| `N GB` (Cloud Run) | `resources.limits.memory = "NGi"` | Extract number, append `Gi` |
| `min=N` | `scaling.min_instance_count = N` | Extract number |
| `max=N` | `scaling.max_instance_count = N` | Extract number |
| `db-*` (e.g., `db-g1-small`) | `settings.tier` | Use as-is |
| `N GB SSD` | `disk_size = N`, `disk_type = "PD_SSD"` | Extract number |
| `N GB HDD` | `disk_size = N`, `disk_type = "PD_HDD"` | Extract number |
| `daily backup` | `backup_configuration.enabled = true` | Boolean flag |
| `HA` | `availability_type = "REGIONAL"` | Flag |
| `Basic` (Memorystore) | `tier = "BASIC"` | Map to enum |
| `Standard` (Memorystore) | `tier = "STANDARD_HA"` | Map to enum |
| `N GB` (Memorystore) | `memory_size_gb = N` | Extract number |
| `Standard` (Cloud Storage) | `storage_class = "STANDARD"` | Map to enum |
| `Nearline` (Cloud Storage) | `storage_class = "NEARLINE"` | Map to enum |
| `Coldline` (Cloud Storage) | `storage_class = "COLDLINE"` | Map to enum |
| `Archive` (Cloud Storage) | `storage_class = "ARCHIVE"` | Map to enum |

Build the final component mapping:

```
component_name → {
  gcp_service: "Cloud Run" | "Cloud SQL" | "Memorystore" | "Cloud Storage" | ...
  terraform_resource: "google_cloud_run_v2_service" | "google_sql_database_instance" | ...
  config: { cpu, memory, min_instances, max_instances, tier, disk_size, ... }
  irs: { stateful, container, serving_model, technology, ... }
}
```

---

## Step 3 — Determine Terraform project structure

Based on the components found in Step 2, decide which modules to generate. Use the module dependency graph from [module-catalog.md](module-catalog.md).

**Only generate modules for services that exist in the cost estimate.** For example:
- No Redis in cost estimate → skip `memorystore/` module
- No CDN recommended → skip `cdn/` module
- No background workers → skip scheduler/pubsub resources

Standard structure (include/exclude based on detected services):

```
./infra/
  README.md
  versions.tf
  backend.tf
  variables.tf
  terraform.tfvars.example
  main.tf
  outputs.tf
  modules/
    networking/          # Always included — multi-region VPC connectors
    cloud-run/           # If any compute services detected
    cloud-sql/           # If relational DB detected
    memorystore/         # If Redis/cache detected
    storage/             # If object storage detected
    load-balancer/       # If multi-region HA or CDN recommended
    iam/                 # Always included
    cicd/                # If CI/CD detected in IRS
```

---

## Step 4 — Generate foundation files

Create the root-level Terraform files. Use patterns from [terraform-patterns.md](terraform-patterns.md).

### `versions.tf`
- `terraform.required_version = ">= 1.5"`
- `required_providers` block with `hashicorp/google ~> 5.0`
- Use the provider registry in [provider-registry.md](provider-registry.md) for the target cloud

### `backend.tf`
- GCS backend: bucket name = `<project-name>-tfstate`, prefix = `terraform/state`
- Include a comment noting the bucket must be created manually before `terraform init`

### `variables.tf`
All root-level input variables with:
- `type`, `description`, `default` (where sensible)
- `validation` blocks for constrained values (e.g., region, environment)
- Variables must be abstract enough for multi-cloud but specific enough for the target provider

Standard variables every project needs:
- `project_id` (string, no default)
- `project_name` (string, default from IRS project name)
- `primary_region` (string, default "us-central1")
- `secondary_region` (string, default "us-east1" — only if multi-region HA)
- `environment` (string, default "production", validation: production/staging/development)

Plus service-specific variables derived from the cost estimate configurations (e.g., `db_tier`, `db_disk_size`, `redis_tier`, `redis_size_gb`, etc.)

### `terraform.tfvars.example`
- Populate with the EXACT values from the cost estimate
- Comment each value with its source (e.g., `# From GCP cost estimate: Cloud SQL config`)

### `main.tf`
- Module instantiation blocks wiring everything together
- Follow the dependency order from [module-catalog.md](module-catalog.md)
- Pass outputs from upstream modules as inputs to downstream modules
- Example: `module.networking.vpc_id` → `module.cloud_sql.vpc_id`
- **Multi-region wiring**: Pass a `regions` map to `networking` module, then use `module.networking.vpc_connector_ids["primary"]` and `["secondary"]` for each region's Cloud Run instance. Pass all Cloud Run service names/regions to the `load-balancer` module via its `cloud_run_services` map
- **Module ordering**: Define the `cicd` module BEFORE `cloud-run` modules in `main.tf`, since Cloud Run references `module.cicd.repository_id` for the image URL. Terraform resolves dependencies from references, but placing cicd first makes the dependency clear to readers
- **Initial image (bootstrap)**: For the `api_image` variable, set the default to a known-good placeholder image (e.g., `us-docker.pkg.dev/cloudrun/container/hello:latest`). On first `terraform apply`, the Artifact Registry is empty — using a placeholder prevents the Cloud Run deploy from failing. CI/CD will deploy the real image on the first push
- **CI/CD image drift prevention**: When the `cicd` module is included, add `lifecycle { ignore_changes = [template[0].containers[0].image] }` to each Cloud Run resource. Without this, the next `terraform apply` would revert the image to the placeholder after CI/CD deploys the real application

### `outputs.tf`
- Service URLs (Cloud Run — per region)
- Database connection name and private IP
- Redis host and port
- Storage bucket name
- Load balancer IP (if load-balancer module present)
- Artifact Registry URL

---

## Step 5 — Generate service modules

For each module determined in Step 3, generate `main.tf`, `variables.tf`, and `outputs.tf`. Use the canonical HCL patterns from [terraform-patterns.md](terraform-patterns.md).

**Critical rule**: every configuration value in the generated Terraform MUST trace back to either the cost estimate's Configuration column or the IRS tables. Do not invent configurations.

### Module: `networking/`
- Accepts a `regions` map (e.g., `{ primary = "us-central1", secondary = "us-east1" }`)
- `google_compute_network` (VPC — global, one per project)
- `google_compute_subnetwork` (one private subnet per region via `for_each`)
- `google_vpc_access_connector` (one per region via `for_each` — required for Cloud Run → Cloud SQL private IP)
- `google_compute_router` + `google_compute_router_nat` (one per region via `for_each`)
- Outputs `vpc_connector_ids` as a map keyed by region key (e.g., `["primary"]`, `["secondary"]`)

### Module: `cloud-run/`
This is a **reusable module** — called once per Cloud Run service per region from root `main.tf`.
- `google_cloud_run_v2_service` with parameterized: service_name, image, cpu, memory, min/max instances, env_vars, service_account, vpc_connector
- `google_cloud_run_v2_service_iam_member` for public access (if frontend) or authenticated access (if backend)
- **Multi-region**: For HA, call this module once per region (e.g., `module "api_primary"` and `module "api_secondary"`), each with its own region-specific VPC connector from `networking.vpc_connector_ids`
- **CI/CD lifecycle management**: When the `cicd` module is part of the project, add `lifecycle { ignore_changes = [template[0].containers[0].image] }` to the `google_cloud_run_v2_service` resource. This prevents `terraform apply` from reverting the image after CI/CD deploys a new version. Note: Terraform `lifecycle` blocks cannot be conditional, so this must be statically present in the module when CI/CD exists

### Module: `cloud-sql/`
- `google_sql_database_instance` with tier, disk_size, backup config, private IP
- `google_sql_database` (the actual database)
- `google_sql_user` (application user)
- Private IP via `google_compute_global_address` + `google_service_networking_connection`

### Module: `memorystore/` (conditional)
- `google_redis_instance` with tier, memory_size_gb, authorized_network

### Module: `storage/` (conditional)
- `google_storage_bucket` with storage_class, location, lifecycle rules
- CORS configuration if user uploads detected
- Uniform bucket-level access enabled

### Module: `load-balancer/` (conditional — multi-region HA or CDN)
- `google_compute_global_address` (static IP)
- `google_compute_managed_ssl_certificate` (for custom domain, conditional)
- `google_compute_region_network_endpoint_group` (one serverless NEG per region via `for_each` over `cloud_run_services` map)
- `google_compute_backend_service` (with dynamic backends from all NEGs, optional CDN policy)
- `google_compute_url_map`, `google_compute_target_https_proxy`, `google_compute_global_forwarding_rule`
- HTTP-to-HTTPS redirect URL map (conditional on domain)
- Accepts a `cloud_run_services` map: `{ primary = { region, service_name }, secondary = { region, service_name } }`

### Module: `iam/`
- `google_service_account` per Cloud Run service (least privilege)
- `google_project_iam_member` bindings based on service needs:

| Service | Roles |
|---|---|
| Frontend (Cloud Run) | Public invoker only, no DB/storage access |
| Backend API (Cloud Run) | `roles/cloudsql.client`, `roles/storage.objectAdmin`, `roles/redis.editor` |
| Worker (Cloud Run) | `roles/cloudsql.client`, `roles/pubsub.subscriber` (if queues) |
| Cloud Build | `roles/run.admin`, `roles/artifactregistry.writer`, `roles/iam.serviceAccountUser` |

### Module: `cicd/` (conditional)
- `google_artifact_registry_repository` (Docker format)
- `google_cloudbuild_trigger` per service (trigger on push to main branch)
- Inline Cloud Build steps: docker build, docker push, gcloud run deploy
- The `services` variable must include `deploy_region` per service to deploy to the correct region
- **Image naming**: Docker images MUST be tagged with `each.value.cloud_run_service_name` (NOT `each.key`). This ensures the image name in Artifact Registry matches the name Cloud Run expects. Also tag with both `:$COMMIT_SHA` and `:latest` (use `docker push --all-tags`)
- **Multi-region**: For each Cloud Run service deployed to multiple regions, create separate CI/CD service entries (e.g., `api-primary` and `api-secondary`) each with their own `deploy_region`. Both entries should use the same `cloud_run_service_name` — they build the same image but deploy to different regions. Note: this results in duplicate builds for the same image, which is acceptable for simplicity
- Cloud Build uses the default Cloud Build service account — grant it `roles/run.admin`, `roles/artifactregistry.writer`, and `roles/iam.serviceAccountUser` in the IAM module
- **Outputs**: Must include `repository_id` (the Artifact Registry repo ID) in addition to `artifact_registry_url` and `trigger_ids`. Cloud Run modules reference `module.cicd.repository_id` to construct their image URLs

### API Enablement
Include `google_project_service` resources in root `main.tf` (or a dedicated `apis.tf`) for every GCP API used:
- `run.googleapis.com`
- `sqladmin.googleapis.com`
- `redis.googleapis.com`
- `compute.googleapis.com`
- `vpcaccess.googleapis.com`
- `cloudbuild.googleapis.com`
- `artifactregistry.googleapis.com`
- `secretmanager.googleapis.com`
- `servicenetworking.googleapis.com`

---

## Step 6 — Generate IAM and security configuration

This is handled within the `iam/` module (Step 5), but verify these security requirements:

1. **No default compute service account** — every Cloud Run service gets its own SA
2. **No `roles/owner` or `roles/editor`** — only specific roles per service
3. **Cloud SQL uses private IP only** — `ipv4_enabled = false` in ip_configuration
4. **Deletion protection** — enabled on production databases (`deletion_protection = true` when `var.environment == "production"`)
5. **Backup configuration** — enabled on all databases
6. **Uniform bucket-level access** — enabled on all storage buckets
7. **Secret Manager** — for sensitive environment variables, reference `google_secret_manager_secret_version` and pass to Cloud Run via `env.value_source.secret_key_ref`

---

## Step 7 — Write files and present output

### Write the files

1. Create the directory tree:
   ```bash
   mkdir -p ./infra/modules/networking ./infra/modules/cloud-run ./infra/modules/cloud-sql ./infra/modules/iam ./infra/modules/load-balancer
   ```
   (Plus any conditional module directories like `memorystore/`, `storage/`)

2. Write every file using the Write tool

3. Generate `./infra/README.md` with:
   - Project overview (from IRS)
   - Architecture summary
   - Prerequisites:
     - Install Terraform >= 1.5
     - Install and configure `gcloud` CLI
     - Create GCS bucket for state: `gcloud storage buckets create gs://<project>-tfstate --location=us-central1`
     - Enable required APIs (list them)
     - Set `project_id` in `terraform.tfvars`
   - Quick start:
     ```
     cp terraform.tfvars.example terraform.tfvars
     # Edit terraform.tfvars with your project_id
     terraform init
     terraform plan
     terraform apply
     ```
   - Module overview table

### Present the summary

After writing all files, display:

1. **File manifest** — list every generated file with a one-line description
2. **Quick-start commands** — the 4 commands to get started
3. **Manual prerequisites** — what the user must do before `terraform init`
4. **What's included vs not included** — clarify scope

---

## Quality checklist (verify before writing files)

- [ ] Every resource has a `labels` block with `project`, `environment`, `managed-by = "terraform"`
- [ ] No hardcoded values — all configuration flows through variables
- [ ] `terraform.tfvars.example` values exactly match cost estimate configurations
- [ ] IAM follows least-privilege — no `roles/owner` or `roles/editor`
- [ ] Cloud SQL uses private IP (not public) via VPC
- [ ] Cloud Run services use dedicated service accounts (not default compute SA)
- [ ] Deletion protection enabled for production databases
- [ ] Backup configuration enabled for databases
- [ ] Module wiring is correct (outputs feed dependent module inputs)
- [ ] `README.md` includes prerequisites, bootstrap steps, and usage instructions
- [ ] Generated HCL uses valid syntax (proper blocks, correct argument names, no missing required arguments)
- [ ] API enablement resources included for all GCP services used
- [ ] Cloud Run resources have `lifecycle { ignore_changes = [template[0].containers[0].image] }` when CI/CD module is present
- [ ] CI/CD docker tags use `cloud_run_service_name` (not the CI/CD service key) to match Cloud Run image references
- [ ] Cloud Run initial image uses a placeholder (`us-docker.pkg.dev/cloudrun/container/hello:latest`) or a user-provided image variable, not a reference to an empty Artifact Registry
- [ ] Subnet CIDRs use `cidrsubnet()` to scale beyond 2 regions without CIDR collisions
