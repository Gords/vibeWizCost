# Module Catalog

Defines the module structure, naming conventions, dependency graph, and interface contracts for generated Terraform projects.

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Module directory | lowercase, hyphenated | `cloud-run`, `cloud-sql` |
| Variable names | snake_case | `db_disk_size`, `min_instances` |
| Resource names | snake_case, prefixed with project name | `"${var.project_name}-db"` |
| Output names | snake_case, descriptive | `service_url`, `connection_name` |
| Labels | lowercase, hyphenated keys | `managed-by = "terraform"` |

---

## Standard Variables

Every module receives these variables from root:

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_id` | `string` | GCP project ID | — (required) |
| `project_name` | `string` | Human-readable name for resource naming | — (required) |
| `region` | `string` | GCP region | `"us-central1"` |
| `environment` | `string` | `"production"` / `"staging"` / `"development"` | `"production"` |
| `labels` | `map(string)` | Common resource labels | `{}` |

---

## Module Dependency Graph

Modules must be instantiated in dependency order. Arrows show data flow (outputs → inputs).

```
                    ┌───────────┐
                    │    iam    │
                    └─────┬─────┘
                          │ service_account_emails
                          ▼
┌──────────────┐    ┌───────────┐
│  networking  │───▶│ cloud-run │──────────────┐
└──────┬───────┘    └─────▲─────┘              │
       │                  │                    │ service_name
       │ vpc_id           │ repository_id      ▼
       │            ┌─────┴──────┐      ┌───────────────┐
       │            │    cicd    │      │ load-balancer  │
       │            └────────────┘      └───────────────┘
       ├──────────────────┐
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│  cloud-sql   │   │ memorystore  │
└──────────────┘   └──────────────┘

