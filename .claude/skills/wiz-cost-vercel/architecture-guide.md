# Vercel Architecture Decision Guide

Use this guide when assessing whether Vercel is the right deployment platform for a given IRS, and when selecting complementary services for infrastructure Vercel doesn't cover natively.

---

## When Vercel Is the Right Choice

Vercel excels when:

- The project is a **monorepo with Next.js, SvelteKit, Nuxt, Remix, or Astro** as the primary framework — these get first-class support with zero config
- The team wants **zero-config CI/CD and preview deployments** — every pull request gets a live URL automatically
- The backend is primarily **Next.js API routes, Route Handlers, or Edge Functions** — these map directly to Vercel's serverless model
- The project follows a **JAMstack or serverless-first architecture** — short-lived stateless functions, CDN-cached static assets, and external managed services for state
- The team is **prioritizing developer experience and fast iteration** over infrastructure control — Vercel abstracts away almost all ops
- The project has **variable or unpredictable traffic** — serverless auto-scales to zero and handles spikes without pre-provisioning

---

## When to Consider Alternatives

Vercel has real limitations. Consider alternatives when:

- **Long-running background workers** are needed — Vercel functions have a max 300s timeout (Pro). For jobs that run longer, use Inngest, Trigger.dev, Railway, or a full cloud with persistent compute
- **Persistent WebSocket servers** are required — Vercel is stateless and does not support persistent connections. Use Railway, Fly.io, or a full cloud
- **Non-JS/TS backends** dominate the stack — Python (FastAPI, Django, Flask), Go, or Rust APIs can be deployed to Vercel but with a degraded experience. Better options: Railway, Render, Google Cloud Run, or AWS Lambda natively
- **Very high API traffic** exceeds ~100M requests/month — Vercel serverless function costs can exceed equivalent full-cloud costs at that scale; run the numbers
- **Complex microservices architectures** with many services — each service as a Vercel project works, but the operational model gets complex; a full cloud with container orchestration may be more economical
- **Stateful workloads** of any kind — databases, in-memory session stores, socket servers — Vercel cannot host these; they must be external

---

## Vercel Native Features (Included in All Plans)

These are provided by Vercel itself — no external service needed:

- **Global Edge Network CDN** — Assets and edge-cached responses served from 100+ regions worldwide; no configuration required
- **Preview deployments** — Every push to a non-production branch gets a unique, shareable URL for review and QA
- **Automatic HTTPS / SSL** — Free TLS certificates via Let's Encrypt, auto-renewed, for all custom domains
- **Git integration** — Native GitHub, GitLab, and Bitbucket integration; deploy on push
- **Environment variables** — Scoped per environment (production, preview, development); encrypted at rest
- **Vercel Analytics** — Web Vitals monitoring (Core Web Vitals, real user metrics); Basic on Hobby, Advanced on Pro
- **Cron Jobs** — Scheduled serverless function invocations; 2 jobs max 1/day on Hobby, 40 jobs max 1/minute on Pro
- **Instant rollback** — Revert to any previous deployment instantly via the dashboard or CLI
- **Build cache** — Turbo-powered build caching for faster subsequent builds
- **Concurrent builds** — 1 on Hobby, 3 on Pro, custom on Enterprise

---

## Recommended External Services by Category

### Database

| Service | Type | Best For | Pricing |
|---|---|---|---|
| **Neon** (via Vercel Postgres) | Serverless Postgres | Next.js apps, serverless-native, native Vercel integration | Free tier; $19/month (Launch); $69/month (Scale) |
| **Supabase** | Postgres + auth + storage + realtime | All-in-one for early-stage apps; replaces multiple services | Free tier (500 MB); $25/month (Pro) |
| **PlanetScale** | Serverless MySQL | Teams comfortable with MySQL, branching model for schema changes | Free tier (5 GB); $39/month (Scaler) |
| **Turso** | SQLite at edge (libSQL) | Read-heavy workloads, ultra-low latency reads, very low cost | Free tier (9 GB); $29/month (Scaler) |
| **MongoDB Atlas** | Document DB | Existing Mongo apps, flexible schema, aggregation pipelines | Free tier (512 MB); $57+/month (M10) |

