# Azure Pricing Reference (2025)

All prices USD. East US (Virginia) region unless noted. Prices are approximate and subject to change.
**Always verify current prices at https://azure.microsoft.com/en-us/pricing/calculator/**

---

## Azure Container Apps

Serverless container platform. Billed per vCPU-second and GiB-second of active consumption, plus per-request.

| Dimension | Price |
|---|---|
| vCPU (active) | $0.000024 / vCPU-second |
| vCPU (idle, with min replicas) | $0.000012 / vCPU-second |
| Memory (active) | $0.000003 / GiB-second |
| Requests | $0.40 per million |

**Free tier (per subscription per month):**
- 180,000 vCPU-seconds
- 360,000 GiB-seconds
- 2,000,000 requests

**Practical monthly estimates:**

| Scenario | Config | Est. monthly cost |
|---|---|---|
| Always-on, low traffic | min=1, 0.5 vCPU, 1 GB | ~$12/month |
| Always-on, moderate traffic | min=1, 0.5 vCPU, 1 GB + 1M req/mo | ~$20–35/month |
| Moderate traffic (scale-out) | min=1, 1 vCPU, 2 GB + 5M req/mo | ~$60–100/month |
| Heavy traffic | min=2, 1 vCPU, 2 GB + 10M req/mo | ~$150–250/month |
| Scale-to-zero (dev/test) | min=0, only pay during requests | ~$1–5/month |

**Calculation formula:**
```
monthly_cost = (active_vCPU_seconds × $0.000024)
             + (idle_vCPU_seconds × $0.000012)
             + (GiB_seconds × $0.000003)
             + (requests / 1,000,000 × $0.40)
             - free_tier_credit
```

---

## Azure Static Web Apps

| Tier | Price | Included |
|---|---|---|
| Free | $0/month | 100 GB bandwidth, 0.5 GB storage, custom domains, built-in CI/CD |
| Standard | $9/month per app | 100 GB bandwidth, 2 GB storage, custom auth providers, staging environments |

**Recommendation:** Most SPA and SSG projects fit the Free tier. Use Standard only if you need custom auth providers (non-Azure AD) or advanced staging slots.

**Overage:**
- Bandwidth: $0.20/GB over included amount
- Storage: $0.25/GB over included amount

---

## Azure Database for PostgreSQL Flexible Server

Fully managed PostgreSQL. Supports PostgreSQL 14, 15, 16.

### Burstable Tier (B-series) — Dev/test, small workloads

| SKU | vCPU | RAM | Est. monthly cost |
|---|---|---|---|
| B1ms | 1 | 2 GB | ~$13/month |
| B2s | 2 | 4 GB | ~$25/month |
| B4ms | 4 | 8 GB | ~$50/month |
| B8ms | 8 | 16 GB | ~$100/month |

### General Purpose (GP) Tier — Production workloads

| SKU | vCPU | RAM | Est. monthly cost |
|---|---|---|---|
| GP_Standard_D2s | 2 | 8 GB | ~$100/month |
| GP_Standard_D4s | 4 | 16 GB | ~$200/month |
| GP_Standard_D8s | 8 | 32 GB | ~$400/month |
| GP_Standard_D16s | 16 | 64 GB | ~$800/month |

### Memory Optimized (MO) Tier — Cache-heavy, analytics

| SKU | vCPU | RAM | Est. monthly cost |
|---|---|---|---|
| MO_Standard_E2s | 2 | 16 GB | ~$130/month |
| MO_Standard_E4s | 4 | 32 GB | ~$260/month |
| MO_Standard_E8s | 8 | 64 GB | ~$520/month |

### High Availability

- Zone-Redundant HA: ~1.8× single-instance price (standby replica in separate AZ)
- Same-Zone HA: ~1.5× single-instance price

### Storage and Backup

| Item | Price |
|---|---|
| Storage | $0.115/GB/month |
| Backup storage | Free up to 100% of provisioned DB size |
| Backup storage overage | $0.095/GB/month |
| I/O (Burstable) | Included |
| I/O (GP/MO) | Included (provisioned IOPS) |

**Practical monthly estimates:**

| Scenario | Config | Est. monthly cost |
|---|---|---|
| MVP / hobby | B1ms, 20 GB | ~$15/month |
| Small production | B2s, 20 GB | ~$27/month |
| Mid production | GP_Standard_D2s, 50 GB | ~$106/month |
| Mid prod + HA | GP_Standard_D2s HA, 50 GB | ~$186/month |
| Large production | GP_Standard_D4s HA, 100 GB | ~$372/month |

---