┌──────────────┐
│   storage    │  (standalone — no dependencies)
└──────────────┘
```

### Dependency Rules

1. **`networking`** — no dependencies, always first
2. **`iam`** — no module dependencies, can run in parallel with networking
3. **`cicd`** — no module dependencies, can run in parallel with networking and iam. Provides `repository_id` consumed by `cloud-run` for image URLs
4. **`cloud-sql`** — depends on `networking` (vpc_id for private IP)
5. **`memorystore`** — depends on `networking` (vpc_id for authorized_network)
6. **`storage`** — no dependencies, standalone
7. **`cloud-run`** — depends on `networking` (vpc_connector_ids), `iam` (service_account_emails), `cicd` (repository_id for image URL), and references `cloud-sql` / `memorystore` outputs for env vars
8. **`load-balancer`** — depends on `cloud-run` (service names per region for serverless NEGs)

---

## Module Interface Contracts

### `networking` module

Supports multi-region deployments. Creates per-region subnets, VPC connectors, routers, and NAT gateways from a single `regions` map.

**Inputs:**
| Variable | Type | Source |
|----------|------|--------|
| `project_name` | `string` | Root variable |
| `regions` | `map(string)` | Root variables: `{ primary = var.primary_region, secondary = var.secondary_region }` |
| `labels` | `map(string)` | Root labels |

**Outputs:**
| Output | Type | Consumed by |
|--------|------|-------------|
| `vpc_id` | `string` | `cloud-sql`, `memorystore` |
| `vpc_name` | `string` | — |
| `subnet_ids` | `map(string)` | — |
| `vpc_connector_ids` | `map(string)` | `cloud-run` (use `["primary"]` / `["secondary"]` keys) |

---

### `iam` module

**Inputs:**
| Variable | Type | Source |
|----------|------|--------|
| `project_id` | `string` | Root variable |
| `project_name` | `string` | Root variable |
| `services` | `map(object({ roles = list(string) }))` | Derived from cost estimate service mapping |

**Outputs:**
| Output | Type | Consumed by |
|--------|------|-------------|
| `service_account_emails` | `map(string)` | `cloud-run` (per service) |

---

### `cloud-run` module (called per service)

**Inputs:**
| Variable | Type | Source |
|----------|------|--------|
| `service_name` | `string` | Derived from IRS service name |
| `region` | `string` | Root variable |
| `image` | `string` | From `cicd.artifact_registry_url` + service name |
| `cpu` | `string` | From cost estimate config |
| `memory` | `string` | From cost estimate config |
| `min_instances` | `number` | From cost estimate config |
| `max_instances` | `number` | Default 10 or from cost estimate |
| `service_account_email` | `string` | From `iam.service_account_emails[service]` |
| `vpc_connector_id` | `string` | From `networking.vpc_connector_ids["primary"]` or `["secondary"]` |
| `env_vars` | `map(string)` | DB connection info, Redis host, etc. |
| `secret_env_vars` | `map(string)` | Sensitive values from Secret Manager |
| `allow_public_access` | `bool` | `true` for frontend, `false` for backend |

**Outputs:**
| Output | Type | Consumed by |
|--------|------|-------------|
| `service_url` | `string` | Root outputs, `cdn` |
| `service_name` | `string` | `cicd`, `cdn` |

---

### `cloud-sql` module

**Inputs:**
| Variable | Type | Source |
|----------|------|--------|
| `project_name` | `string` | Root variable |
| `region` | `string` | Root variable |
| `environment` | `string` | Root variable |
| `vpc_id` | `string` | From `networking.vpc_id` |
| `db_version` | `string` | From IRS: `"POSTGRES_16"`, `"MYSQL_8_0"` |
| `db_tier` | `string` | From cost estimate: `"db-g1-small"` |
| `db_disk_size` | `number` | From cost estimate: `20` |
| `ha` | `bool` | From cost estimate: `true` if HA token present |
| `database_password` | `string` | Sensitive — manual input or Secret Manager |

**Outputs:**
| Output | Type | Consumed by |
|--------|------|-------------|
| `connection_name` | `string` | `cloud-run` (env var) |
| `private_ip` | `string` | `cloud-run` (env var) |
| `database_name` | `string` | `cloud-run` (env var) |
| `instance_name` | `string` | — |

---

### `memorystore` module

**Inputs:**
| Variable | Type | Source |
|----------|------|--------|
| `project_name` | `string` | Root variable |
| `region` | `string` | Root variable |
| `vpc_id` | `string` | From `networking.vpc_id` |
| `redis_tier` | `string` | From cost estimate: `"BASIC"` or `"STANDARD_HA"` |
| `redis_size_gb` | `number` | From cost estimate: `1`, `2`, `5` |

**Outputs:**
| Output | Type | Consumed by |
|--------|------|-------------|
| `host` | `string` | `cloud-run` (env var: `REDIS_HOST`) |
| `port` | `number` | `cloud-run` (env var: `REDIS_PORT`) |

---

### `storage` module

**Inputs:**
| Variable | Type | Source |
|----------|------|--------|
| `project_name` | `string` | Root variable |
| `region` | `string` | Root variable |
| `environment` | `string` | Root variable |
| `storage_class` | `string` | From cost estimate: `"STANDARD"` |
| `enable_cors` | `bool` | `true` if user uploads detected in IRS |

**Outputs:**
| Output | Type | Consumed by |
|--------|------|-------------|
| `bucket_name` | `string` | `cloud-run` (env var: `STORAGE_BUCKET`) |
| `bucket_url` | `string` | Root outputs |

---

### `load-balancer` module

Used for multi-region HA deployments. Creates a global HTTPS load balancer with one serverless NEG per Cloud Run region.

**Inputs:**
| Variable | Type | Source |
|----------|------|--------|
| `project_name` | `string` | Root variable |
| `domain` | `string` | User-provided or empty |
| `enable_cdn` | `bool` | `true` if CDN recommended in IRS |
| `cloud_run_services` | `map(object({ region = string, service_name = string }))` | From `cloud-run` module outputs per region |

**Outputs:**
| Output | Type | Consumed by |
|--------|------|-------------|
| `lb_ip` | `string` | Root outputs |
| `lb_ip_name` | `string` | — |

---

### `cicd` module

**Inputs:**
| Variable | Type | Source |
|----------|------|--------|
| `project_id` | `string` | Root variable |
| `project_name` | `string` | Root variable |
| `region` | `string` | Root variable |
| `github_owner` | `string` | User-provided |
| `github_repo` | `string` | User-provided or from IRS source |
| `trigger_branch` | `string` | Default `"^main$"` |
| `services` | `map(object)` | Derived from IRS services with Dockerfiles |

**Outputs:**
| Output | Type | Consumed by |
|--------|------|-------------|
| `artifact_registry_url` | `string` | Root outputs |
| `repository_id` | `string` | `cloud-run` (used to construct image URL) |
| `trigger_ids` | `map(string)` | Root outputs |

---

## Conditional Module Inclusion

Only generate modules for services detected in the cost estimate:

| Module | Include when |
|--------|-------------|
| `networking` | Always |
| `iam` | Always |
| `cloud-run` | Any compute service in cost estimate |
| `cloud-sql` | Relational DB (PostgreSQL/MySQL) in IRS Data table |
| `memorystore` | Redis/cache in IRS Data table |
| `storage` | Object/file storage in IRS Data table |
| `load-balancer` | Multi-region HA in IRS OR CDN recommended |
| `cicd` | CI/CD detected in IRS DevOps table AND Dockerfiles present |
