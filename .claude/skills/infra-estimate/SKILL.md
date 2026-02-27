---
name: infra-estimate
description: Analyze a codebase and produce a provider-agnostic Infrastructure Requirements Specification (IRS). Use when the user wants to understand what compute, database, storage, and networking resources their app needs to run — regardless of cloud provider. Accepts a GitHub URL or local path as argument, or analyzes the current directory.
argument-hint: [github-url-or-path]
allowed-tools: Read, Glob, Grep, Bash(git *), Bash(ls *), Bash(cat *), Bash(mktemp *), Bash(rm *)
---

# Infrastructure Requirements Estimator

You are a cloud infrastructure analyst. Your job is to deeply analyze a codebase and produce a standardized, provider-agnostic **Infrastructure Requirements Specification (IRS)** that any cloud cost estimator skill can consume.

## Step 1 — Resolve the source

Parse `$ARGUMENTS`:

- **GitHub URL** (e.g. `https://github.com/org/repo` or `github.com/org/repo`):
  ```bash
  TMPDIR=$(mktemp -d)
  git clone --depth=1 <url> $TMPDIR
  ```
  Analyze `$TMPDIR`, then note the source URL in the IRS. Do NOT delete the clone — Claude Code will clean up temp dirs automatically.

- **Local path** (absolute or relative, e.g. `./packages/api` or `/home/user/myapp`):
  Analyze that path directly.

- **No argument**:
  Analyze the current working directory.

## Step 2 — Detect the monorepo structure

First run a broad scan to understand the layout:

1. Check for monorepo tooling: `package.json` (workspaces), `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, `Cargo.toml` (workspace), `go.work`
2. List top-level directories and `packages/`, `apps/`, `services/` subdirectories
3. Identify distinct deployable services (frontend, backend, workers, etc.)

For each service found, record its **root path** for deep analysis.

## Step 3 — Analyze each service

For every deployable unit, detect the following. Use the detection patterns in [stack-patterns.md](stack-patterns.md).

### Compute profile
- **Runtime**: language + version (Node 20, Python 3.12, Go 1.22, Java 21, Rust, etc.)
- **Framework**: Express, FastAPI, Django, Gin, Spring Boot, etc.
- **Serving model**: HTTP server / SSR / SPA / worker / cron / CLI
- **Stateful?**: does it write to local disk or hold in-memory state that can't be replicated?
- **Containerized?**: Dockerfile present?
- **Startup time**: fast (Go/Rust/Node) vs slow (JVM, Python with heavy imports)
- **Estimated CPU**: low (< 0.5 vCPU) / medium (0.5–2 vCPU) / high (2+ vCPU)
- **Estimated memory**: low (< 256 MB) / medium (256 MB–1 GB) / high (1 GB+)

### Data layer
Scan for ORM configs, DB client imports, connection strings in `.env.example`, `config/`, `docker-compose*`:
- **Primary database**: type (PostgreSQL, MySQL, SQLite, MongoDB, DynamoDB, etc.) + ORM if any
- **Cache**: Redis, Memcached, in-process (node-cache, etc.)
- **Search**: Elasticsearch, Typesense, Algolia, pg full-text
- **File/blob storage**: S3 client, GCS client, local disk uploads, multer, sharp
- **Message queue**: Redis (BullMQ/Bee-Queue), RabbitMQ, Kafka, SQS, Pub/Sub
- **Realtime**: WebSocket server (socket.io, ws), SSE

### Frontend specifics (if applicable)
- **Rendering**: SSR / SSG / SPA / ISR
- **Bundle size signal**: check `next.config.*`, `vite.config.*`, presence of `public/` assets
- **CDN-ready?**: static output or needs a server?

### Auth
- Scan imports and config for: next-auth, passport, lucia, better-auth, firebase-admin, supabase, auth0, clerk, jwt, oauth

### Background processing
- Workers: BullMQ, Celery, Sidekiq, pg-boss, Faktory
- Cron: node-cron, APScheduler, crontab entries in Dockerfile
- Event consumers: Kafka consumer, Pub/Sub subscriber, SQS poller

### DevOps signals
- Dockerfile(s): how many, multi-stage?
- docker-compose: services defined?
- CI/CD: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `cloudbuild.yaml`
- IaC: `terraform/`, `pulumi/`, `cdk/`, `helm/`
- Environment files: `.env.example` — list all unique service names hinted

### Observability
- Logging: structured (pino, winston, structlog) vs console
- Metrics: Prometheus client, statsd, OpenTelemetry
- Tracing: OpenTelemetry, Jaeger, Datadog

## Step 4 — Ask clarifying questions

After scanning, if any of these are still unknown, ask the user (group all questions together in one message):

1. **Expected scale** — monthly active users: `< 1k` / `1k–10k` / `10k–100k` / `100k+`
2. **Availability** — single-region OK, or multi-region/HA required?
3. **Database size** — current or expected: `< 1 GB` / `1–20 GB` / `20–100 GB` / `100 GB+`
4. **File storage** — total expected: `none` / `< 10 GB` / `10–100 GB` / `100 GB+`
5. **Team size** — for CI/CD build frequency: `solo` / `2–5` / `5–20` / `20+`

Skip questions that can be confidently inferred from the codebase.

## Step 5 — Produce the IRS

Output the Infrastructure Requirements Specification in exactly this format so other skills can parse it reliably:

---

```markdown
## Infrastructure Requirements Specification

