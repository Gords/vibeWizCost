# AWS Pricing Reference (2025)

> All prices USD. us-east-1 (N. Virginia) unless noted.
> Always verify at https://aws.amazon.com/pricing and use the [AWS Pricing Calculator](https://calculator.aws/pricing/2/home).

---

## App Runner

| Resource | Price |
|----------|-------|
| Active compute — vCPU | $0.064 per vCPU-hour |
| Active compute — memory | $0.007 per GB-hour |
| Provisioned (paused) — vCPU | $0.0025 per vCPU-hour |
| Provisioned (paused) — memory | $0.0002 per GB-hour |
| **Free tier (first 12 months)** | 1M requests, 1 vCPU-hour, 2 GB-hours per month |

**Practical estimates:**
- 1 vCPU, 2 GB, always-on (min=1): ~$46/month active compute
- 1 vCPU, 2 GB, min=0 (paused when idle): ~$2/month provisioned + usage
- Spiky workload (2–4 hours active/day): ~$5–20/month

---

## ECS Fargate

| Resource | Price |
|----------|-------|
| vCPU | $0.04048 per vCPU-hour |
| Memory | $0.004445 per GB-hour |
| **Fargate Spot** | ~70% discount vs on-demand |

**Practical estimates (24/7 running):**

| Config | Monthly cost (on-demand) |
|--------|--------------------------|
| 0.25 vCPU, 0.5 GB | ~$5/month |
| 0.5 vCPU, 1 GB | ~$17/month |
| 1 vCPU, 2 GB | ~$35/month |
| 2 vCPU, 4 GB | ~$70/month |
| 4 vCPU, 8 GB | ~$140/month |

---

## RDS for PostgreSQL / MySQL

| Instance | vCPUs | RAM | Monthly price (on-demand) |
|----------|-------|-----|--------------------------|
| db.t3.micro | 2 | 1 GB | ~$15/month |
| db.t3.small | 2 | 2 GB | ~$28/month |
| db.t3.medium | 2 | 4 GB | ~$57/month |
| db.t3.large | 2 | 8 GB | ~$114/month |
| db.r6g.large | 2 | 16 GB | ~$175/month |
| db.r6g.xlarge | 4 | 32 GB | ~$350/month |

**Additional costs:**
- Storage: $0.115/GB/month (gp2) or $0.115/GB/month (gp3, lower I/O cost)
- Multi-AZ: 2x instance price
- Automated backups: free up to DB storage size
- Snapshot storage beyond free: $0.095/GB/month

**Typical setups:**
- MVP: db.t3.micro, 20 GB gp3 = ~$17/month
- Small prod: db.t3.small, 20 GB gp3 = ~$31/month
- Mid prod: db.t3.medium, Multi-AZ, 50 GB gp3 = ~$120/month
- Large prod: db.r6g.large, Multi-AZ, 100 GB gp3 = ~$362/month

---

## Aurora PostgreSQL

| Instance | Monthly price |
|----------|--------------|
| db.t3.medium | ~$60/month |
| db.r6g.large | ~$175/month |
| db.r6g.xlarge | ~$350/month |

**Additional costs:**
- Storage: $0.10/GB/month
- I/O: $0.20 per million requests
- Multi-AZ (1 writer + 1 reader): 2x instance price
- Aurora Serverless v2: $0.12/ACU-hour (min 0.5 ACU)

---

## ElastiCache for Redis

| Node type | vCPUs | RAM | Monthly price |
|-----------|-------|-----|--------------|
| cache.t3.micro | 2 | 0.5 GB | ~$12/month |
| cache.t3.small | 2 | 1.37 GB | ~$25/month |
| cache.t3.medium | 2 | 3.09 GB | ~$48/month |
| cache.r6g.large | 2 | 13.07 GB | ~$156/month |
| cache.r6g.xlarge | 4 | 26.04 GB | ~$312/month |

**Multi-AZ (replication group):** 2x node price (primary + replica)

---

## S3

| Storage class | Price per GB/month |
|--------------|-------------------|
| Standard | $0.023 (first 50 TB) |
| Standard-IA | $0.0125 |
| Glacier Instant Retrieval | $0.004 |
| Glacier Flexible Retrieval | $0.0036 |
| Deep Archive | $0.00099 |

**Request pricing:**
- PUT, POST, COPY (writes): $0.005 per 1,000 requests
- GET, SELECT (reads): $0.0004 per 1,000 requests

**Free tier:**
- First 12 months: 5 GB Standard, 20k GET requests, 2k PUT requests/month

**Typical costs:**
- 10 GB Standard + 100k ops: ~$0.30/month
- 100 GB Standard + 1M ops: ~$2.40/month
- 1 TB Standard: ~$23/month

---

## CloudFront

| Resource | Price |
|----------|-------|
| Egress to internet (US & Europe, first 10 TB) | $0.0085/GB |
| Egress to internet (US & Europe, next 40 TB) | $0.0080/GB |
| HTTPS requests (first 10M/month) | $0.0100 per 10,000 requests |
| **Free tier (permanent)** | 1 TB egress/month + 10M requests/month |

**Typical costs:**
- 100 GB egress/month: ~$0.85/month (often covered by free tier)
- 500 GB egress/month: ~$4.25/month (mostly free tier)
- 1 TB egress/month: ~$8.50/month (mostly free tier)
- 5 TB egress/month: ~$40/month

