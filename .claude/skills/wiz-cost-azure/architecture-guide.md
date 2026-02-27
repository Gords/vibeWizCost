# Azure Architecture Decision Guide

Use this guide to select the right Azure service for each IRS component based on scale, stack type, and cost targets.

---

## Frontend Deployment

| Scenario | Azure Service | Notes |
|---|---|---|
| Static SPA (React, Vue, Angular) | Azure Static Web Apps | Free tier includes global CDN, custom domains, and built-in CI/CD from GitHub |
| Static site generator (Next.js static export, Astro, Hugo) | Azure Static Web Apps | Same as SPA — no server needed |
| SSR (Next.js, Nuxt, SvelteKit) | Azure Container Apps | Serverless containers, scales to zero, supports HTTP/2 and WebSockets |
| High-traffic SSR | Azure Container Apps + Azure Front Door | Front Door adds global anycast routing and WAF |

**Decision rule:** If the frontend has no server-side rendering, always choose Azure Static Web Apps — it is either free or $9/month and requires no container management. Move to Container Apps only when the framework requires a running server process.

---

## Backend Deployment by Scale

| Scale | MAU | Recommended service | Configuration |
|---|---|---|---|
| Hobby / MVP | < 1k | Azure Container Apps | min=0, scales to zero, pay only for usage |
| Small | 1k–10k | Azure Container Apps | min=1, consistent cold-start avoidance |
| Mid-tier | 10k–100k | Azure Container Apps (autoscale) | min=2–5, KEDA-based autoscaling |
| Large | 100k–500k | Azure Container Apps + Azure Front Door | Horizontal scaling, traffic management |
| Enterprise | > 500k | AKS (Azure Kubernetes Service) | Full Kubernetes control, Dapr optional |

**JVM workloads (Spring Boot, Quarkus, Micronaut):** JVM startup time is 5–30 seconds. Always set `min=1` on Container Apps or use AKS to avoid cold-start timeouts. Consider GraalVM native image compilation to reduce startup below 1 second if you need scale-to-zero.

**Stateful workloads:** If the process holds in-memory state (WebSocket sessions, local caches not shared across replicas), use Azure Virtual Machines or a single-replica Container App. For shared state across replicas, use Azure Cache for Redis.

---

## Database

### Relational

| Need | Azure Service | Recommended tier |
|---|---|---|
| PostgreSQL (MVP) | Azure Database for PostgreSQL Flexible Server | Burstable B1ms or B2s |
| PostgreSQL (production) | Azure Database for PostgreSQL Flexible Server | General Purpose GP_Standard_D2s |
| PostgreSQL (high availability) | Azure Database for PostgreSQL Flexible Server + HA | GP_Standard_D2s with Zone-Redundant HA |
| PostgreSQL (read-heavy) | Azure Database for PostgreSQL Flexible Server + read replicas | Add replicas to GP tier |
| MySQL | Azure Database for MySQL Flexible Server | Same tier structure as PostgreSQL |

**Storage:** Add at least 20 GB per database server. Storage auto-grows if enabled; charges at $0.115/GB/month.

### NoSQL

| Need | Azure Service | Notes |
|---|---|---|
| MongoDB | Azure Cosmos DB (MongoDB API) | Wire-compatible, global distribution, RU-based pricing |
| Key-value / document (general) | Azure Cosmos DB (Core SQL API) | Best for greenfield NoSQL |
| Wide-column / analytics | Azure Cosmos DB (Cassandra API) | Cassandra wire-compatible |
| Time-series / IoT | Azure Data Explorer | Optimized for append-heavy telemetry |
| Analytics / data warehouse | Azure Synapse Analytics | Serverless SQL pool for ad-hoc queries |

### Cache

| Need | Azure Service | Tier |
|---|---|---|
| Session cache, small | Azure Cache for Redis (Basic C0) | 250 MB, no SLA, dev/test only |
| Production cache | Azure Cache for Redis (Standard C1) | 1 GB, replicated, SLA |
| High-throughput cache | Azure Cache for Redis (Premium P1) | 6 GB, cluster, persistence |

---

## File Storage

| Scenario | Azure Service | Storage tier |
|---|---|---|
| User uploads (frequently accessed) | Azure Blob Storage | Hot tier ($0.018/GB/month) |
| Backups / infrequent access | Azure Blob Storage | Cool tier ($0.01/GB/month) |
| Long-term archival | Azure Blob Storage | Archive tier ($0.00099/GB/month) |
| CDN for media / static assets | Azure CDN or Azure Front Door fronting Blob Storage | Standard CDN for simple; Front Door for global WAF |
| Shared filesystem for containers | Azure Files | SMB/NFS mount, $0.06/GB/month (LRS) |

**Access pattern rule:** Use Hot for objects accessed more than once a month. Use Cool for objects accessed less than once a month. Use Archive for objects that can tolerate retrieval delays of hours.

---

## Background Jobs

