# GCP Architecture Decision Guide

## Frontend Deployment

| Frontend Type | Recommended Service | Why |
|--------------|---------------------|-----|
| Static SPA (React, Vue, Angular) | **Firebase Hosting** or **Cloud Storage + Cloud CDN** | Cheapest, global CDN, free tier |
| SSR (Next.js, Nuxt, SvelteKit) | **Cloud Run** | Serverless containers, scales to zero |
| SSR high-traffic (>100k MAU) | **Cloud Run** + **Cloud CDN** | Cache SSR responses at edge |
| Custom server (Express serving React) | **Cloud Run** | Same as SSR |

## Backend Deployment

| Backend Scale | Recommended Service | Why |
|--------------|---------------------|-----|
| < 1k MAU / infrequent requests | **Cloud Run** (min-instances: 0) | Scales to zero, cheapest |
| 1k–50k MAU | **Cloud Run** (min-instances: 1) | Consistent latency, no cold starts |
| 50k–500k MAU | **Cloud Run** (min-instances: 2–5) + **Cloud Load Balancing** | HA, horizontal scaling |
| > 500k MAU / complex workloads | **GKE Autopilot** | Full Kubernetes, fine-grained control |
| Long-running / stateful | **Compute Engine** (e2-standard-2) | Persistent VMs |

## Database

| DB Type | Recommended Service | Notes |
|---------|---------------------|-------|
| PostgreSQL | **Cloud SQL for PostgreSQL** | Managed, auto-backups |
| MySQL | **Cloud SQL for MySQL** | Managed |
| Large-scale PostgreSQL (>10k QPS) | **AlloyDB** | 4x faster than Cloud SQL |
| MongoDB | **MongoDB Atlas on GCP** (3rd party) or migrate to Firestore | |
| Redis / cache | **Memorystore for Redis** | Managed Redis |
| NoSQL / Firestore | **Firestore** | Serverless, free tier |
| Analytics / data warehouse | **BigQuery** | Serverless SQL |

## File Storage

| Use Case | Service |
|----------|---------|
| User uploads, images, videos | **Cloud Storage** (Standard class) |
| Infrequent access (archives, backups) | **Cloud Storage** (Nearline / Coldline) |
| CDN for media | **Cloud CDN** fronting Cloud Storage |

## Background Jobs & Queues

| Use Case | Service |
|----------|---------|
| Message queue / event streaming | **Pub/Sub** |
| Scheduled jobs / cron | **Cloud Scheduler** → Cloud Run |
| Long-running batch jobs | **Cloud Run Jobs** |
| Workflow orchestration | **Cloud Workflows** |

## Networking

| Need | Service |
|------|---------|
| Custom domain + TLS | **Cloud Load Balancing** (HTTPS LB) |
| CDN | **Cloud CDN** |
| Private VPC | **VPC** (free) + **Cloud NAT** |
| DNS | **Cloud DNS** |

## Auth

| Auth Use Case | Service |
|--------------|---------|
| User auth (email, OAuth, social) | **Firebase Authentication** (free up to 10k/mo) |
| Enterprise SSO, SAML | **Identity Platform** |
| Service-to-service auth | **IAM + Service Accounts** (free) |

## CI/CD

| Use Case | Service |
|----------|---------|
| Build containers | **Cloud Build** (120 min/day free) |
| Store Docker images | **Artifact Registry** |
| Deploy on push | **Cloud Build triggers** |

## Typical Architectures by Scale

### Hobby / MVP (< 1k MAU)
```
Firebase Hosting (frontend SPA)
Cloud Run (backend API, min=0)
Cloud SQL db-f1-micro (PostgreSQL)
Cloud Storage (uploads)
Firebase Auth
Total: ~$15–40/month
```

### Small SaaS (1k–10k MAU)
```
Cloud Run (frontend SSR, min=1)
Cloud Run (backend API, min=1)
Cloud SQL db-g1-small (PostgreSQL)
Memorystore Redis Basic (1GB)
Cloud Storage + Cloud CDN
Cloud Load Balancing (HTTPS)
Firebase Auth
Cloud Build
Total: ~$80–200/month
```

### Growing SaaS (10k–100k MAU)
```
Cloud Run (frontend, min=2, autoscale)
Cloud Run (backend, min=2, autoscale)
Cloud SQL db-custom-2-7680 (HA)
Memorystore Redis Standard (2GB)
Cloud Storage + Cloud CDN
Cloud Load Balancing
Firebase Auth / Identity Platform
Cloud Build
Artifact Registry
Total: ~$300–800/month
```

### Scale-up (100k+ MAU)
```
GKE Autopilot (frontend + backend pods)
Cloud SQL Enterprise (HA, read replicas) or AlloyDB
Memorystore Redis (HA, 5GB+)
Cloud Storage + Cloud CDN
Cloud Load Balancing (global)
Cloud Armor (WAF/DDoS)
Identity Platform
Cloud Build + Artifact Registry
Total: ~$1,500–5,000+/month
```