**Recommendation**: Default to Neon (via Vercel Postgres integration) for Postgres. Use Supabase when you also need auth and storage in one place.

### Auth

| Service | Best For | Free Tier | Pricing |
|---|---|---|---|
| **Clerk** | Best DX for React/Next.js, drop-in UI components, webhooks | 10,000 MAU free | $25/month + $0.02/MAU after 10k |
| **Auth.js (NextAuth)** | Open source, self-managed, maximum control | Free (open source) | Free (but you manage session storage) |
| **Supabase Auth** | Projects already using Supabase; good OAuth and magic link support | Included with Supabase | Included with Supabase plan |
| **Auth0** | Enterprise, compliance requirements, complex social login needs | 7,500 MAU free | $23/month (Essential); custom (Enterprise) |

**Recommendation**: Use Clerk for most Next.js projects — the DX is unmatched and 10k MAU free is generous for early-stage. Use Auth.js for maximum control or when you want zero vendor dependency.

### Background Jobs and Queues

| Service | Model | Best For | Pricing |
|---|---|---|---|
| **Inngest** | Event-driven serverless functions | Native Vercel integration, durable execution, retries, fan-out | Free (5k runs/month); $20/month (Basic, 50k runs) |
| **Trigger.dev** | Open-source background jobs | Next.js native, self-hostable, long-running tasks | Free (25k runs/month); $50/month (Pro) |
| **Upstash QStash** | HTTP-based message queue | Simple queuing without a persistent server, serverless-native | Free (500 msgs/day); $1/month per 100k msgs |
| **Vercel Background Functions** | Long-running serverless functions | Tasks up to 15 minutes, no extra service needed | Included in Pro (counts as function execution time) |

**Recommendation**: Use Inngest for event-driven workflows and background jobs — it integrates natively with Vercel and handles retries, delays, and fan-out elegantly. Use Upstash QStash for simple fire-and-forget queuing.

### File / Object Storage

| Service | Egress Fees | Best For | Pricing |
|---|---|---|---|
| **Vercel Blob** | $0.08/GB | Simple uploads in Next.js apps, native integration | $0.023/GB/month + ops |
| **Cloudflare R2** | Free (no egress fees) | High-traffic apps, media serving, cost-sensitive; S3-compatible | $0.015/GB/month (after 10 GB free) |
| **AWS S3** | $0.09/GB | Ecosystem compatibility, existing AWS infrastructure | $0.023/GB/month + transfer |
| **Supabase Storage** | Included | Projects already using Supabase | Included with Supabase plan |

**Recommendation**: Use Vercel Blob for simple user uploads and small-scale storage. Switch to Cloudflare R2 when egress costs matter — R2 has zero egress fees, which is a major advantage for media-heavy apps.

### Cache / Redis

| Service | Best For | Pricing |
|---|---|---|
| **Vercel KV** (Upstash) | Session caching, rate limiting, short-lived data; native Vercel integration | Free (30k req/month); Included in Pro (500k req/month) |
| **Upstash Redis** (direct) | Same as Vercel KV but with more configuration options and higher limits | Free (10k cmd/day); PAYG ($0.2/100k commands) |
| **Railway Redis** | Persistent Redis with more memory, longer TTLs | $5/month for small instance |

**Recommendation**: Start with Vercel KV (included in Pro plan). Migrate to direct Upstash or Railway Redis when you need more than 500k commands/month or need persistence guarantees.

### Email

| Service | Best For | Free Tier | Pricing |
|---|---|---|---|
| **Resend** | Best DX for Next.js/React, simple API, React Email templates | 3,000 emails/month, 100/day | $20/month (Pro, 50k emails) |
| **SendGrid** | High volume, existing integrations, deliverability tooling | 100 emails/day | $19.95/month (Essentials, 50k emails) |
| **Postmark** | Transactional email, high deliverability, detailed analytics | 100 emails/month | $15/month (10k emails) |

