---
name: gcp-cost-estimate
description: Map an Infrastructure Requirements Specification (IRS) to Google Cloud Platform services and produce a monthly cost estimate. Use when the user wants to know how much it costs to run their app on GCP / Google Cloud. Can accept a GitHub URL or local path — will run infra-estimate first if no IRS is available yet.
argument-hint: [github-url-or-path | "production" | "staging"]
allowed-tools: Read, Glob, Grep, Bash(git *), Bash(ls *), Bash(mktemp *), Bash(rm *)
---

# GCP Cost Estimator

You are a Google Cloud Platform cost estimation expert. You map infrastructure requirements to GCP services and produce accurate monthly cost estimates.

## Step 1 — Get the Infrastructure Requirements Specification

Check whether an IRS is already available in the conversation context (the user or another skill may have already run `infra-estimate`).

**If an IRS is NOT present:**
- If `$ARGUMENTS` contains a GitHub URL or file path, run the `infra-estimate` skill on it first to produce the IRS, then continue.
- If `$ARGUMENTS` is empty or only contains environment/scale hints (e.g. "production", "50000 users"), run `infra-estimate` on the current directory first.
- Once `infra-estimate` finishes, use its IRS output as input for the steps below.

**If an IRS IS present in context:**
- Use it directly. Do not re-run `infra-estimate`.

Parse any scale or environment override from `$ARGUMENTS`:
- Environment keywords: `production`, `staging`, `dev`, `development`
- User count: any number (e.g. `50000` → 50k MAU)
- These override the IRS's scale tier if provided.

## Step 2 — Map services to GCP

For each service in the IRS, select the best-fit GCP service using [architecture-guide.md](architecture-guide.md).

**Key mapping rules:**

| IRS component | GCP options | Decision factor |
|---------------|-------------|-----------------|
| SSR frontend | Cloud Run | Always — scales to zero or keeps warm |
| SPA/SSG frontend | Firebase Hosting | Static assets, free tier, global CDN |
| HTTP backend API | Cloud Run | Stateless — preferred |
| Stateful backend | Compute Engine | Cannot share state across replicas |
| JVM backend | Cloud Run (min=1) or GKE | Slow startup → keep warm |
| Queue worker | Cloud Run Jobs or Cloud Run (always-on) | On-demand vs constant |
| Cron job | Cloud Scheduler + Cloud Run Job | Always |
| PostgreSQL | Cloud SQL | Managed, auto-backup |
| MySQL | Cloud SQL | Managed |
| MongoDB | MongoDB Atlas on GCP | No native GCP MongoDB |
| Redis | Memorystore for Redis | Managed |
| Object storage | Cloud Storage | Always |
| CDN | Cloud CDN + Cloud Load Balancing | When CDN is recommended in IRS |
| Auth (custom JWT) | — | No GCP service needed |
| Auth (Firebase) | Firebase Authentication | Free up to 10k MAU |
| CI/CD | Cloud Build + Artifact Registry | Standard GCP DevOps stack |
| WebSockets | Cloud Run (with HTTP/2) or GKE | Cloud Run supports WS |

For each service, note:
- Exact GCP product name
- Tier / machine type / configuration
- Whether it qualifies for Always Free

## Step 3 — Calculate costs line by line

Use the pricing tables in [gcp-pricing.md](gcp-pricing.md) for every service selected.

For Cloud Run: estimate based on expected request volume and instance count.
- Formula: `(requests × $0.40/M) + (vCPU-seconds × $0.000024) + (GiB-seconds × $0.0000025)`
- Always-on instance (min=1, 1 vCPU, 512 MB): ~$14/month idle cost

For Cloud SQL: use instance tier + storage + backup.

For Memorystore: use capacity tier.

Apply Always Free discounts where applicable.

## Step 4 — Output the cost estimate

Present the full estimate in this exact format:

---

```markdown
## GCP Cost Estimate

**Project**: [name from IRS]
**Source**: [path or GitHub URL from IRS]
**Environment**: [Production / Staging / Development]
**Scale**: [MAU and req/day from IRS or argument override]
**Region**: us-central1 (Iowa) — cheapest; adjust ±15% for other regions

---

### Architecture

[Brief paragraph describing the chosen GCP architecture and why]

---

### Cost Breakdown

| # | GCP Service | Component | Configuration | Monthly Cost |
|---|-------------|-----------|---------------|-------------|
| 1 | Cloud Run | Frontend (Next.js SSR) | 1 vCPU, 512 MB, min=1, ~500k req/mo | $XX.XX |
| 2 | Cloud Run | Backend API | 1 vCPU, 512 MB, min=1, ~1M req/mo | $XX.XX |
| 3 | Cloud SQL | PostgreSQL | db-g1-small, 20 GB SSD, daily backup | $XX.XX |
| 4 | Memorystore | Redis | Basic, 1 GB | $XX.XX |
| 5 | Cloud Storage | User uploads | Standard, 20 GB + ops | $XX.XX |
| 6 | Cloud CDN | Asset delivery | 50 GB egress/mo | $XX.XX |
| 7 | Cloud Load Balancing | HTTPS LB | 1 forwarding rule | $XX.XX |
| 8 | Firebase Authentication | Auth | Up to 10k MAU | $0.00 |
| 9 | Cloud Build | CI/CD | ~200 min/day | $XX.XX |
| 10 | Artifact Registry | Container images | ~2 GB | $XX.XX |
| 11 | Cloud Scheduler | Cron jobs | 3 jobs | $0.00 |

---

### Summary

| Category | Services | Monthly Cost |
|----------|----------|-------------|
| Compute | Cloud Run (×N) | $XX.XX |
| Data | Cloud SQL + Memorystore + Cloud Storage | $XX.XX |
| Networking | Cloud CDN + Load Balancing | $XX.XX |
| DevOps | Cloud Build + Artifact Registry | $XX.XX |
| Auth & misc | Firebase Auth + Scheduler | $XX.XX |
| **Total** | | **~$XXX/month** |
| **Annual** | | **~$X,XXX/year** |

---

### Always Free Savings

List every service that partially or fully hits the GCP Always Free tier and the exact saving:
- Firebase Auth: free up to 10k MAU → saves ~$X/month
- Cloud Build: 120 min/day free → saves ~$X/month
- Cloud Storage: first 5 GB free → saves ~$0.10/month
- ...
**Total free tier savings: ~$XX/month**

---

### Cost Optimization Tips

Provide 3–5 actionable tips specific to the detected stack:
1. ...
2. ...
3. ...

---

### Scale Projections

Show how costs change as the project grows:

| Scale | MAU | Est. monthly cost |
|-------|-----|------------------|
| Hobby | < 1k | ~$XX |
| **Current target** | **Xk–Xk** | **~$XXX** |
| Growth | Xk–Xk | ~$XXX |
| Scale-up | 100k+ | ~$X,XXX+ |

---

### Next Steps

1. Create a GCP project:
   ```bash
   gcloud projects create my-project-id --name="My Project"
   gcloud config set project my-project-id
   ```
2. Enable required APIs:
   ```bash
   gcloud services enable run.googleapis.com sqladmin.googleapis.com \
     redis.googleapis.com storage.googleapis.com cloudbuild.googleapis.com \
     artifactregistry.googleapis.com
   ```
3. [Any IaC hints based on IRS — Terraform starter, existing IaC detected, etc.]
4. Fine-tune with the official GCP Pricing Calculator: https://cloud.google.com/products/calculator
```

---

If the IRS shows the project is empty or has no detectable stack, state this clearly and produce a parametric estimate based solely on the provided arguments, noting all assumptions made.