---

## ALB (Application Load Balancer)

| Resource | Price |
|----------|-------|
| Fixed hourly charge | $0.008/LCU-hour (~$5.76/month base) |
| Per LCU (Load Balancer Capacity Unit) | $0.008/LCU-hour |

**Practical estimates:**
- Light traffic (< 1k req/min): ~$16/month
- Moderate traffic (1k–10k req/min): ~$25/month
- Heavy traffic: $40–80/month

---

## Amazon Cognito

| Tier | Price |
|------|-------|
| MAU ≤ 50,000 | **Free** |
| MAU 50k–100k | $0.0055/MAU |
| MAU 100k–1M | $0.0046/MAU |
| MAU > 1M | $0.0032/MAU |
| SAML/OIDC federation | $0.015/MAU (first 50 MAU free) |
| SMS MFA | $0.01/SMS |

---

## CodeBuild

| Machine type | Specs | Price per build-minute |
|--------------|-------|------------------------|
| build.general1.small | 3 GB RAM, 2 vCPU | $0.005 |
| build.general1.medium | 7 GB RAM, 4 vCPU | $0.010 |
| build.general1.large | 15 GB RAM, 8 vCPU | $0.020 |
| **Free tier** | build.general1.small | 100 min/month |

**Typical costs:**
- Small team (< 100 min/month builds): **Free**
- Medium team (500 min/month, small machine): ~$2.50/month
- Active team (2,000 min/month, small machine): ~$10/month

---

## ECR (Elastic Container Registry)

| Resource | Price |
|----------|-------|
| Private repository storage | $0.10/GB/month |
| Data transfer out (to internet) | $0.09/GB (first 1 GB free) |
| Data transfer to ECS/EKS (same region) | Free |
| **Free tier (permanent)** | 500 MB/month private storage |

**Typical cost: ~$0.50–5/month** for most teams (images usually < 5 GB total).

---

## Route 53

| Resource | Price |
|----------|-------|
| Hosted zone | $0.50/month per zone |
| DNS queries (first 1B/month) | $0.40 per million queries |
| Health checks | $0.50/month per endpoint |

---

## EventBridge Scheduler

| Tier | Price |
|------|-------|
| First 14 million invocations/month | **Free** |
| After 14M invocations | $1.00 per million invocations |

---

## SQS

| Queue type | Price |
|------------|-------|
| First 1M requests/month | **Free** |
| Standard queue (after free tier) | $0.40 per million requests |
| FIFO queue (after free tier) | $0.50 per million requests |

---

## EC2 (if needed for stateful workloads)

| Instance | vCPUs | RAM | On-demand/month | 1-yr reserved/month |
|----------|-------|-----|-----------------|---------------------|
| t3.micro | 2 | 1 GB | ~$8/month | ~$5/month |
| t3.small | 2 | 2 GB | ~$15/month | ~$9/month |
| t3.medium | 2 | 4 GB | ~$30/month | ~$18/month |
| t3.large | 2 | 8 GB | ~$60/month | ~$36/month |
| t3.xlarge | 4 | 16 GB | ~$120/month | ~$72/month |
| m6i.large | 2 | 8 GB | ~$70/month | ~$44/month |
| m6i.xlarge | 4 | 16 GB | ~$140/month | ~$88/month |

**Free tier (first 12 months):** t2.micro, 750 hours/month

---

## EKS (Kubernetes)

| Resource | Price |
|----------|-------|
| EKS cluster management fee | $0.10/hour (~$73/month per cluster) |
| Worker nodes (EC2) | Standard EC2 pricing |
| EKS on Fargate (vCPU) | $0.04048/vCPU-hour |
| EKS on Fargate (memory) | $0.004445/GB-hour |

**Practical minimum:**
- 1 EKS cluster + 2x t3.medium EC2 nodes: ~$133/month
- Recommended minimum for production: ~$150–200/month (cluster fee + nodes)

---

## AWS Free Tier Summary

### Permanent Always-Free

| Service | Always-Free Allowance |
|---------|----------------------|
| CloudFront | 1 TB egress/month + 10M HTTP/HTTPS requests/month |
| Cognito | 50,000 MAU |
| EventBridge Scheduler | 14M scheduler invocations/month |
| SQS | 1M requests/month |
| Lambda | 1M requests/month + 400k GB-seconds compute/month |
| CodeBuild | 100 build-minutes/month (build.general1.small) |
| ECR | 500 MB private repository storage |
| DynamoDB | 25 GB storage + 25 read/write capacity units |
| SNS | 1M publishes/month |
| CloudWatch | 10 custom metrics, 10 alarms, 5 GB log ingestion |

### First 12 Months Only

| Service | 12-Month Free Allowance |
|---------|------------------------|
| S3 | 5 GB Standard storage, 20k GET, 2k PUT/month |
| EC2 | t2.micro, 750 hours/month |
| RDS | db.t2.micro or db.t3.micro, 750 hours/month, 20 GB gp2 |
| App Runner | 1M requests, 1 vCPU-hour, 2 GB-hours/month |
| ALB | 750 hours/month |
| ElastiCache | cache.t2.micro or cache.t3.micro, 750 hours/month |
