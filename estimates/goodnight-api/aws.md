## AWS Cost Estimate

**Project**: goodnight-api
**Source**: https://github.com/Gords/Goodnight-api
**Environment**: Production
**Scale**: < 1k MAU, < 10k req/day
**Region**: us-east-1 (N. Virginia) — reference region; adjust ±10–15% for other regions

---

### Architecture

A single AWS App Runner service runs the containerized Node.js/Express API, pulling the image from ECR. App Runner handles TLS termination, auto-scaling, and health checks with zero infrastructure management. RDS for PostgreSQL (db.t3.micro) provides the managed database with automated daily backups. The JWT-based auth runs entirely inside the container — no Cognito needed. At < 1k MAU, this is a deliberately minimal stack; no load balancer, CDN, cache, or queue is required.

---

### Cost Breakdown

| AWS Service | Configuration | Year 1 Cost | Year 2+ Cost |
|-------------|---------------|-------------|--------------|
| App Runner | 0.25 vCPU, 0.5 GB, min=1, ~9k req/mo | $14.04 | $14.04 |
| RDS for PostgreSQL | db.t3.micro, 20 GB gp2, single-AZ, daily backup | $0.00 *(free tier)* | $15.26 |
| ECR | ~150–200 MB image | $0.00 *(Always Free)* | $0.00 |
| CloudWatch Logs | < 1 GB/month log ingestion | $0.00 *(Always Free)* | $0.00 |

---

### Summary

| Category | Services | Year 1 | Year 2+ |
|----------|----------|--------|---------|
| Compute | App Runner | $14.04 | $14.04 |
| Data | RDS for PostgreSQL | $0.00 | $15.26 |
| Networking | — (no CDN/ALB needed) | $0.00 | $0.00 |
| DevOps | ECR | $0.00 | $0.00 |
| Observability | CloudWatch Logs | $0.00 | $0.00 |
| **Total** | | **~$14/month** | **~$29/month** |
| **Annual** | | **~$168/year** | **~$353/year** |

---

### Always Free Savings

- **ECR**: 500 MB private storage/month Always Free → saves ~$0.05/month (image ≈ 150–200 MB)
- **CloudWatch Logs**: 5 GB ingestion/month Always Free → saves ~$0.00 (log volume negligible)
- **RDS db.t3.micro (12-month)**: 750 hrs/month + 20 GB SSD free for first year → saves ~$15.26/month year 1
- **RDS automated backups**: Free up to the size of the DB → saves ~$0.10/month

**Total free tier savings (year 1): ~$15.41/month**

---

### Cost Optimization Tips

1. **Use Lambda + API Gateway instead of App Runner at this scale** — At < 9k req/month, Lambda's Always Free tier (1M req + 400k GB-seconds/month) means $0 compute. API Gateway HTTP API costs $1.00/M requests → effectively free. This saves $14/month vs App Runner. Trade-off: cold starts (~200–500ms) are noticeable but acceptable for a hobby project.

2. **Use RDS Proxy or serverless connection pooling** — If you switch to Lambda, standard `pg` connections will exhaust the db.t3.micro connection limit (66 connections max). Use RDS Proxy ($0.015/vCPU-hour ≈ $10/month) or switch to Neon/Supabase with HTTP-based pooling to avoid this.

3. **Stay on db.t3.micro after free tier expires** — At < 1 GB data and < 10k req/day, db.t3.micro (1 vCPU, 1 GB RAM) is more than sufficient. Resist the urge to upgrade.

4. **Enable RDS automated snapshots retention = 1 day** — Default is 7 days. At this scale, 1-day retention is fine and avoids any snapshot storage costs.

5. **Use ECR lifecycle policies** — Add a policy to keep only the last 3 images. Prevents storage creep from CI/CD pushes accumulating old images over time.

---

### Scale Projections

| Scale | MAU | Est. monthly cost |
|-------|-----|------------------|
| **Current (hobby)** | **< 1k** | **~$14 (yr 1) / ~$29 (yr 2+)** |
| Small | 1k–10k | ~$30–40 (App Runner + RDS t3.small) |
| Growth | 10k–100k | ~$80–150 (App Runner scaled + RDS t3.medium) |
| Scale-up | 100k+ | ~$300–600+ (ECS Fargate + RDS t3.large, Multi-AZ) |

---

### Lambda Alternative (Cost-Optimized for Current Scale)

If cost is the priority, skip App Runner and deploy via Lambda + API Gateway:

| Service | Configuration | Monthly Cost |
|---------|---------------|-------------|
| Lambda | ~9k req × 150ms × 256MB → ~0.09 GB-seconds | $0.00 *(Always Free)* |
| API Gateway (HTTP API) | ~9k requests/month | $0.00 *(< $0.01)* |
| RDS for PostgreSQL | db.t3.micro (same as above) | $0.00 yr 1 / $15.26 yr 2+ |
| **Total** | | **$0/month yr 1 → ~$15/month yr 2+** |

Use `@vendia/serverless-express` or AWS Lambda Web Adapter to wrap the existing Express app with zero code changes.

> **Compare**: Run /wiz-cost-gcp, /wiz-cost-azure, or /wiz-cost-vercel to see estimates on other providers.