| Pattern | Azure Service | Notes |
|---|---|---|
| Message queue (simple) | Azure Storage Queue | $0.004 per 10k operations, unlimited depth |
| Message queue (advanced, pub/sub) | Azure Service Bus Standard | Topics, subscriptions, dead-letter queue |
| Scheduled cron | Azure Functions (Timer trigger) | Consumption plan — often free |
| Event-driven worker | Azure Functions (Event triggers) | Consumption plan, scales to zero |
| Long-running batch | Azure Container Apps Jobs | Run-to-completion semantics, billed by execution |
| Workflow orchestration | Azure Durable Functions | Stateful workflows on top of Functions |
| Complex workflows / integrations | Azure Logic Apps | Low-code, connector library |

---

## Networking

| Need | Azure Service | Notes |
|---|---|---|
| Custom domain + TLS (simple) | Azure Container Apps (built-in) | Free managed TLS, custom domain support |
| Custom domain + TLS (advanced) | Azure Application Gateway | L7 load balancer, WAF, SSL termination |
| Global CDN + WAF | Azure Front Door Standard/Premium | Anycast routing, DDoS protection, WAF rules |
| Simple CDN (N. America / Europe) | Azure CDN (classic) | Pay-per-GB, no base fee, simpler setup |
| Private network isolation | Azure Virtual Network (VNet) | Free to create; charges for NAT Gateway, VPN |
| DNS | Azure DNS | $0.50/zone/month, $0.40/million queries |

**Front Door vs CDN decision:** Use Azure Front Door when you need global load balancing across origins, health probes, WAF, or need users in Asia/Australia to benefit from anycast routing. Use Azure CDN for simple static asset delivery in North America and Europe where cost matters more than global performance.

---

## Auth

| Scenario | Azure Service | Cost |
|---|---|---|
| Consumer auth (email, social, OAuth, MFA) | Azure AD B2C | Free up to 50k MAU/month |
| Consumer auth > 50k MAU | Azure AD B2C | $0.00325/MAU standard; $0.01625/MAU P2 |
| Enterprise SSO (SAML, OIDC) | Azure Active Directory (Entra ID) | Included with M365; P1 $6/user/month |
| Service-to-service auth | Azure Managed Identities | Always free; no credentials to manage |
| Custom JWT (self-managed) | — | No Azure service needed; implement in code |

---

## CI/CD

| Scenario | Azure Service | Notes |
|---|---|---|
| Container images | Azure Container Registry | Basic $5/month; Standard $20/month |
| Build pipeline (GitHub-hosted) | GitHub Actions + ACR | Use `azure/login` + `docker/build-push-action` |
| Full Azure DevOps | Azure Pipelines + ACR | 1,800 free minutes/month for public repos |
| Static sites | Azure Static Web Apps | Built-in CI/CD from GitHub/GitLab — no extra cost |

---

## Typical Architectures by Scale

### Hobby / MVP (< 1k MAU)

```
Azure Static Web Apps (SPA, free tier)
  └── Azure Container Apps (API, min=0, scales to zero)
        └── Azure Database for PostgreSQL Flexible (B1ms, 20 GB)
              └── Azure Blob Storage (Hot, < 10 GB)
Azure AD B2C (free up to 50k MAU)
Azure Functions (cron jobs, free tier)

Estimated total: ~$15–40/month
```

### Small SaaS (1k–10k MAU)

```
Azure Container Apps (SSR frontend, min=1)
Azure Container Apps (backend API, min=1)
Azure Database for PostgreSQL Flexible (B2s, 20 GB)
Azure Cache for Redis (C0 Basic)
Azure Blob Storage (Hot, ~50 GB) + Azure CDN
Azure AD B2C (free)
Azure Container Registry (Basic)

Estimated total: ~$90–220/month
```

### Growing SaaS (10k–100k MAU)

```
Azure Container Apps (frontend + backend, min=2, autoscale)
Azure Database for PostgreSQL Flexible (GP_Standard_D2s, Zone-Redundant HA, 100 GB)
Azure Cache for Redis (C1 Standard)
Azure Blob Storage (Hot, ~200 GB) + Azure Front Door Standard
Azure AD B2C (free or low MAU cost)
Azure Container Registry (Standard)
Azure Service Bus Standard (queues / pub-sub)

Estimated total: ~$350–900/month
```

### Scale-up (100k+ MAU)

```
AKS (Azure Kubernetes Service, 3+ nodes)
  or Azure Container Apps (high-replica autoscale)
Azure Database for PostgreSQL Flexible (GP_Standard_D4s, HA + read replicas)
Azure Cache for Redis (P1 Premium, cluster mode)
Azure Blob Storage (Hot, ~1 TB) + Azure Front Door Premium (WAF)
Azure AD B2C (paid MAU tier)
Azure Container Registry (Premium, geo-replication)
Azure Service Bus Premium (dedicated messaging)

Estimated total: ~$1,800–6,000+/month
```
