## AWS Cost Estimate

**Project**: vibewiz-cost-markdown-viewer
**Source**: https://github.com/Gords/vibeWizCost
**Environment**: Production
**Scale**: < 1k MAU, < 1k req/day (solo/internal developer tool)
**Region**: us-east-1 (N. Virginia) — reference region; adjust ±10–15% for other regions

---

### Architecture

The app has two parts: a static frontend (`web/`) and a minimal Node.js API with two routes (`/api/files`, `/api/file`). The static assets land in **S3 + CloudFront** — the canonical AWS pattern for any static site, and essentially free at this scale. The API maps to **Lambda + API Gateway HTTP API**: two lightweight file-read endpoints with < 30k req/month don't justify a persistent container; Lambda scales to zero and stays well within the permanent free tier indefinitely. The markdown files (`.claude/skills/**` and `cost/**`) must be bundled into the Lambda deployment package since Lambda has read-only access to its own deployment zip at runtime.

> **Deployment note**: Lambda functions can read files bundled at deploy time from `/var/task/` (the unzipped package directory). The existing `server.js` uses `path.join(ROOT, ...)` relative to `process.cwd()` — this needs a one-line change to `__dirname` for Lambda. No SDK changes, no database, no external storage needed for the base case.

---

### Cost Breakdown

| AWS Service | Configuration | Monthly Cost |
|-------------|---------------|-------------|
| Lambda (API) | 2 functions (or 1 with routing), 128 MB, ~30k req/month × 200ms | $0.00 |
| API Gateway HTTP API | ~30k req/month | $0.00 |
| S3 (frontend + markdown) | < 1 MB storage, < 30k GET/month | $0.00 |
| CloudFront | < 1 GB egress/month, < 30k requests/month | $0.00 |
| Route 53 | 1 hosted zone (optional — only if custom domain needed) | $0.50 |

---

### Summary

| Category | Services | Monthly Cost |
|----------|----------|-------------|
| Compute | Lambda | $0.00 |
| API layer | API Gateway HTTP API | $0.00 |
| Storage & CDN | S3 + CloudFront | $0.00 |
| Networking / DNS | Route 53 (optional) | $0.50 |
| **Total (no custom domain)** | | **~$0/month** |
| **Total (with custom domain)** | | **~$0.50/month** |
| **Annual (with domain)** | | **~$6/year** |

---

### Always Free Savings

Every service used here is either permanently free or trivially small:

- **Lambda**: 1M requests/month + 400k GB-seconds permanently free → usage is ~30k req × 0.007 GB-seconds = **0.21 GB-seconds** (0.05% of free tier) → saves **~$0.00/month** (nothing to save — cost is genuinely zero)
- **CloudFront**: 1 TB egress + 10M requests permanently free → usage is < 1 GB and < 30k requests → saves **~$0.09/month** vs paid
- **S3**: 5 GB + 20k GET + 2k PUT free for first 12 months → storage is < 1 MB → saves **~$0.00/month** (cost rounds to zero regardless)
- **API Gateway HTTP API**: $1.00/million calls → 30k calls = **$0.03/month** potential cost, fully within free tier for 12 months → saves **$0.03/month**

**Total free tier savings: ~$0.12/month** (the bill is $0 regardless — these services are too cheap to meter at this scale)

---

### Deployment Adaptation Required

The same filesystem constraint that applies on Vercel applies here. Lambda's `/var/task/` is readable but populated only from the deployment package.

**Option A — Bundle files with deployment (simplest)**
Deploy the whole repo as a zip. Lambda can read `.claude/skills/` and `cost/` directly. The `ROOT` path in `server.js` needs to point to `__dirname` instead of `process.cwd()`. No other changes.

**Option B — S3 as the markdown source (more dynamic)**
Store markdown files in an S3 bucket. Replace `fs.readdir`/`fs.readFile` calls with `ListObjectsV2` + `GetObject` via the AWS SDK. Files can then be updated independently from code deploys.
- S3 cost at this scale: < 1 MB × $0.023/GB = **< $0.001/month**

**Recommended Lambda adapter** (minimal change to existing code):
```js
// api/handler.js
const { createServer } = require('./server');
const server = createServer();

exports.handler = (event, context) => {
  return new Promise((resolve, reject) => {
    // Use aws-serverless-express or @vendia/serverless-express for full compatibility
    // Or rewrite the two routes as direct Lambda handlers (simpler for 2 endpoints)
  });
};
```
For only 2 routes, directly reimplementing `/api/files` and `/api/file` as Lambda handlers is simpler than wrapping the HTTP server.

---

### Cost Optimization Tips

1. **Skip App Runner** — the architecture guide's default for < 1k MAU is App Runner (min=0, ~$2-5/month), but for only 2 stateless file-read endpoints, Lambda costs literally nothing and requires no container.
2. **Skip Route 53 if you don't need a custom domain** — CloudFront distributions get a free `*.cloudfront.net` URL. For an internal tool, that's often enough and saves $0.50/month.
3. **Use Lambda function URLs** instead of API Gateway if you want to avoid API Gateway's per-request pricing (post-free-tier). Lambda function URLs are free and support HTTPS natively.
4. **Bundle markdown files in the deployment zip** (Option A) rather than adding an S3 dependency — fewer moving parts, zero additional cost, and reads are faster from local disk than an SDK call.
5. **Use CloudFront's free tier for all static asset delivery** — the `web/` assets are < 1 MB and will be cached at edge after the first request; subsequent visitors worldwide pay zero egress.

---

### Scale Projections

| Scale | MAU | Est. monthly cost |
|-------|-----|------------------|
| **Current target** | **< 1k (solo tool)** | **~$0–0.50/month** |
| Small team (2–5 devs) | < 1k | ~$0.50 (Route 53 only) |
| Internal company tool | 1k–10k | ~$1–5 (Lambda stays free; minor API GW overage) |
| Public SaaS pivot | 10k–50k | ~$5–20 (API GW + minimal Lambda overage) |
| Large scale | 100k+ | ~$20–100+ (consider moving API to App Runner/ECS) |

Note: this tool has near-zero variable costs even at 100k MAU — the only billable item at realistic scale is API Gateway HTTP calls at $1.00/million, and Lambda compute at $0.18/million GB-seconds.

---

> **Compare**: Run /wiz-cost-gcp, /wiz-cost-azure, or /wiz-cost-vercel to see estimates on other providers.
