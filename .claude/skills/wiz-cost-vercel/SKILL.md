---
name: wiz-cost-vercel
description: Map an Infrastructure Requirements Specification (IRS) to Vercel services and produce a monthly cost estimate. Best for Next.js, SvelteKit, Nuxt, and other JS/TS frameworks. Shows what Vercel handles natively and recommends complementary services for databases, queues, and other infrastructure. Can accept a GitHub URL or local path — will run wiz-infra first if no IRS is available yet.
argument-hint: [github-url-or-path | "production" | "staging"]
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(ls *), Bash(mkdir *), Bash(rm *)
---

# Vercel Cost Estimator

You are a Vercel cost estimation expert. Follow these 4 steps exactly.

---

## Step 1 — Get the IRS

Check if an Infrastructure Requirements Specification (IRS) is already in the conversation context. An IRS is a markdown table listing components like frontend framework, API runtime, database, cache, storage, auth, queues, etc.

**If an IRS IS present in context:**
- Use it directly. Do not re-run `wiz-infra`.

**If no IRS is present:**
1. Derive the project name from `$ARGUMENTS` if possible (last path segment of a GitHub URL or local path, lowercase with hyphens).
2. Check if `./estimates/<project-name>/infra.md` exists — if so, read it and use it as the IRS. Skip re-running `wiz-infra`.
3. Otherwise:
   - Parse `$ARGUMENTS` for a GitHub URL (starts with `https://github.com`) or a local path and run the `wiz-infra` skill with that argument to produce the IRS.
   - If `$ARGUMENTS` is empty or just an environment keyword (production/staging/development), run `wiz-infra` on the current directory.

Parse any environment or scale overrides from `$ARGUMENTS`:
- Keywords like "production", "staging", "development" set the target environment
- Numbers like "50k users" or "500k MAU" override the scale from the IRS

Proceed only once you have an IRS to work from.

---

## Step 2 — Assess Vercel Fit and Map Services

Reference `architecture-guide.md` for detailed guidance.

### Framework Compatibility Assessment

First, identify the primary framework from the IRS and rate Vercel fit:

| Fit Level | Frameworks / Runtimes | What it means |
|---|---|---|
| EXCELLENT | Next.js, SvelteKit, Nuxt, Remix, Astro, SolidStart, Qwik City | Full native support, zero-config deploys, all Vercel features available |
| GOOD | Any Node.js HTTP server (Express, Fastify, Hapi, Koa) | Deploy as Serverless Functions or with Docker; works well |
| LIMITED | Python APIs (FastAPI, Django, Flask), Go, Rust | Can deploy but not native; consider a separate API host alongside Vercel |
| POOR | Long-running stateful servers, persistent WebSocket servers, background workers | Vercel is stateless and serverless; these patterns don't map well — note limitations clearly |

State the fit level in the output and explain the implications.

### Service Mapping Table

Map each IRS component to Vercel native features or recommended external services:

| IRS Component | Vercel Native | Recommended Complement | Notes |
|---|---|---|---|
| Next.js / SvelteKit / Nuxt frontend | Vercel Deployments | — | First-class support, zero config |
| Other SSR framework | Vercel Deployments | — | May need framework adapter |
| SPA / Static site | Vercel Deployments | — | Auto CDN, free on all plans |
| HTTP API (Node.js) | Vercel Serverless Functions or Edge Functions | — | Max 10s (Hobby) / 300s (Pro) timeout |
| HTTP API (non-Node) | Vercel Serverless Functions (with runtime) | Separate host (Railway, Render, Fly.io) | Limited non-JS runtimes |
| Stateful server | Not supported | EC2 / Railway / Fly.io | Vercel is stateless — cannot run persistent servers |
| Long-running worker | Not supported natively | Inngest / Trigger.dev / Railway | Vercel Background Functions (Pro) handle tasks up to 15 min |
| Cron job | Vercel Cron Jobs (Pro+) | — | Configured in vercel.json; up to 40 jobs on Pro |
| PostgreSQL | Vercel Postgres (Neon) | Neon, Supabase, PlanetScale | Vercel Postgres is Neon under the hood |
| MySQL | — | PlanetScale, Railway MySQL | No native MySQL offering |
| MongoDB | — | MongoDB Atlas | No native MongoDB offering |
| Redis / cache | Vercel KV (Upstash) | Upstash Redis, Railway Redis | Vercel KV is Upstash under the hood |
| File / blob storage | Vercel Blob | Cloudflare R2, AWS S3 | Vercel Blob for simple uploads; R2 for no-egress-fee option |
| Message queue | Not native | Inngest, Trigger.dev, Upstash QStash | Use event-driven patterns with these services |
| Auth | — | NextAuth.js / Auth.js, Clerk, Auth0, Supabase Auth | No native auth service |
| CDN | Vercel Edge Network | — | Global CDN included on all plans, free |
| Custom domain + TLS | Vercel Domains | — | Free SSL, included on all plans |
| CI/CD | Vercel Git integration | — | Auto-deploy on push, preview deployments per PR, free |
| Environment config | Vercel Environment Variables | — | Per-environment (production/preview/development), free |
| Email | — | Resend, SendGrid, Postmark | No native email service |
| Search | — | Algolia, Typesense, Meilisearch Cloud | No native search service |

---

## Step 3 — Calculate Costs

Reference `vercel-pricing.md` for all pricing data.

### Determine Required Plan

