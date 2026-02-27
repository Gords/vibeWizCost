## Infrastructure Requirements Specification

**Project**: goodnight-api
**Source**: https://github.com/Gords/Goodnight-api
**Stack summary**: Node.js 20 / Express 4 REST API + PostgreSQL 16 (Sequelize ORM) — sleep tracking with social follow features
**Scale**: < 1k MAU, < 10k req/day (hobby/portfolio project)
**Availability**: Single-region

---

### Services

| # | Service | Technology | Serving model | Min instances | vCPU | Memory | Stateful | Container |
|---|---------|-----------|---------------|---------------|------|--------|----------|-----------|
| 1 | REST API | Node.js 20 / Express 4 | HTTP server | 1 | 0.25 | 256 MB | No | Yes |

### Data

| Component | Type | Technology | Est. Size | Read/Write | Replication needed | Notes |
|-----------|------|-----------|-----------|------------|-------------------|-------|
| Primary DB | Relational | PostgreSQL 16 | < 1 GB | 70/30 | No (single AZ) | Sequelize ORM; Users, Sleeps, Follows tables |

### Networking

| Property | Value |
|----------|-------|
| External HTTP | Yes |
| WebSockets / SSE | No |
| CDN recommended | No (API-only, no static assets) |
| Estimated monthly egress | Very low (< 1 GB) |
| Custom domain + TLS | Optional |

### Auth

| Property | Value |
|----------|-------|
| Auth library | passport + passport-jwt |
| Session strategy | Stateless JWT (Bearer token) |
| OAuth providers | None |
| MFA | Not detected |

### Background Processing

| Job | Trigger | Frequency | Technology |
|-----|---------|-----------|-----------|
| None detected | — | — | — |

### DevOps

| Property | Value |
|----------|-------|
| Containers | Yes (1 Dockerfile, single-stage, node:20-slim) |
| CI/CD | None detected |
| IaC | None detected |
| Environments detected | development, test, production |
| Secrets management | .env files (no vault detected) |

### Observability

| Property | Value |
|----------|-------|
| Logging | console.error (unstructured) |
| Metrics | None |
| Tracing | None |

### Scale Tier Summary

| Tier | MAU | Req/day | Peak RPS | DB size | Storage |
|------|-----|---------|----------|---------|---------|
| **Current target** | **< 1k** | **< 10k** | **< 1** | **< 1 GB** | **< 1 GB** |
| Growth | 1k–10k | ~50k | ~1 | 1–5 GB | 1–5 GB |
| Scale-up | 10k+ | 100k+ | ~2 | 5–20 GB | 5–20 GB |
