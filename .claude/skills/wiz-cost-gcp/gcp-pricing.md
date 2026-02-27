# GCP Pricing Reference (as of 2025)

> All prices in USD. Prices are us-central1 (Iowa) unless noted.
> Always verify at https://cloud.google.com/pricing and use the GCP Pricing Calculator.

---

## Cloud Run

| Resource | Price |
|----------|-------|
| CPU (allocated during request) | $0.00002400 per vCPU-second |
| CPU (always-allocated) | $0.00001800 per vCPU-second |
| Memory | $0.00000250 per GiB-second |
| Requests | $0.40 per million requests |
| **Free tier** | 2M requests/mo, 360k vCPU-sec, 180k GiB-sec |

**Practical estimates (min-instances=1, 1 vCPU, 512MB):**
- Idle cost (always-on): ~$14/month
- Light traffic (< 100k req/mo): ~$5–15/month
- Moderate (1M req/mo): ~$25–60/month
- Heavy (10M req/mo): ~$150–400/month

---

## Cloud SQL

### PostgreSQL / MySQL

| Tier | vCPUs | RAM | Monthly price |
|------|-------|-----|--------------|
| db-f1-micro (shared) | 1 shared | 0.6 GB | ~$7/month |
| db-g1-small (shared) | 1 shared | 1.7 GB | ~$25/month |
| db-custom-1-3840 | 1 | 3.75 GB | ~$51/month |
| db-custom-2-7680 | 2 | 7.5 GB | ~$103/month |
| db-custom-4-15360 | 4 | 15 GB | ~$205/month |
| db-custom-8-30720 | 8 | 30 GB | ~$410/month |

**Additional costs:**
- Storage: $0.17/GB/month (SSD)
- HA (high availability): 2x instance price
- Automated backups: $0.08/GB/month
- Data egress: $0.12/GB (after 1 GB free)

**Typical setups:**
- MVP/Dev: db-f1-micro, 10 GB SSD = ~$8.70/month
- Small prod: db-g1-small, 20 GB SSD, backups 5GB = ~$29/month
- Mid prod: db-custom-2-7680 HA, 50 GB = ~$223/month
- Large prod: db-custom-4-15360 HA, 100 GB = ~$444/month

---

## AlloyDB

| Config | Price |
|--------|-------|
| 2 vCPU, 16 GB RAM | ~$280/month |
| 4 vCPU, 32 GB RAM | ~$560/month |
| Storage | $0.35/GiB/month |
| Read pool node | Same as primary |

---

## Memorystore for Redis

| Tier | Size | Monthly price |
|------|------|--------------|
| Basic, 1 GB | 1 GB | ~$49/month |
| Basic, 5 GB | 5 GB | ~$245/month |
| Standard (HA), 1 GB | 1 GB | ~$98/month |
| Standard (HA), 5 GB | 5 GB | ~$490/month |

---

## Cloud Storage

| Class | Price per GB/month | Free tier |
|-------|-------------------|-----------|
| Standard | $0.020 | 5 GB |
| Nearline | $0.010 | — |
| Coldline | $0.004 | — |
| Archive | $0.0012 | — |

**Operations:**
- Class A (writes): $0.05 per 10k ops
- Class B (reads): $0.004 per 10k ops

**Typical costs:**
- 10 GB Standard + 100k ops: ~$0.25/month
- 100 GB Standard + 1M ops: ~$2.50/month
- 1 TB Standard: ~$20/month

---

## Cloud CDN

| Resource | Price |
|----------|-------|
| Cache egress (N. America/Europe) | $0.08/GB (first 10 TB) |
| Cache fill (from origin) | $0.01/GB |
| Cache lookups | $0.0075 per 10k |

**Typical costs:**
- 100 GB egress/month: ~$8/month
- 1 TB egress/month: ~$80/month

---

## Cloud Load Balancing (HTTPS)

| Resource | Price |
|----------|-------|
| Forwarding rules | $0.025/hour (~$18/month) per rule |
| Ingress data | $0.008/GB |
| **First 5 rules free** | (with Compute Engine) |

**Typical cost: ~$18–25/month** for a standard HTTPS LB setup.

---

## Firebase Hosting