- **Hobby (free)**: Personal/hobby projects, 1 team member, 10s function timeout, 2 cron jobs
- **Pro ($20/month)**: Commercial projects, teams, 300s function timeout, 40 cron jobs, background functions
- **Enterprise**: Custom pricing for advanced security, SLAs, higher limits

State clearly which plan is required and why (e.g., "Pro is required because the IRS includes cron jobs that exceed Hobby limits" or "Pro is required for team collaboration").

### Estimate Vercel Usage

Derive usage estimates from the IRS scale (MAU, req/day):

**Serverless Function executions (GB-hours):**
- Formula: `(requests/month × avg_duration_seconds × memory_GB) / 3600`
- Conservative defaults: 128 MB memory, 100–200ms average duration
- 1M req × 150ms × 128MB = ~0.71 GB-hours (well within free tier)
- 10M req × 200ms × 256MB = ~142 GB-hours (~$0 on Pro if under 1,000 included)
- Show the calculation

**Bandwidth:**
- Estimate from page size × pageviews + API response size × API calls
- Typical SPA: 1–3 MB initial load, cached after first visit
- Pro includes 1 TB/month — most apps won't exceed this

**Vercel Postgres (if database needed):**
- Pick tier based on IRS storage estimate
- Default to Launch ($19/month) for small production apps

**Vercel KV (if Redis/cache needed):**
- Estimate monthly command count from session operations + cache reads
- Pro includes 500k commands/month

**Vercel Blob (if file storage needed):**
- Estimate from IRS storage requirements
- $0.023/GB/month + operation costs

### Show Line-by-Line Costs

Always show every line item, even if $0.00, so the user understands what is and isn't being charged.

---

## Step 4 — Output

Create the output file:
1. Derive project name from the IRS (repository name or directory name), lowercase with hyphens
2. Create the project folder if it doesn't exist: `mkdir -p ./estimates/<project-name>`
3. Write the report to `./estimates/<project-name>/vercel.md`
4. Tell the user the exact file path

### Output Format

```markdown
## Vercel Cost Estimate

**Project**: [name from IRS]
**Source**: [path or GitHub URL from IRS]
**Environment**: [Production / Staging / Development]
**Scale**: [MAU and req/day from IRS or argument override]
**Vercel Plan**: [Hobby / Pro / Enterprise — state which is required and why]

> ⚠️ Vercel is optimized for [framework]. [Note any limitations or things not well-suited for Vercel — be specific about what won't work natively.]

---

### Architecture

[2–3 sentences: what Vercel handles natively for this project, what external services are needed, and why. Be specific to this IRS, not generic.]

---

### Vercel Native Costs

| Vercel Feature | Usage | Monthly Cost |
|---|---|---|
| Pro Plan | Base plan | $20.00 |
| Serverless Function executions | ~Xk req/month (~X GB-hours) | $X.XX |
| Bandwidth | ~X GB/month | $X.XX |
| Vercel Postgres (Neon) | X GB storage | $X.XX |
| Vercel KV (Upstash) | ~Xk commands/month | $X.XX |
| Vercel Blob | X GB storage | $X.XX |
| Vercel Cron Jobs | X jobs | Included |
| Edge Network CDN | Global | Included |
| Preview deployments | Per PR | Included |
| **Vercel subtotal** | | **$XX.XX** |

### External Service Costs

| Service | Provider | Configuration | Monthly Cost |
|---|---|---|---|
[Only list services Vercel doesn't cover natively. If none are needed, state "All infrastructure covered by Vercel native services."]

---

### Summary

| Category | Services | Monthly Cost |
|---|---|---|
| Vercel platform | Plan + usage | $XX.XX |
| External services | [comma-separated list] | $XX.XX |
| **Total** | | **~$XXX/month** |
| **Annual** | | **~$X,XXX/year** |

---

### Free Tier / Hobby Plan Analysis

[Explain what would work on Hobby (free) and what specifically requires Pro. Be concrete — e.g., "Hobby supports this use case if you remove cron jobs and keep to 1 team member. The only reason Pro is needed here is the 300s function timeout for the video processing endpoint."]

---

### Cost Optimization Tips

[3–5 Vercel-specific tips, tailored to this IRS. Examples:]
- Use Edge Functions instead of Serverless Functions for simple middleware and auth checks — they're cheaper and have no cold starts
- Vercel KV (Upstash) is included in Pro; avoid adding a separate Upstash account for simple caching
- Use Cloudflare R2 instead of Vercel Blob if you expect >10 GB/month egress — R2 has no egress fees
- Defer heavy background processing to Inngest to keep Vercel function durations short and costs low
- Use ISR (Incremental Static Regeneration) for content pages to reduce function invocations

---

### Scale Projections

| Scale | MAU | Vercel Plan | Est. Monthly Cost |
|---|---|---|---|
| Hobby / MVP | <1k | Hobby (free) | ~$0–10 (external services only) |
| Small SaaS | 1k–10k | Pro | ~$40–80 |
| Growing SaaS | 10k–50k | Pro | ~$100–300 |
| Mid-scale | 50k–100k | Pro | ~$200–600 |
| Large scale | 100k+ | Pro / Enterprise | ~$500–2,000+ (consider full cloud) |

---

### Vercel vs Full Cloud

At the current scale ([X MAU]), Vercel is [cost-effective / comparable / more expensive] than a full cloud deployment. [1–2 sentences on why, referencing the actual numbers.]

> **Compare**: Run /wiz-cost-gcp, /wiz-cost-aws, or /wiz-cost-azure to see full-cloud alternatives.
```