## Azure Database for MySQL Flexible Server

Same pricing structure as PostgreSQL Flexible Server. Tier names and SKUs are identical.

| Scenario | Config | Est. monthly cost |
|---|---|---|
| MVP | B1ms, 20 GB | ~$13/month |
| Small production | B2s, 20 GB | ~$25/month |
| Mid production | GP_Standard_D2s HA, 50 GB | ~$186/month |

---

## Azure Cache for Redis

| Tier | SKU | Memory | Notes | Est. monthly cost |
|---|---|---|---|---|
| Basic (no SLA) | C0 | 250 MB | Dev/test only, no replication | ~$17/month |
| Basic | C1 | 1 GB | Dev/test | ~$55/month |
| Basic | C2 | 6 GB | Dev/test | ~$160/month |
| Standard (replicated, SLA) | C0 | 250 MB | Primary + replica | ~$34/month |
| Standard | C1 | 1 GB | Primary + replica | ~$110/month |
| Standard | C2 | 6 GB | Primary + replica | ~$320/month |
| Standard | C3 | 13 GB | Primary + replica | ~$640/month |
| Premium (enterprise) | P1 | 6 GB | Cluster, persistence, VNet | ~$490/month |
| Premium | P2 | 13 GB | Cluster, persistence, VNet | ~$980/month |
| Premium | P3 | 26 GB | Cluster, persistence, VNet | ~$1,960/month |

**Recommendation by scenario:**
- Dev/test: C0 Basic
- Production with SLA: C1 Standard minimum
- High throughput / persistence required: P1 Premium

---

## Azure Blob Storage

### Storage Cost

| Tier | Price per GB/month | Access pattern |
|---|---|---|
| Hot | $0.018 (first 50 TB) | Frequently accessed |
| Cool | $0.010 | Accessed < once/month; 30-day minimum |
| Cold | $0.004 | Accessed rarely; 90-day minimum |
| Archive | $0.00099 | Rarely accessed; hours to retrieve |

### Operations Cost

| Operation type | Price |
|---|---|
| Write (Hot) | $0.05 per 10,000 operations |
| Read (Hot) | $0.004 per 10,000 operations |
| Write (Cool) | $0.10 per 10,000 operations |
| Read (Cool) | $0.01 per 10,000 operations |
| Data retrieval (Cool) | $0.01/GB |
| Data retrieval (Archive) | $0.02/GB |

### Practical Monthly Estimates

| Scenario | Storage | Est. monthly cost |
|---|---|---|
| Minimal (< 10 GB, low ops) | 10 GB Hot | ~$0.20/month |
| Small app (100 GB) | 100 GB Hot | ~$1.80/month |
| Medium app (500 GB) | 500 GB Hot | ~$9.00/month |
| Large app (1 TB) | 1 TB Hot | ~$18.00/month |
| Mixed (frequent + archive) | 100 GB Hot + 1 TB Archive | ~$2.80/month |

---

## Azure Front Door (Standard / Premium)

Global anycast CDN and load balancer with WAF.

| Item | Standard | Premium |
|---|---|---|
| Base fee | $35/month | $330/month |
| Origin transfer out | $0.008/GB (first 10 TB) | $0.008/GB (first 10 TB) |
| Inbound data | $0.008/GB | $0.008/GB |
| Requests | $0.009 per 10,000 | $0.009 per 10,000 |
| Custom domains | Included | Included |
| WAF managed rule sets | Not included | Included ($5/policy + $1/rule/month for Standard) |

**Practical monthly estimates:**

| Scenario | Traffic | Est. monthly cost |
|---|---|---|
| Low traffic | 50 GB/month | ~$36/month (mostly base fee) |
| Medium traffic | 500 GB/month | ~$39/month |
| High traffic | 5 TB/month | ~$75/month |

---

## Azure CDN (Classic — cheaper for simple cases)

Pay-per-use CDN without a base fee. Covers North America and Europe well.

| Tier | Zone | Price per GB |
|---|---|---|
| Standard Microsoft | North America / Europe | $0.087/GB (first 10 TB) |
| Standard Microsoft | Asia Pacific | $0.138/GB |
| Standard Microsoft | South America | $0.163/GB |

**Practical monthly estimates:**

| Scenario | Egress | Est. monthly cost |
|---|---|---|
| Low (10 GB/month) | N. America | ~$0.87/month |
| Medium (100 GB/month) | N. America | ~$8.70/month |
| High (1 TB/month) | N. America | ~$87/month |

**Use Azure CDN when:** traffic is primarily in North America / Europe, you don't need WAF, and cost matters more than global performance. Use Azure Front Door when you need global coverage, health probes, or WAF.