| Resource | Free (Spark) | Blaze (pay-as-you-go) |
|----------|-------------|----------------------|
| Storage | 10 GB | $0.026/GB |
| Data transfer | 360 MB/day | $0.15/GB |
| Custom domains | Yes | Yes |

**Typical costs:**
- SPA < 10 GB, < 10 GB/mo transfer: **Free**
- 50 GB storage, 100 GB transfer: ~$16/month

---

## Firebase Authentication

| Tier | Price |
|------|-------|
| MAU ≤ 10,000 | **Free** |
| MAU 10k–100k | $0.0055/MAU |
| MAU 100k–1M | $0.0046/MAU |
| Phone auth (SMS) | $0.006/SMS (US) |

---

## Cloud Build

| Resource | Free | Paid |
|----------|------|------|
| Build minutes | 120 min/day | $0.003/build-minute |
| e2-highcpu-8 machine | — | $0.016/build-minute |

**Typical cost:**
- Small team (< 120 min/day builds): **Free**
- Medium team (500 min/day): ~$11/month

---

## Artifact Registry

| Resource | Price |
|----------|-------|
| Storage | $0.10/GB/month |
| First 0.5 GB | Free |
| Egress same region | Free |
| Egress different region | $0.01/GB |

**Typical cost: ~$1–5/month** for most teams.

---

## Cloud Scheduler

| Price | |
|-------|-|
| First 3 jobs | **Free** |
| Additional jobs | $0.10/job/month |

---

## Pub/Sub

| Resource | Price |
|----------|-------|
| First 10 GB/month | **Free** |
| After 10 GB | $0.040/GB |

---

## Cloud DNS

| Resource | Price |
|----------|-------|
| Managed zone | $0.20/zone/month (first zone free) |
| DNS queries | $0.40/million (first 1B free) |

---

## VPC / Networking

| Resource | Price |
|----------|-------|
| VPC | Free |
| Cloud NAT | $0.0014/vCPU/hour + $0.045/GB |
| Ingress | Free |
| Egress (same region) | Free |
| Egress to internet | $0.08–0.12/GB (after 1 GB free) |

---

## Compute Engine (if needed)

| Machine | vCPU | RAM | Monthly (on-demand) | Monthly (1yr committed) |
|---------|------|-----|---------------------|------------------------|
| e2-micro | 0.25 | 1 GB | ~$8/month | ~$5/month |
| e2-small | 0.5 | 2 GB | ~$14/month | ~$9/month |
| e2-medium | 1 | 4 GB | ~$28/month | ~$18/month |
| e2-standard-2 | 2 | 8 GB | ~$53/month | ~$35/month |
| e2-standard-4 | 4 | 16 GB | ~$106/month | ~$70/month |
| n2-standard-2 | 2 | 8 GB | ~$73/month | ~$48/month |

---

## GKE (Kubernetes)

| Resource | Price |
|----------|-------|
| Cluster management fee | $0.10/hour (~$73/month) — 1 zonal cluster free |
| GKE Autopilot vCPU | $0.0445/vCPU-hour |
| GKE Autopilot memory | $0.00495/GiB-hour |
| Standard node VMs | Compute Engine pricing |

**Autopilot minimum (2 pods, 0.5 vCPU, 512 MB each):** ~$35/month

---

## Support Plans (optional)

| Plan | Price |
|------|-------|
| Basic | Free |
| Standard | $150/month or 3% of monthly spend |
| Enhanced | $500/month or 3% |
| Premium | $12,500/month |

---

## GCP Always Free Tier (key items)

| Service | Always Free |
|---------|------------|
| Cloud Run | 2M requests, 360k vCPU-s, 180k GiB-s per month |
| Cloud Storage | 5 GB Standard |
| Pub/Sub | 10 GB/month |
| Cloud Build | 120 build-min/day |
| Artifact Registry | 0.5 GB |
| Firebase Hosting | 10 GB storage, 360 MB/day egress |
| Firebase Auth | 10k MAU |
| Cloud Scheduler | 3 jobs |
| BigQuery | 10 GB storage, 1 TB queries |
| Firestore | 1 GB storage, 50k reads/day |
| Cloud DNS | 1 managed zone |
| Compute Engine | 1 e2-micro in us-central1/us-east1/us-west1 |
