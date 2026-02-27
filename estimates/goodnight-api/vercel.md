## Vercel Cost Estimate

**Project**: goodnight-api
**Source**: https://github.com/Gords/Goodnight-api
**Environment**: Production
**Scale**: < 1k MAU, < 10k req/day
**Vercel Plan**: Hobby (free) — personal project, single developer, no cron jobs, all usage well within free limits

> ⚠️ Vercel is optimized for Node.js/Express APIs deployed as Serverless Functions. The Express app will need a `vercel.json` with a catch-all rewrite to work correctly. The in-memory rate limiter (`express-rate-limit`) resets per function instance — negligible at this scale but worth noting for growth.

---

### Architecture

Goodnight API deploys as a single Vercel Serverless Function wrapping the Express app. The stateless JWT auth model is a perfect fit. Vercel Postgres (Neon under the hood) replaces the Docker-based PostgreSQL instance, eliminating the need for any external DB host. At < 1k MAU, the entire stack fits within Vercel's Hobby (free) plan.

---

### Vercel Native Costs

| Vercel Feature | Usage | Monthly Cost |
|---|---|---|
| Hobby Plan | Base plan | $0.00 |
| Serverless Function executions | ~9k req/month (~0.09 GB-hours) | $0.00 |
| Bandwidth | ~45 MB/month | $0.00 |
| Vercel Postgres (Neon) | < 256 MB storage, < 60 compute-hours | $0.00 |
| Vercel KV | Not needed | — |
| Vercel Blob | Not needed | — |
| Vercel Cron Jobs | None | — |
| Edge Network CDN | Global | Included |
| Preview deployments | Per PR | Included |
| Custom domain + TLS | Optional | Included |
| **Vercel subtotal** | | **$0.00** |

### External Service Costs

All infrastructure covered by Vercel native services.

---

### Summary

| Category | Services | Monthly Cost |
|---|---|---|
| Vercel platform | Hobby plan + Postgres + Functions | $0.00 |
| External services | None | $0.00 |
| **Total** | | **~$0/month** |
| **Annual** | | **~$0/year** |

---

### Free Tier / Hobby Plan Analysis

This project runs entirely free on Vercel Hobby:

- **Functions**: 9k req/month uses ~0.09 GB-hours out of 100 GB-hours included — 0.09% of the limit.
- **Bandwidth**: ~45 MB/month out of 100 GB included — essentially zero.
- **Vercel Postgres**: < 256 MB DB size fits within the 256 MB Hobby storage limit. If it grows past that, the Neon Launch plan is $19/month — but at < 1k MAU this won't happen for a long time.
- **Team**: Hobby is limited to 1 member. If a second developer joins, Pro ($20/month) would be required.
- **Function timeout**: Hobby allows 10 seconds max per function invocation. All CRUD operations in this API complete in < 500ms — no risk of hitting the limit.

**The only reason to upgrade to Pro ($20/month) would be adding a second team member or setting up cron jobs.**

---

### Cost Optimization Tips

1. **Add a `vercel.json` rewrite** — Express needs `{"rewrites": [{"source": "/api/(.*)", "destination": "/api/index.js"}]}` to route all requests through the single serverless function entry point.
2. **Switch to `pg` connection pooling via `@neondatabase/serverless`** — The standard `pg` driver holds TCP connections which don't play well with serverless cold starts. Neon's HTTP driver or `pg` with connection pooling via PgBouncer (built into Vercel Postgres) avoids connection exhaustion.
3. **Keep Vercel Postgres on Hobby** — At < 1k MAU, the free 256 MB is more than enough for years. Don't upgrade unless you actually exceed the limit.
4. **Use Vercel's built-in environment variables** — Replace the `.env` file approach with Vercel's per-environment env vars (production / preview / development) for secrets like `JWT_SECRET` and `DB_*`.
5. **Add structured logging** — Replace `console.error` with `console.log(JSON.stringify({...}))` so Vercel's log drain can parse and filter logs properly.

---

### Scale Projections

| Scale | MAU | Vercel Plan | Est. Monthly Cost |
|---|---|---|---|
| **Current (Hobby/MVP)** | **< 1k** | **Hobby (free)** | **$0** |
| Small SaaS | 1k–10k | Hobby or Pro | $0–$20 (Pro if team) |
| Growing SaaS | 10k–50k | Pro + Postgres Launch | ~$39/month ($20 Pro + $19 Postgres) |
| Mid-scale | 50k–100k | Pro + Postgres Launch | ~$50–80/month |
| Large scale | 100k+ | Pro / Enterprise | ~$100–300+ (consider full cloud) |

---

### Vercel vs Full Cloud

At the current scale (< 1k MAU), Vercel is significantly more cost-effective than a full cloud deployment — it's free, vs. ~$15–30/month minimum on AWS (App Runner + RDS t3.micro) or GCP (Cloud Run + Cloud SQL). For a portfolio/hobby project, Vercel Hobby is the clear winner.

> **Compare**: Run /wiz-cost-gcp, /wiz-cost-aws, or /wiz-cost-azure to see full-cloud alternatives.
