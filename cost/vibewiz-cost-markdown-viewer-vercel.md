## Vercel Cost Estimate

**Project**: vibewiz-cost-markdown-viewer
**Source**: https://github.com/Gords/vibeWizCost
**Environment**: Production
**Scale**: < 1k MAU, < 1k req/day (solo/internal developer tool)
**Vercel Plan**: Hobby (free) — this is a single-developer internal tool with no cron jobs, no teams, and sub-10s function execution. Hobby fits perfectly.

> ⚠️ Vercel fit is **GOOD** for this Node.js HTTP server, but with one critical caveat: the app reads markdown files directly from the local filesystem (`.claude/skills/**/*.md` and `cost/**/*.md`). Vercel's serverless runtime has a **read-only filesystem** — only files bundled at build time are accessible. The markdown files must either be committed to the repository (so Vercel bundles them), or the architecture needs to change to fetch them from an external source (Vercel Blob, GitHub API, etc.). The static serving model (`web/` files) works perfectly with zero changes.

---

### Architecture

Vercel handles the static frontend (`web/index.html`, `app.js`, `styles.css`) natively as a CDN-cached static deployment. The Node.js API routes (`/api/files`, `/api/file`) map directly to Vercel Serverless Functions using the `@vercel/node` runtime — no framework adapter needed, just a small wrapper to export the handler. No external services are required; the only infrastructure this app needs is compute and filesystem access, both handled by Vercel itself once the markdown files are bundled into the deployment.

---

### Vercel Native Costs

| Vercel Feature | Usage | Monthly Cost |
|---|---|---|
| Hobby Plan | Base plan | $0.00 |
| Serverless Function executions | ~30k req/month × 100ms × 128 MB = ~0.011 GB-hours (vs. 100 GB-hours free) | $0.00 |
| Bandwidth | ~1 GB/month (< 1k visits × ~1 MB/visit, well under 100 GB free) | $0.00 |
| Vercel Postgres | Not needed | $0.00 |
| Vercel KV | Not needed | $0.00 |
| Vercel Blob | Not needed (files bundled with deployment) | $0.00 |
| Vercel Cron Jobs | None | Included |
| Edge Network CDN | Global, static assets | Included |
| Preview deployments | Per PR | Included |
| **Vercel subtotal** | | **$0.00** |

### External Service Costs

All infrastructure is covered by Vercel native services. No external services are required for this project.

---

### Summary

| Category | Services | Monthly Cost |
|---|---|---|
| Vercel platform | Hobby plan + usage | $0.00 |
| External services | None | $0.00 |
| **Total** | | **~$0/month** |
| **Annual** | | **~$0/year** |

---

### Free Tier / Hobby Plan Analysis

This project runs entirely within the Hobby (free) plan with headroom to spare:

- **Function executions**: ~0.011 GB-hours/month against a 100 GB-hour free allowance — less than 0.01% utilized.
- **Bandwidth**: ~1 GB/month against 100 GB free — essentially zero.
- **Cron jobs**: None needed.
- **Team members**: 1 (solo tool by design) — Hobby's only team limit doesn't apply.
- **Function timeout**: File reads complete in well under 100ms, far below the 10s Hobby limit.

The only reason to upgrade to Pro ($20/month) would be if this tool were shared across a team (Hobby allows only 1 member) or if you needed password-protected preview deployments for PR reviews. Neither applies to a local developer tool.

---

### Deployment Adaptation Required

Before deploying to Vercel, one decision must be made about the markdown file source:

**Option A — Bundle files with the repo (simplest)**
Commit `.claude/skills/` and `cost/` to the repository. Vercel bundles them at build time. Files are read-only and static until the next deployment. Works with zero code changes, but "generated" cost files must be committed to show up.

**Option B — Vercel Blob for dynamic files**
Store markdown files in Vercel Blob instead of the local filesystem. The `/api/files` and `/api/file` handlers would call the Vercel Blob SDK instead of `fs.readdir`/`fs.readFile`. Files can then be uploaded dynamically without redeployment. Storage cost: ~$0.00/month at this scale (< 10 MB of markdown files).

**Option C — GitHub API as the source**
Read markdown files from the GitHub repository via the GitHub API. Zero storage cost, always in sync with the repo, but adds an API dependency and GitHub rate limits.

**Recommendation**: Option A for a personal tool, Option B if you want to push new cost reports without committing them.

The Node.js HTTP server itself needs a small adapter to work as a Vercel Serverless Function:

```js
// api/index.js
const { createServer } = require('../server');
const app = createServer();
module.exports = (req, res) => app.emit('request', req, res);
```

---

### Cost Optimization Tips

1. **Stay on Hobby** — this tool will never generate meaningful function execution costs or bandwidth. Pro adds no value for a solo developer tool.
2. **Bundle markdown files at build time** (Option A above) — zero additional cost, no SDK changes, and Vercel's CDN serves them at the edge if you add a static file route.
3. **If you switch to Vercel Blob**, the entire `cost/` folder at < 10 MB costs less than $0.01/month in storage — effectively free.
4. **Use Edge Functions for the `/api/files` list endpoint** — it's a pure filesystem read with no Node.js-specific APIs needed; Edge Functions have no cold starts and run faster globally.
5. **The frontend already uses CDN-hosted JS libraries** (marked, DOMPurify, highlight.js via jsDelivr/cdnjs) — this keeps the deployment bundle small and avoids any image optimization costs.

---

### Scale Projections

| Scale | MAU | Vercel Plan | Est. Monthly Cost |
|---|---|---|---|
| Personal tool | < 1k | Hobby (free) | ~$0 |
| Small team (2–5 devs) | < 1k | Pro (team features) | ~$20 (plan only) |
| Internal company tool | 1k–10k | Pro | ~$20 |
| Public SaaS pivot | 10k–50k | Pro | ~$20–40 |
| Large scale | 100k+ | Pro / Enterprise | ~$40–200+ |

Note: this app has near-zero variable costs at any realistic scale — it serves tiny markdown files with no database, no auth, no compute-heavy operations. Even at 100k MAU the function execution bill would be negligible.

---

### Vercel vs Full Cloud

At the current scale (< 1k MAU, solo developer tool), Vercel is dramatically more cost-effective than a full cloud deployment — the total cost is $0/month vs. $5–15/month minimum for even the smallest VM on GCP, AWS, or Azure. For an internal tool of this size, there is no rational argument for full cloud over Vercel Hobby.

> **Compare**: Run `/wiz-cost-gcp`, `/wiz-cost-aws`, or `/wiz-cost-azure` to see full-cloud alternatives.