**Project**: [name — from package.json / go.mod / repo name]
**Source**: [local path or GitHub URL]
**Stack summary**: [one-line, e.g. "Next.js 14 SSR + Node/Express REST API + PostgreSQL + Redis"]
**Scale**: [e.g. "10k–100k MAU, ~500k req/day"]
**Availability**: [single-region / multi-region HA]

---

### Services

| # | Service | Technology | Serving model | Min instances | vCPU | Memory | Stateful | Container |
|---|---------|-----------|---------------|---------------|------|--------|----------|-----------|
| 1 | Frontend | Next.js 14 (App Router) | SSR/ISR | 1 | 0.5 | 512 MB | No | Yes |
| 2 | Backend API | Node.js 20 / Express | HTTP server | 1 | 1 | 512 MB | No | Yes |
| 3 | Email worker | Node.js / BullMQ | Queue consumer | 1 | 0.25 | 256 MB | No | Yes |

### Data

| Component | Type | Technology | Est. Size | Read/Write | Replication needed | Notes |
|-----------|------|-----------|-----------|------------|-------------------|-------|
| Primary DB | Relational | PostgreSQL 16 | 5–20 GB | 80/20 | No (single AZ) | Drizzle ORM |
| Cache | Key-value | Redis | 512 MB | 95/5 | No | Sessions + BullMQ |
| File storage | Object | S3-compatible | 10–50 GB | 90/10 | No | User uploads (images) |

### Networking

| Property | Value |
|----------|-------|
| External HTTP | Yes |
| WebSockets / SSE | No |
| CDN recommended | Yes (static assets + SSR caching) |
| Estimated monthly egress | Medium (10–100 GB) |
| Custom domain + TLS | Yes |

### Auth

| Property | Value |
|----------|-------|
| Auth library | better-auth |
| Session strategy | Database sessions (PostgreSQL) |
| OAuth providers | Google, GitHub |
| MFA | Not detected |

### Background Processing

| Job | Trigger | Frequency | Technology |
|-----|---------|-----------|-----------|
| Send emails | Queue | On-demand | BullMQ + Resend |
| Cleanup stale sessions | Cron | Daily | node-cron |

### DevOps

| Property | Value |
|----------|-------|
| Containers | Yes (2 Dockerfiles, multi-stage) |
| CI/CD | GitHub Actions (2 workflows) |
| IaC | None detected |
| Environments detected | development, production |
| Secrets management | .env files (no vault detected) |

### Observability

| Property | Value |
|----------|-------|
| Logging | Structured (pino) |
| Metrics | None |
| Tracing | None |

### Scale Tier Summary

| Tier | MAU | Req/day | Peak RPS | DB size | Storage |
|------|-----|---------|----------|---------|---------|
| Hobby | < 1k | < 10k | < 1 | < 1 GB | < 5 GB |
| **Current target** | **10k–100k** | **~500k** | **~10** | **5–20 GB** | **10–50 GB** |
| Growth ceiling | 500k+ | 5M+ | 100+ | 50 GB+ | 200 GB+ |
```

---

After outputting the IRS, add a short paragraph suggesting which cloud cost estimator skills to run next, e.g.:

> **Next step**: Run `/gcp-cost-estimate` to map these requirements to Google Cloud services and get a monthly cost estimate.
