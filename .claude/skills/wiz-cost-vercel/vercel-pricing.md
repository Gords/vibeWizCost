# Vercel Pricing Reference (2025)

Prices in USD. All figures are approximate — verify current rates at https://vercel.com/pricing before quoting to clients.

---

## Vercel Plans

| Feature | Hobby (Free) | Pro ($20/month) | Enterprise (Custom) |
|---|---|---|---|
| Deployments | Unlimited | Unlimited | Unlimited |
| Bandwidth | 100 GB/month | 1 TB/month (+$0.40/GB overage) | Custom |
| Serverless Function execution | 100 GB-hours/month | 1,000 GB-hours/month (+$0.18/GB-hour overage) | Custom |
| Edge Function invocations | 500k/month | 1M/month (+$2/million overage) | Custom |
| Image Optimization | 1,000 images/month | 5,000 images/month (+$5/1,000 overage) | Custom |
| Cron Jobs | 2 jobs, max 1/day | 40 jobs, max 1/minute | Custom |
| Background Functions (max duration) | Not available | 15 minutes | Extended |
| Team members | 1 | Unlimited | Unlimited |
| Preview deployments | Yes | Yes | Yes |
| Custom domains | Unlimited | Unlimited | Unlimited |
| SSL certificates | Free (auto) | Free (auto) | Free (auto) |
| Web Analytics | Basic | Advanced (Core Web Vitals) | Custom |
| Concurrent builds | 1 | 3 | Custom |
| Password-protected previews | No | Yes | Yes |
| SAML SSO | No | No | Yes |
| SLA | None | None | 99.99% |
| Support | Community | Email (business hours) | Dedicated |

**Plan selection guidance:**
- Use **Hobby** for: personal projects, prototypes, open-source side projects, anything with 1 developer
- Use **Pro** for: commercial products, team projects, anything needing >10s function timeouts, >2 cron jobs, or >1 team member
- Use **Enterprise** for: compliance requirements (SOC2, HIPAA), custom bandwidth/compute limits, dedicated support, or negotiated pricing at high scale

---

## Vercel Serverless Functions

### Pricing (Pro plan)
- **Included**: 1,000 GB-hours/month (resets monthly)
- **Overage**: $0.18 per GB-hour beyond 1,000

### Execution limits
| Plan | Max duration | Max memory |
|---|---|---|
| Hobby | 10 seconds | 1,024 MB |
| Pro | 300 seconds (5 minutes) | 1,024 MB |
| Enterprise | 900 seconds (15 minutes) | 3,008 MB |

### GB-hour calculation
GB-hours = (number of requests × average duration in seconds × memory in GB) / 3,600

**Practical estimates (all within Pro included 1,000 GB-hours unless noted):**

| Scenario | Requests/month | Avg duration | Memory | GB-hours | Monthly cost |
|---|---|---|---|---|---|
| Light API | 100k | 100ms | 128 MB | 0.04 | $0 (included) |
| Moderate API | 1M | 150ms | 128 MB | 0.53 | $0 (included) |
| Active SaaS | 10M | 200ms | 256 MB | 142 | $0 (included in 1,000) |
| High traffic | 50M | 200ms | 256 MB | 711 | $0 (included in 1,000) |
| Very high traffic | 100M | 200ms | 512 MB | 2,844 | ~$330 overage |
| Heavy compute | 10M | 2s | 512 MB | 2,778 | ~$320 overage |

**Rule of thumb**: Most apps under 50M requests/month with typical API patterns (fast, lightweight functions) stay within the 1,000 GB-hour Pro include. Overage kicks in when functions are either very slow or use a lot of memory.

---

## Vercel Edge Functions

Edge Functions run at the edge network (globally distributed), with no cold starts and very low latency.

### Pricing (Pro plan)
- **Included**: 1,000,000 invocations/month
- **Overage**: $2.00 per million invocations
- **Max duration**: 25 seconds (Pro)
- **Memory**: Up to 128 MB
- **No cold starts**: Runs in a V8 isolate, not a full Node.js runtime

### When to use Edge vs Serverless Functions
| Use Edge Functions for | Use Serverless Functions for |
|---|---|
| Auth middleware (JWT validation) | Database queries (requires full Node.js) |
| A/B testing / feature flags | Complex server-side logic |
| Geolocation-based routing | File I/O |
| Simple request/response transforms | Long-running operations |
| Rate limiting | Operations needing >128 MB memory |

---

## Vercel Bandwidth

- **Hobby**: 100 GB/month (hard limit — deployments may stop if exceeded)
- **Pro included**: 1 TB/month
- **Pro overage**: $0.40 per GB beyond 1 TB

### Bandwidth estimation
| Traffic profile | Bandwidth estimate |
|---|---|
| 10k MAU, avg 3 pages/visit, 1 MB/page | ~30 GB/month |
| 50k MAU, avg 4 pages/visit, 1.5 MB/page | ~300 GB/month |
| 100k MAU, avg 5 pages/visit, 2 MB/page | ~1 TB/month |
| 500k MAU, avg 5 pages/visit, 2 MB/page | ~5 TB/month (~$1,600 overage) |

