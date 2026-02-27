---
name: wiz-cost-aws
description: Map an Infrastructure Requirements Specification (IRS) to Amazon Web Services services and produce a monthly cost estimate. Use when the user wants to know how much it costs to run their app on AWS / Amazon Cloud. Can accept a GitHub URL or local path — will run wiz-infra first if no IRS is available yet.
argument-hint: [github-url-or-path | "production" | "staging"]
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(ls *), Bash(mkdir *), Bash(rm *)
---

# AWS Cost Estimator

You are an Amazon Web Services cost estimation expert. You map infrastructure requirements to AWS services and produce accurate monthly cost estimates.

## Step 1 — Get the Infrastructure Requirements Specification

Check whether an IRS is already available in the conversation context (the user or another skill may have already run `wiz-infra`).

**If an IRS is NOT present:**
- If `$ARGUMENTS` contains a GitHub URL or file path, run the `wiz-infra` skill on it first to produce the IRS, then continue.
- If `$ARGUMENTS` is empty or only contains environment/scale hints (e.g. "production", "50000 users"), run `wiz-infra` on the current directory first.
- Once `wiz-infra` finishes, use its IRS output as input for the steps below.

**If an IRS IS present in context:**
- Use it directly. Do not re-run `wiz-infra`.

Parse any scale or environment override from `$ARGUMENTS`:
- Environment keywords: `production`, `staging`, `dev`, `development`
- User count: any number (e.g. `50000` → 50k MAU)
- These override the IRS's scale tier if provided.

## Step 2 — Map services to AWS

For each service in the IRS, select the best-fit AWS service using [architecture-guide.md](architecture-guide.md).

**Key mapping rules:**

| IRS component | AWS options | Decision factor |
|---------------|-------------|-----------------|
| SSR frontend | App Runner | Simple managed containers |
| SPA/SSG frontend | S3 + CloudFront | Static assets, global CDN, generous free tier |
| HTTP backend API | App Runner (preferred) | Fully managed, auto-scaling |
| Stateful backend | EC2 | Cannot share state across replicas |
| JVM backend | App Runner (always-on) or ECS Fargate | Slow startup → keep warm |
| Queue worker | ECS Fargate (steady) or Lambda (spiky) | On-demand vs constant |
| Cron job | EventBridge Scheduler + Lambda/ECS Task | Standard AWS serverless cron |
| PostgreSQL | RDS for PostgreSQL | Managed, auto-backup, Multi-AZ option |
| MySQL | RDS for MySQL | Managed |
| MongoDB | DocumentDB or MongoDB Atlas on AWS | DocumentDB is wire-compatible |
| Redis | ElastiCache for Redis | Managed |
| Object storage | S3 | Always |
| CDN | CloudFront | Always |
| Auth (custom JWT) | — | No AWS service needed |
| Auth (managed) | Cognito User Pools | Free up to 50k MAU |
| CI/CD | CodeBuild + ECR | Standard AWS DevOps stack |
| WebSockets | API Gateway WebSocket or App Runner | Both support WS |

For each service, note:
- Exact AWS product name
- Tier / instance type / configuration
- Whether it qualifies for Always Free or 12-month free tier

## Step 3 — Calculate costs line by line

Use the pricing tables in [aws-pricing.md](aws-pricing.md) for every service selected.

For App Runner: estimate based on vCPU and memory hours consumed.
- Formula: `(active vCPU-hours × $0.064) + (active GB-hours × $0.007)`
- Always-on instance (min=1, 1 vCPU, 2 GB): ~$46/month active compute

For ECS Fargate: use vCPU and memory hours.
- Formula: `(vCPU-hours × $0.04048) + (GB-hours × $0.004445)`
- 0.5 vCPU, 1 GB, 24/7: ~$17/month

For RDS: use instance tier + storage + Multi-AZ modifier.

For ElastiCache: use node type + replication modifier.

Apply Always Free and 12-month free tier discounts where applicable.

## Step 4 — Output the cost estimate

Determine the output filename from the IRS project name (lowercase, hyphens):
- Create `./cost/` directory if it doesn't exist: `mkdir -p ./cost`
- Write the estimate to `./cost/<project-name>-aws.md` using the Write tool
- After writing, tell the user the file was saved and its path

Present the full estimate in this exact format:

---

```markdown
## AWS Cost Estimate

**Project**: [name from IRS]
**Source**: [path or GitHub URL from IRS]
**Environment**: [Production / Staging / Development]
**Scale**: [MAU and req/day from IRS or argument override]
**Region**: us-east-1 (N. Virginia) — reference region; adjust ±10–15% for other regions

---

### Architecture

[Brief paragraph describing the chosen AWS architecture and why]

---

### Cost Breakdown

| AWS Service | Configuration | Monthly Cost |
|-------------|---------------|-------------|
| App Runner (Frontend) | 1 vCPU, 2 GB, min=1, ~500k req/mo | $XX.XX |
| App Runner (API) | 1 vCPU, 2 GB, min=1, ~1M req/mo | $XX.XX |
| RDS for PostgreSQL | db.t3.small, 20 GB gp3, daily backup | $XX.XX |
| ElastiCache for Redis | cache.t3.micro, 0.5 GB | $XX.XX |
| S3 | Standard, 20 GB + ops | $XX.XX |
| CloudFront | 50 GB egress/mo | $XX.XX |
| CodeBuild + ECR | ~200 min/month, ~2 GB images | $XX.XX |

---

### Summary

| Category | Services | Monthly Cost |
|----------|----------|-------------|
| Compute | App Runner / ECS Fargate (×N) | $XX.XX |
| Data | RDS + ElastiCache + S3 | $XX.XX |
| Networking | CloudFront + ALB | $XX.XX |
| DevOps | CodeBuild + ECR | $XX.XX |
| Auth & misc | Cognito + EventBridge + SQS | $XX.XX |
| **Total** | | **~$XXX/month** |
| **Annual** | | **~$X,XXX/year** |

---

### Always Free Savings

List every service that partially or fully hits the AWS Always Free or 12-month free tier and the exact saving:
- Cognito: free up to 50k MAU → saves ~$X/month
- CloudFront: 1 TB egress + 10M requests/month free (permanent) → saves ~$X/month
- EventBridge Scheduler: first 14M invocations/month free → saves ~$X/month
- SQS: first 1M requests/month free → saves ~$X/month
- CodeBuild: 100 min/month free → saves ~$X/month
- ECR: 500 MB private storage free → saves ~$X/month
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

```

---

If the IRS shows the project is empty or has no detectable stack, state this clearly and produce a parametric estimate based solely on the provided arguments, noting all assumptions made.

> **Compare**: Run /wiz-cost-gcp, /wiz-cost-azure, or /wiz-cost-vercel to see estimates on other providers.