---

## Azure AD B2C

Consumer identity platform.

| Usage | Price |
|---|---|
| Monthly Active Users ≤ 50,000 | Free |
| MAU > 50,000 (Standard) | $0.00325 / MAU |
| MAU > 50,000 (Premium P2) | $0.01625 / MAU |
| MFA per authentication | $0.03 per authentication |

**Practical monthly estimates:**

| MAU | MFA rate | Est. monthly cost |
|---|---|---|
| < 50k | Any | $0 (free tier) |
| 100k | 50% | ~$162 + $1,500 MFA = ~$1,662 (P2 is expensive — evaluate alternatives) |
| 100k | 0% | ~$162/month (Standard) |
| 200k | 0% | ~$488/month (Standard) |

**Note:** MFA costs can dominate at scale. Consider passwordless / passkey auth to reduce MFA frequency, or evaluate Auth0/Clerk/Stytch for high-MAU consumer apps.

---

## Azure Container Registry

Private container image registry.

| Tier | Price | Included storage | Throughput |
|---|---|---|---|
| Basic | ~$5/month ($0.167/day) | 10 GB | 2 webhooks |
| Standard | ~$20/month ($0.667/day) | 100 GB | 10 webhooks |
| Premium | ~$50/month ($1.667/day) | 500 GB | 500 webhooks, geo-replication, private endpoints |

**Storage overage:** $0.003/GB/day (~$0.09/GB/month)

**Recommendation:** Basic for hobby/small projects; Standard for teams with multiple images; Premium for multi-region or enterprise.

---

## Azure Kubernetes Service (AKS)

| Component | Price |
|---|---|
| Cluster management (Free tier) | Free (no SLA) |
| Cluster management (Standard tier) | $0.10/hour (~$73/month) — includes SLA |
| Worker nodes | VM pricing (see Virtual Machines section) |
| Uptime SLA (optional) | $0.10/cluster/hour |

**Minimum viable AKS cluster:**
- 1 system node pool: 3× B2s nodes (~$90/month)
- AKS management: Free tier or $73/month Standard
- Estimated minimum: ~$90–165/month (no workload nodes yet)

**Typical small AKS cluster:**
- 3 system nodes (B2s) + 3 worker nodes (D2s v3): ~$300–400/month in nodes alone

---

## Azure Virtual Machines

### B-series (Burstable) — Dev/test, low-CPU workloads

| Size | vCPU | RAM | Est. monthly cost |
|---|---|---|---|
| B1s | 1 | 1 GB | ~$8/month |
| B1ms | 1 | 2 GB | ~$15/month |
| B2s | 2 | 4 GB | ~$30/month |
| B4ms | 4 | 16 GB | ~$76/month |
| B8ms | 8 | 32 GB | ~$152/month |

### D-series v3 (General Purpose) — Production workloads

| Size | vCPU | RAM | Est. monthly cost |
|---|---|---|---|
| D2s v3 | 2 | 8 GB | ~$70/month |
| D4s v3 | 4 | 16 GB | ~$140/month |
| D8s v3 | 8 | 32 GB | ~$280/month |
| D16s v3 | 16 | 64 GB | ~$560/month |

### Reserved Instances (1-year)

| Commitment | Discount |
|---|---|
| 1-year reserved | ~40% off pay-as-you-go |
| 3-year reserved | ~60% off pay-as-you-go |

**OS disk:** Standard SSD P10 (128 GB) ~$10/month; Premium SSD P10 ~$20/month

---

## Azure Functions

Serverless compute for event-driven workloads.

### Consumption Plan (pay-per-use)

| Item | Free tier | Additional |
|---|---|---|
| Executions | 1,000,000 / month | $0.20 per million |
| Execution duration | 400,000 GB-seconds / month | $0.000016 per GB-second |
| Concurrent executions | 200 max | — |

### Premium Plan (always warm, no cold start)

| SKU | vCPU | RAM | Est. monthly cost |
|---|---|---|---|
| EP1 | 1 | 3.5 GB | ~$156/month (1 always-ready instance) |
| EP2 | 2 | 7 GB | ~$312/month |
| EP3 | 4 | 14 GB | ~$624/month |

**Recommendation:** Use Consumption plan for cron jobs and infrequent event triggers — often stays within the free tier. Use Premium plan only if you require no cold starts or need VNet integration.

**Practical monthly estimates:**

| Scenario | Config | Est. monthly cost |
|---|---|---|
| Cron jobs only | Few executions, short duration | $0 (free tier) |
| Light event processing | 5M executions, 1 GB-sec avg | ~$1/month |
| Moderate processing | 50M executions, 1 GB-sec avg | ~$9/month |