**Note**: Repeat visits are often served from browser cache or CDN cache and may not count against bandwidth. Static assets cached at the edge are usually very bandwidth-efficient.

---

## Vercel Postgres (powered by Neon)

Vercel Postgres is Neon serverless Postgres, available through the Vercel integration. Pricing is identical whether you use it through Vercel or directly through Neon.

| Plan | Storage | Compute | Branches | Price |
|---|---|---|---|---|
| Hobby (Free) | 0.5 GB | 191 compute hours/month | 10 | $0 |
| Launch | 10 GB | Autoscales | 10 | $19/month |
| Scale | 50 GB | Autoscales, read replicas | 50 | $69/month |
| Business | 500 GB | Autoscales, read replicas, higher IOPS | 500 | $700/month |
| Custom | Unlimited | Dedicated compute | Unlimited | Contact sales |

**Compute hours**: Neon autoscales down to zero when idle. For active production databases, count on 400–720 compute hours/month (720 = always-on).

**Additional costs (Launch and above):**
- Storage overage: $0.000164/GB-hour beyond plan limit
- Compute overage: $0.16/compute-hour beyond plan limit
- Data transfer (egress): $0.09/GB beyond 1 GB/month (negligible for most apps)

**Plan selection:**
- Hobby: prototypes, staging environments, internal tools
- Launch: small production apps (<10 GB data, moderate traffic)
- Scale: growing SaaS (10–50 GB data, consistent traffic, need read replicas)
- Business: large data sets or high-performance requirements

---

## Vercel KV (powered by Upstash Redis)

Vercel KV is Upstash Redis, available through the Vercel integration. Same pricing whether accessed via Vercel or Upstash directly.

| Plan | Monthly requests | Storage | Bandwidth | Price |
|---|---|---|---|---|
| Hobby (Free) | 30,000 requests | 256 MB | 1 GB | $0 |
| Pro (included) | 500,000 requests | 1 GB | 10 GB | Included in Pro |
| Scale overage | Unlimited | Per-GB | Per-GB | $0.20 per 100k requests beyond Pro |

**Storage overage (Pro):** $0.25/GB beyond 1 GB
**Bandwidth overage (Pro):** $0.12/GB beyond 10 GB

**Typical request volumes:**
| Use case | Requests/month estimate |
|---|---|
| Session storage for 10k MAU | ~300k–600k (read + write per session) |
| Rate limiting for 1M API calls | ~1M (1 read + 1 write per call) |
| Cache layer for 10M page views | ~10–50M (cache read per view) |

**Note**: For high command volumes, use Upstash directly — the pay-as-you-go plan ($0.20/100k commands) may be cheaper than Pro overage, and you get more configuration options.

---

## Vercel Blob

Simple object storage for user uploads, generated files, and assets. S3-compatible pricing.

### Pricing
| Component | Rate |
|---|---|
| Storage | $0.023 per GB/month |
| Write operations (PUT, POST, COPY) | $0.009 per 1,000 operations |
| Read operations (GET, SELECT) | $0.0004 per 1,000 operations |
| Egress (data transfer out) | $0.08 per GB (first 1 GB free on Pro) |

### Practical cost examples
| Scenario | Monthly cost |
|---|---|
| 1 GB storage, 1k uploads, 10k reads | ~$0.04 |
| 5 GB storage, 10k uploads, 100k reads | ~$0.25 |
| 20 GB storage, 50k uploads, 500k reads | ~$1.07 + egress |
| 100 GB storage, 200k uploads, 2M reads | ~$4.10 + egress |
| 500 GB storage, 1M uploads, 10M reads | ~$20.50 + egress (~$40 egress) |

**Egress warning**: At high traffic volumes, Vercel Blob egress ($0.08/GB) adds up. Consider Cloudflare R2 (zero egress fees) for media-heavy applications.

---

## Vercel Cron Jobs

Scheduled invocations of Vercel Serverless Functions.

| Plan | Max jobs | Max frequency | Cost |
|---|---|---|---|
| Hobby | 2 | Once per day | Included (counts toward function execution) |
| Pro | 40 | Once per minute | Included in plan |
| Enterprise | Unlimited | Custom | Included |

**Configuration**: Defined in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Cost**: Cron invocations are billed as regular serverless function executions (GB-hours). For typical short-running cron tasks (a few seconds each), the cost is negligible.

---

## Vercel Image Optimization

Automatic image resizing and format conversion (WebP/AVIF).

| Plan | Included images/month | Overage |
|---|---|---|
| Hobby | 1,000 | Not available |
| Pro | 5,000 | $5.00 per 1,000 images |
| Enterprise | Custom | Custom |

**Note**: Each unique combination of URL + size + format = 1 image optimization. Once optimized, the result is cached. Most apps stay within the free include.

---

## Recommended External Services — Pricing Reference

### Neon (Postgres) — Standalone

Same pricing as Vercel Postgres but with direct Neon account (sometimes offers different plan structures):