**Recommendation**: Use Resend for new Next.js projects — the React Email integration is excellent and the free tier covers most early-stage apps.

---

## Typical Architectures by Scale

### Hobby / MVP (< 1k MAU)

Everything free, zero to minimal cost:

```
Vercel Hobby (free)
├── Next.js App Router (SSR + API routes)
├── Neon Postgres free tier (0.5 GB storage, 191 compute hours)
├── Vercel KV free tier (30k req/month, 256 MB)
├── Vercel Blob (minimal uploads)
├── Auth.js / NextAuth (open source, uses Postgres for sessions)
└── Resend (free tier, 3k emails/month)

Vercel cost: $0/month
External services: $0/month (all on free tiers)
Grand total: ~$0–5/month
```

When to upgrade: when you add a second team member, need cron jobs more frequent than 1/day, or need > 300s function timeouts.

---

### Small SaaS (1k–10k MAU)

Pro plan unlocks team features and higher limits:

```
Vercel Pro ($20/month)
├── Next.js (SSR + API routes, ~1–5M function calls/month)
├── Neon Postgres Launch ($19/month, 10 GB)
├── Vercel KV included in Pro (~100k commands/month)
├── Vercel Blob (~5 GB, ~$0.12/month)
├── Clerk (free up to 10k MAU, then $25/month + MAU)
├── Inngest free tier (5k function runs/month for background jobs)
└── Resend free tier or Pro ($20/month)

Vercel cost: $20–25/month
External services: $19–60/month
Grand total: ~$40–85/month
```

---

### Growing SaaS (10k–100k MAU)

Usage-based costs start to matter:

```
Vercel Pro ($20/month + usage overages)
├── Next.js (~5–20M function calls/month, ~$0–50 overage)
├── Neon Postgres Scale ($69/month, 50 GB)
├── Upstash Redis PAYG ($30–80/month for sessions + cache)
├── Cloudflare R2 (~$10–30/month for user uploads, no egress fee)
├── Clerk ($25/month + $0.02/MAU above 10k = $25–215/month)
├── Inngest Basic/Pro ($20–150/month for background jobs)
└── Resend Pro ($20/month)

Vercel cost: $20–80/month
External services: $180–570/month
Grand total: ~$200–650/month
```

---

### Scale-up (100k+ MAU)

Evaluate whether Vercel remains cost-effective vs a full cloud:

```
Vercel Pro or Enterprise (negotiate pricing)
├── Next.js (heavy serverless usage — function costs can be $200–800+/month)
├── Neon Business ($700/month, 500 GB) or dedicated Postgres on RDS/Cloud SQL
├── Dedicated Redis (Upstash Pro, $120+/month, or Railway Redis)
├── Cloudflare R2 for all file storage
├── Clerk ($25 + $0.02/MAU = $225–2,025+/month) or Auth0 Enterprise
├── Inngest Pro ($150+/month) or Trigger.dev Pro
└── Resend Scale ($90+/month)

Vercel cost: $200–1,000+/month
External services: $1,000–3,000+/month
Grand total: $1,200–4,000+/month

At this scale, compare against GCP Cloud Run + Cloud SQL + managed Redis,
or AWS with ECS Fargate + RDS + ElastiCache. Full cloud may be 30–50% cheaper
once you factor in engineering time for setup and maintenance.
```

---

## Vercel Limitations Reference

Keep these in mind when assessing fit:

| Limitation | Detail |
|---|---|
| Max function timeout | 10s (Hobby), 300s (Pro), 900s (Enterprise) |
| Max function memory | 1,024 MB (Hobby/Pro), 3,008 MB (Enterprise) |
| Max function payload | 4.5 MB request/response body |
| No persistent disk | Functions are stateless; no local file system persistence |
| No WebSocket support | No persistent connections; use serverless event patterns instead |
| Cold starts | Serverless Functions have cold starts (typically 50–500ms); Edge Functions don't |
| No GPU support | No ML inference on Vercel; use Replicate, Modal, or a full cloud |
| Build time limit | 45 minutes max per deployment |
| Cron frequency | Max 1/minute on Pro, 1/day on Hobby |
