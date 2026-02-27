# GCP Cost Estimate — goodnight-api

**Provider**: Google Cloud Platform (us-central1)
**Generated**: 2026-02-27
**Stack**: Node.js 20 / Express 4 + PostgreSQL 16 (Sequelize)
**Scale tier**: Hobby / Portfolio — < 1k MAU, < 10k req/day

---

## Architecture

### Recommended setup for current scale

```
Internet
    │
    ▼
Cloud Run  (goodnight-api container)
    │  min-instances: 0  │  0.25 vCPU  │  256 MB
    │  HTTPS via *.run.app (no LB needed)
    │
    ▼
Cloud SQL for PostgreSQL
    │  db-f1-micro  │  10 GB SSD  │  Single-AZ
    │  Automated daily backups
```

**Why this setup:**

| Decision | Rationale |
|----------|-----------|
| Cloud Run (min=0) | Scales to zero overnight; fully inside free tier at < 10k req/day |
| No Cloud Load Balancing | Cloud Run provides HTTPS + custom domain mapping natively — saves ~$18/month |
| db-f1-micro | Adequate for < 1 GB data and < 1 RPS; cheapest managed Postgres tier |
| No Memorystore Redis | No caching layer needed; stateless JWT removes session storage requirement |
| No Artifact Registry / Cloud Build | No CI/CD detected; manual deploy via `gcloud run deploy` is sufficient |

---

## Line-Item Cost Breakdown

### Cloud Run — REST API

| Resource | Usage / month | Free tier | Billable | Unit price | Cost |
|----------|--------------|-----------|----------|------------|------|
| Requests | ~300k (10k/day × 30) | 2,000k | 0 | $0.40/M | **$0.00** |
| vCPU-seconds | ~7,500 (300k req × 0.1s × 0.25 vCPU) | 360,000 | 0 | $0.000024 | **$0.00** |
| GiB-seconds | ~7,500 (300k req × 0.1s × 0.25 GiB) | 180,000 | 0 | $0.0000025 | **$0.00** |
| **Subtotal** | | | | | **$0.00** |

### Cloud SQL — PostgreSQL 16

| Resource | Usage / month | Unit price | Cost |
|----------|--------------|------------|------|
| db-f1-micro instance (24×7) | 730 hours | ~$7.00 flat | **$7.00** |
| SSD storage | 10 GB | $0.17/GB | **$1.70** |
| Automated backups | ~1 GB retained | $0.08/GB | **$0.08** |
| Data egress (Cloud Run → Cloud SQL, same region) | — | Free | **$0.00** |
| **Subtotal** | | | **$8.78** |

### Networking

| Resource | Usage / month | Free tier | Billable | Unit price | Cost |
|----------|--------------|-----------|----------|------------|------|
| Internet egress (API responses) | < 1 GB | 1 GB | 0 | $0.08/GB | **$0.00** |
| Ingress | Any | Free | — | — | **$0.00** |
| Custom domain mapping (Cloud Run) | — | Free | — | — | **$0.00** |
| **Subtotal** | | | | | **$0.00** |

### Other Services

| Service | Status | Cost |
|---------|--------|------|
| Firebase Authentication | Not needed — app uses own JWT via passport-jwt | $0.00 |
| Cloud Scheduler | No background jobs detected | $0.00 |
| Cloud Storage | No file uploads detected | $0.00 |
| Cloud CDN | API-only, no static assets | $0.00 |

---

## Monthly Cost Summary

| Component | Monthly cost |
|-----------|-------------|
| Cloud Run (REST API) | $0.00 |
| Cloud SQL db-f1-micro + 10 GB SSD | $8.78 |
| Networking | $0.00 |
| **Total estimated** | **~$9/month** |

> The dominant cost is the Cloud SQL instance, which runs continuously regardless of traffic.
> Cloud Run is entirely within GCP's always-free tier at current request volume.

---

## Optimization Tips

**1. Use Cloud Run min-instances: 0 (already recommended)**
Cold starts for a Node.js 20 slim container are typically 1–3 seconds. Acceptable for a portfolio project with no SLA.

**2. Shut down Cloud SQL when not in use**
GCP allows scheduling instance stop/start. For a hobby project with infrequent use, stopping the DB nights and weekends can cut Cloud SQL cost by 50–65% (~$3–5/month total).

**3. Avoid Cloud Load Balancing until needed**
Cloud Run's built-in HTTPS endpoint handles TLS and custom domains for free. Adding a global HTTPS LB would add ~$18/month with no benefit at this scale.

**4. Use a `.env` secret via Secret Manager if deploying to production**
Currently using `.env` files. Cloud Run supports `--set-secrets` from Secret Manager — first 6 secret versions free. Avoids committing credentials.

**5. Enable Cloud SQL Storage Auto-increase cautiously**
Auto-increase only grows, never shrinks. Start at 10 GB and manually resize as needed.

**6. Consider `db-f1-micro` connection limits**
db-f1-micro allows ~25 connections. Sequelize default pool max is 5, so this is fine for a single Cloud Run instance but will need adjustment if concurrent instances grow.

---

## Scale Projections

| Tier | MAU | Req/day | Architecture change | Est. monthly cost |
|------|-----|---------|--------------------|--------------------|
| **Current** | **< 1k** | **< 10k** | Cloud Run (min=0) + db-f1-micro | **~$9** |
| Growth | 1k–10k | ~50k | Cloud Run (min=1) + db-g1-small + backups | **~$45–60** |
| Scale-up | 10k–50k | ~100k | Cloud Run (min=2) + db-custom-1-3840 + HTTPS LB | **~$120–180** |
| Production | 50k+ MAU | 500k+ | Cloud Run autoscale + db-custom-2-7680 HA + Redis | **~$300–500** |

### Growth tier detail (~$50/month)
- Cloud Run min=1 to eliminate cold starts for real users: ~$14/month
- Cloud SQL db-g1-small (1.7 GB RAM handles larger connection pools): ~$29/month
- Backups 5 GB: ~$0.40/month
- Egress up to 5 GB: ~$0.40/month

### Scale-up tier detail (~$150/month)
- Cloud Run min=2, autoscale to 10: ~$28/month
- Cloud SQL db-custom-1-3840 (dedicated vCPU): ~$51/month
- 20 GB SSD storage: ~$3.40/month
- Cloud Load Balancing (HTTPS): ~$18/month
- Egress 20 GB: ~$1.60/month

---

## Deployment Checklist

- [ ] Build container: `docker build -t goodnight-api .`
- [ ] Push to Artifact Registry or use Cloud Build
- [ ] Deploy: `gcloud run deploy goodnight-api --image ... --region us-central1 --allow-unauthenticated --set-secrets DATABASE_URL=...`
- [ ] Create Cloud SQL instance: `gcloud sql instances create goodnight-db --database-version=POSTGRES_16 --tier=db-f1-micro --region=us-central1`
- [ ] Connect Cloud Run to Cloud SQL via Cloud SQL Auth Proxy (built into Cloud Run via `--add-cloudsql-instances`)
- [ ] Map custom domain (optional): `gcloud run domain-mappings create --service goodnight-api --domain api.yourdomain.com`
