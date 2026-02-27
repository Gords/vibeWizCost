# AWS Architecture Decision Guide

## Frontend Deployment

| Frontend Type | Recommended Service | Why |
|--------------|---------------------|-----|
| Static SPA (React, Vue, Angular) | **S3 + CloudFront** | Cheapest, global CDN, generous free tier |
| SSR (Next.js, Nuxt, SvelteKit) | **App Runner** | Fully managed containers, auto-scaling |
| SSR high-traffic (> 100k MAU) | **ECS Fargate + ALB + CloudFront** | Fine-grained autoscale, cache SSR at edge |
| Custom server (Express serving React) | **App Runner** | Same as SSR — simplest managed option |

## Backend Deployment

| Backend Scale | Recommended Service | Why |
|--------------|---------------------|-----|
| < 1k MAU / infrequent requests | **App Runner** (min-instances: 0) | Scales to zero, cheapest; provisioned cost when idle |
| 1k–50k MAU | **App Runner** (min-instances: 1) | Consistent latency, no cold starts |
| 50k–500k MAU | **ECS Fargate + ALB** (autoscale) | HA, horizontal scaling, granular control |
| > 500k MAU / complex workloads | **EKS** (Kubernetes) | Full orchestration, fine-grained resource control |
| Long-running / stateful | **EC2** (t3 or m6i family) | Persistent VMs, no container overhead |

## Database

| DB Type | Recommended Service | Notes |
|---------|---------------------|-------|
| PostgreSQL | **RDS for PostgreSQL** | Managed, auto-backups, Multi-AZ option |
| MySQL | **RDS for MySQL** | Managed, Multi-AZ option |
| Large-scale PostgreSQL (> 10k QPS) | **Aurora PostgreSQL** | Up to 5x throughput vs RDS, serverless option |
| MongoDB | **DocumentDB** (wire-compatible) or **MongoDB Atlas on AWS** | Atlas preferred for full MongoDB feature parity |
| Redis / cache | **ElastiCache for Redis** | Managed Redis, cluster mode available |
| NoSQL / key-value | **DynamoDB** | Serverless, free tier, global tables |
| Analytics / data warehouse | **Redshift** | Serverless or provisioned columnar SQL |

## File Storage

| Use Case | Service |
|----------|---------|
| User uploads, images, videos | **S3 Standard** |
| Infrequent access (archives, backups) | **S3 Standard-IA** or **S3 Glacier Instant** |
| CDN for media delivery | **CloudFront** fronting S3 |

## Background Jobs & Queues

| Use Case | Service |
|----------|---------|
| Message queue (standard, at-least-once) | **SQS Standard** |
| Message queue (ordered, exactly-once) | **SQS FIFO** |
| Scheduled jobs / cron | **EventBridge Scheduler** → Lambda or ECS Task |
| Long-running batch jobs | **ECS Fargate Tasks** (on-demand) |
| Workflow orchestration | **Step Functions** |

## Networking

| Need | Service |
|------|---------|
| Load balancer (HTTP/HTTPS) | **ALB** (Application Load Balancer) |
| CDN | **CloudFront** |
| Private network | **VPC** (free) |
| DNS | **Route 53** ($0.50/zone/month) |
| DDoS + WAF | **AWS Shield Standard** (free) + **WAF** (paid) |

## Auth

| Auth Use Case | Service |
|--------------|---------|
| User auth (email, OAuth, social login) | **Cognito User Pools** (free up to 50k MAU) |
| AWS resource access for authenticated users | **Cognito Identity Pools** |
| Enterprise SSO / SAML / OIDC federation | **Cognito User Pools** (SAML costs $0.015/MAU) |
| Service-to-service auth | **IAM Roles** (free) |

## CI/CD

| Use Case | Service |
|----------|---------|
| Build containers | **CodeBuild** (100 min/month free) |
| Store Docker images | **ECR** (Elastic Container Registry) |
| Pipeline orchestration | **CodePipeline** |
| Deploy on push | **CodeBuild + CodePipeline** or GitHub Actions → ECR/ECS |

## Typical Architectures by Scale

### Hobby / MVP (< 1k MAU)
```
S3 + CloudFront (frontend SPA)  OR  App Runner (frontend SSR, min=0)
App Runner (backend API, min=0)
RDS db.t3.micro (PostgreSQL, 20 GB gp3)
S3 (uploads)
Cognito User Pools
Total: ~$20–50/month
```

### Small SaaS (1k–10k MAU)
```
App Runner (frontend SSR, min=1)  OR  S3 + CloudFront (SPA)
App Runner (backend API, min=1)
RDS db.t3.small (PostgreSQL, 20 GB gp3)
ElastiCache cache.t3.micro (Redis)
S3 + CloudFront
ALB (if multiple services)
Cognito User Pools
CodeBuild + ECR
Total: ~$120–280/month
```

### Growing SaaS (10k–100k MAU)
```
ECS Fargate (frontend, autoscale 2–6 tasks)
ECS Fargate (backend, autoscale 2–6 tasks)
RDS db.t3.medium (PostgreSQL, Multi-AZ, 50 GB gp3)
ElastiCache cache.t3.small (Redis)
S3 + CloudFront
ALB
Cognito User Pools / Identity Platform
CodeBuild + ECR
Total: ~$450–1,100/month
```

### Scale-up (100k+ MAU)
```
EKS or ECS Fargate (frontend + backend pods, autoscale)
Aurora PostgreSQL (Multi-AZ + 1–2 read replicas)
ElastiCache r6g.large (Redis cluster mode)
S3 + CloudFront + WAF
ALB (multi-target group)
Global Accelerator (optional, for latency-sensitive)
Cognito + IAM
CodeBuild + ECR + CodePipeline
Total: ~$2,000–7,000+/month
```