| Tier | Storage | Price |
|---|---|---|
| Free | 0.5 GB, 191 compute hours | $0 |
| Launch | 10 GB, autoscale | $19/month |
| Scale | 50 GB, autoscale + read replicas | $69/month |
| Business | 500 GB, dedicated, read replicas | $700/month |

### Upstash Redis — Standalone

| Plan | Commands | Storage | Price |
|---|---|---|---|
| Free | 10,000/day (300k/month) | 256 MB | $0 |
| Pay-as-you-go | Unlimited | Per-GB | $0.20 per 100k commands |
| Pro 2K | 200M commands/month | 2 GB | $120/month |
| Pro 10K | 1B commands/month | 10 GB | $540/month |

### Clerk (Auth)

| Plan | MAU | Price |
|---|---|---|
| Free | Up to 10,000 MAU | $0 |
| Pro | 10,001–100,000 MAU | $25/month base + $0.02/MAU |
| Enterprise | Custom | Custom |

**MAU cost examples:**
- 5k MAU: $0 (free tier)
- 10k MAU: $0 (free tier, just within limit)
- 25k MAU: $25 + (15,000 × $0.02) = $325/month
- 50k MAU: $25 + (40,000 × $0.02) = $825/month
- 100k MAU: $25 + (90,000 × $0.02) = $1,825/month

**Note**: Clerk's per-MAU cost escalates quickly at scale. Evaluate Auth.js (free, self-managed) or Auth0 for cost comparison at higher MAU.

### Auth0 (Auth)

| Plan | MAU | Price |
|---|---|---|
| Free | Up to 7,500 MAU | $0 |
| Essential | Up to 100 MAU base | $23/month |
| Professional | Up to 1,000 MAU base | $240/month |
| Enterprise | Custom | Custom |

### Inngest (Background Jobs)

| Plan | Function runs/month | Price |
|---|---|---|
| Free | 5,000 | $0 |
| Basic | 50,000 | $20/month |
| Pro | 500,000 | $150/month |
| Enterprise | Unlimited | Custom |

**Overage (Basic):** $0.50 per 1,000 additional runs
**Overage (Pro):** $0.20 per 1,000 additional runs

### Trigger.dev (Background Jobs)

| Plan | Runs/month | Price |
|---|---|---|
| Free | 25,000 | $0 |
| Pro | Unlimited | $50/month |
| Enterprise | Custom | Custom |

### Upstash QStash (Message Queue)

| Plan | Messages/day | Price |
|---|---|---|
| Free | 500 | $0 |
| Pay-as-you-go | Unlimited | $1.00 per 100k messages |

### Cloudflare R2 (Object Storage)

| Component | Included free | Rate above free |
|---|---|---|
| Storage | 10 GB/month | $0.015/GB/month |
| Class A operations (write) | 1 million/month | $4.50/million |
| Class B operations (read) | 10 million/month | $0.36/million |
| Egress | Unlimited | **$0 — no egress fees** |

**Compared to Vercel Blob:**
- Storage: R2 is ~35% cheaper ($0.015 vs $0.023/GB)
- Egress: R2 is dramatically cheaper at scale ($0 vs $0.08/GB)
- Integration: Vercel Blob has native Next.js SDK; R2 requires S3-compatible client
- **Use R2 when**: storing/serving media files, user uploads, or anything with significant reads

### Resend (Email)

| Plan | Emails/month | Daily limit | Price |
|---|---|---|---|
| Free | 3,000 | 100/day | $0 |
| Pro | 50,000 | Unlimited | $20/month |
| Scale | 100,000 | Unlimited | $90/month |
| Business | 300,000 | Unlimited | $250/month |

**Overage (Pro):** $0.40 per 1,000 additional emails
**Note**: Resend integrates natively with React Email for templating.

---

## Vercel Free Tier Summary (Hobby Plan — Permanent)

What you get for free, forever:

| Feature | Free Allowance |
|---|---|
| Deployments | Unlimited |
| Bandwidth | 100 GB/month |
| Serverless Function execution | 100 GB-hours/month |
| Function timeout | 10 seconds max |
| Edge Function invocations | 500,000/month |
| Image Optimization | 1,000/month |
| Cron Jobs | 2 jobs, max 1/day |
| Team members | 1 (personal use only) |
| Custom domains | Unlimited |
| SSL | Free |
| Preview deployments | Yes |
| Vercel Postgres | 0.5 GB, 191 compute hours |
| Vercel KV | 30,000 requests/month, 256 MB |
| Web Analytics | Basic |

---

## Quick Reference: When Costs Scale

| Cost driver | Threshold where costs noticeably increase |
|---|---|
| Pro plan | Any commercial use, teams, or > 10s timeouts |
| Function overage | >1,000 GB-hours/month (most apps never hit this) |
| Bandwidth overage | >1 TB/month (~100k+ MAU depending on page weight) |
| Postgres costs | When you need >0.5 GB storage or autoscaling |
| KV overage | >500k Redis commands/month on Pro |
| Blob egress | >1 GB/month egress (consider R2 at this point) |
| Clerk costs | >10k MAU (jumps to $25/month + per-MAU) |
| Serverless at scale | >100M req/month — evaluate full cloud alternatives |