---

## Azure Service Bus

Managed message broker.

| Tier | Base fee | Per million operations | Notes |
|---|---|---|---|
| Basic | — | $0.05/million | Queues only, no topics/subscriptions |
| Standard | $10/month | $0.01/million (after 10M included) | Topics, subscriptions, dead-letter |
| Premium | $677/month | Included (messaging units) | Dedicated, VNet, large messages |

**Practical monthly estimates:**

| Scenario | Tier | Est. monthly cost |
|---|---|---|
| Simple queue, low traffic | Basic | ~$0.05–1/month |
| Topics / pub-sub | Standard | ~$10–15/month |
| High-throughput enterprise | Premium (1 MU) | ~$677/month |

---

## Azure DNS

| Item | Price |
|---|---|
| Hosted zone | $0.50/month per zone |
| DNS queries (first 1 billion) | $0.40 per million |
| DNS queries (over 1 billion) | $0.20 per million |
| Traffic Manager profiles | $0.54/month per profile |

**Practical monthly cost:** Most apps with 1–2 zones and moderate traffic → ~$1–2/month.

---

## Azure Web PubSub

Real-time WebSocket messaging service.

| Tier | Unit price | Connections included | Messages included |
|---|---|---|---|
| Free | $0/month | 20 concurrent | 20,000/month |
| Standard | $49/month per unit | 1,000 concurrent | 1,000,000/month |

**Additional messages:** $1 per million beyond included.

**Note:** Azure Container Apps natively supports WebSocket connections. Only use Azure Web PubSub if you need fan-out broadcast to thousands of concurrent connections beyond what a single Container App replica can handle.

---

## Azure Free Tier (Permanent Always-Free)

These resources are permanently free regardless of how long you've had your Azure account.

| Service | Always-free allowance |
|---|---|
| Azure Static Web Apps | Free tier (100 GB bandwidth, 0.5 GB storage, custom domains) |
| Azure AD B2C | 50,000 MAU / month |
| Azure Functions (Consumption) | 1,000,000 executions + 400,000 GB-seconds / month |
| Azure Service Bus Basic | 1,000,000 operations / month (no base fee) |
| Azure DevOps | 1 free parallel CI/CD job (1,800 min/month for public projects) |
| Azure Container Apps | 180,000 vCPU-seconds + 360,000 GiB-seconds + 2M requests / month |
| Azure VNet | Free to create (charges apply for NAT Gateway, VPN, etc.) |
| Azure Managed Identities | Always free |

## Azure Free Account (12-month trial, new accounts only)

| Service | 12-month free allowance |
|---|---|
| Azure Blob Storage | 5 GB LRS (Hot tier) |
| Azure Container Registry Basic | 1 registry for 12 months |
| Azure Database for PostgreSQL Flexible | B1ms, 32 GB, 32 GB backup for 12 months |
| Azure Virtual Machines | 750 hours B1s Windows / Linux per month |
| Azure App Service | 10 web, mobile, or API apps (F1 shared) |

---

## Quick Reference: Cost by Scale

| Scale | MAU | Typical monthly spend | Key cost drivers |
|---|---|---|---|
| Hobby / MVP | < 1k | $15–40 | PostgreSQL B1ms, Container Apps (scale-to-zero) |
| Small SaaS | 1k–10k | $90–220 | PostgreSQL B2s, Container Apps min=1, Redis C0 |
| Growing SaaS | 10k–100k | $350–900 | PostgreSQL GP D2s HA, Redis C1, Front Door |
| Large SaaS | 100k–500k | $1,000–3,000 | PostgreSQL GP D4s HA + replicas, Redis P1, AKS |
| Enterprise | 500k+ | $3,000–15,000+ | AKS multi-node, PostgreSQL MO, Redis P2+ |

---

## Reserved Instance Savings Reference

For production workloads running 24/7, reserved instances significantly reduce costs.

| Resource | Pay-as-you-go | 1-year reserved | 3-year reserved |
|---|---|---|---|
| PostgreSQL GP_Standard_D2s | ~$100/month | ~$60/month | ~$40/month |
| PostgreSQL GP_Standard_D4s | ~$200/month | ~$120/month | ~$80/month |
| VM D2s v3 | ~$70/month | ~$42/month | ~$28/month |
| Redis C1 Standard | ~$110/month | ~$77/month | ~$55/month |

**Container Apps** does not have reserved pricing — it uses a consumption model. Use minimum replicas wisely to control always-on costs.
