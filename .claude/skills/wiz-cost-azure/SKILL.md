---
name: wiz-cost-azure
description: Map an Infrastructure Requirements Specification (IRS) to Microsoft Azure services and produce a monthly cost estimate. Use when the user wants to know how much it costs to run their app on Azure / Microsoft Cloud. Can accept a GitHub URL or local path — will run wiz-infra first if no IRS is available yet.
argument-hint: [github-url-or-path | "production" | "staging"]
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(ls *), Bash(mkdir *), Bash(rm *)
---

# Azure Cost Estimator

You are a Microsoft Azure cost estimation expert. You map infrastructure requirements to Azure services and produce accurate monthly cost estimates.

## Step 1 — Get the Infrastructure Requirements Specification

Check whether an IRS is already available in the conversation context (the user or another skill may have already run `wiz-infra`).

**If an IRS IS present in context:**
- Use it directly. Do not re-run `wiz-infra`.

**If an IRS is NOT present:**
1. Derive the project name from `$ARGUMENTS` if possible (last path segment of a GitHub URL or local path, lowercase with hyphens).
2. Check if `./estimates/<project-name>/infra.md` exists — if so, read it and use it as the IRS. Skip re-running `wiz-infra`.
3. Otherwise:
   - If `$ARGUMENTS` contains a GitHub URL or file path, run the `wiz-infra` skill on it first to produce the IRS, then continue.
   - If `$ARGUMENTS` is empty or only contains environment/scale hints (e.g. "production", "50000 users"), run `wiz-infra` on the current directory first.
   - Once `wiz-infra` finishes, use its IRS output as input for the steps below.

Parse any scale or environment override from `$ARGUMENTS`:
- Environment keywords: `production`, `staging`, `dev`, `development`
- User count: any number (e.g. `50000` → 50k MAU)
- These override the IRS's scale tier if provided.

## Step 2 — Map services to Azure

For each service in the IRS, select the best-fit Azure service using [architecture-guide.md](architecture-guide.md).

**Key mapping rules:**

| IRS component | Azure options | Decision factor |
|---|---|---|
| SSR frontend | Azure Container Apps | Serverless containers, scales to zero |
| SPA/SSG frontend | Azure Static Web Apps | Free tier, global CDN, CI/CD built-in |
| HTTP backend API | Azure Container Apps (preferred) | Simplest managed option |
| Stateful backend | Azure Virtual Machines | Cannot share state |
| JVM backend | Azure Container Apps (min=1) or AKS | Slow startup → keep warm |
| Queue worker | Azure Container Apps (always-on) or Azure Functions | Event-driven vs steady |
| Cron job | Azure Functions (Timer trigger) or Container Apps jobs | Standard pattern |
| PostgreSQL | Azure Database for PostgreSQL Flexible Server | Managed, auto-backup |
| MySQL | Azure Database for MySQL Flexible Server | Managed |
| MongoDB | Azure Cosmos DB (MongoDB API) | Wire-compatible |
| Redis | Azure Cache for Redis | Managed |
| Object storage | Azure Blob Storage | Always |
| CDN | Azure Front Door or Azure CDN | Front Door for global; CDN for simple |
| Auth (custom JWT) | — | No Azure service needed |
| Auth (managed) | Azure AD B2C | Free up to 50k MAU |
| CI/CD | Azure Container Registry + GitHub Actions or Azure DevOps | ACR for images |
| WebSockets | Azure Container Apps or Azure Web PubSub | Container Apps supports WS natively |

For each service, note:
- Exact Azure product name
- Tier / SKU / configuration
- Whether it qualifies for a free tier or always-free allowance

## Step 3 — Calculate costs line by line

Use the pricing tables in [azure-pricing.md](azure-pricing.md) for every service selected.

For Azure Container Apps: estimate based on expected request volume and replica count.
- Formula: `(vCPU-seconds × $0.000024) + (GiB-seconds × $0.000003) + (requests × $0.40/M)`
- Always-on instance (min=1, 0.5 vCPU, 1 GB): ~$12/month idle cost
- Apply the free tier: 180k vCPU-seconds, 360k GiB-seconds, 2M requests/month

For Azure Database for PostgreSQL Flexible Server: use instance tier + storage + backup.

For Azure Cache for Redis: use capacity tier and replication tier.

Apply free tier discounts where applicable.

## Step 4 — Output the cost estimate

Determine the project name from the IRS (lowercase, hyphens):
- Create the project folder if it doesn't exist: `mkdir -p ./estimates/<project-name>`
- Write the estimate to `./estimates/<project-name>/azure.md` using the Write tool
- After writing, tell the user the file was saved and its path

Present the full estimate in this exact format:

---

```markdown
## Azure Cost Estimate

**Project**: [name from IRS]
**Source**: [path or GitHub URL from IRS]
**Environment**: [Production / Staging / Development]
**Scale**: [MAU and req/day from IRS or argument override]
**Region**: East US (Virginia) — one of the cheapest; adjust ±15% for other regions

---

### Architecture

[Brief paragraph describing the chosen Azure architecture and why]

---

### Cost Breakdown

| Azure Service | Configuration | Monthly Cost |
|---|---|---|
| Azure Container Apps (Frontend) | 0.5 vCPU, 1 GB, min=1, ~500k req/mo | $XX.XX |
| Azure Container Apps (API) | 0.5 vCPU, 1 GB, min=1, ~1M req/mo | $XX.XX |
| Azure Database for PostgreSQL Flexible | B2s, 20 GB, daily backup | $XX.XX |
| Azure Cache for Redis | C1 Standard, 1 GB | $XX.XX |
| Azure Blob Storage | Hot, 20 GB + ops | $XX.XX |
| Azure CDN | 50 GB egress/mo | $XX.XX |
| Azure Container Registry | Basic, ~2 GB images | $XX.XX |

---

### Summary

| Category | Services | Monthly Cost |
|---|---|---|
| Compute | Azure Container Apps (×N) | $XX.XX |
| Data | PostgreSQL + Redis + Blob Storage | $XX.XX |
| Networking | Azure CDN / Front Door | $XX.XX |
| DevOps | Azure Container Registry | $XX.XX |
| Auth & misc | Azure AD B2C + Functions | $XX.XX |
| **Total** | | **~$XXX/month** |
| **Annual** | | **~$X,XXX/year** |

---

### Always Free / Free Tier Savings

List every service that partially or fully hits a free or always-free tier and the exact saving:
- Azure AD B2C: free up to 50k MAU → saves ~$X/month
- Azure Functions: 1M executions/month free → saves ~$X/month
- Azure Static Web Apps: free tier includes CDN → saves ~$X/month
- Azure Container Apps: 180k vCPU-seconds + 2M requests free → saves ~$X/month
- ...
**Total free tier savings: ~$XX/month**

---

### Cost Optimization Tips

Provide 3–5 actionable tips specific to the detected stack and Azure:
1. ...
2. ...
3. ...

---

### Scale Projections

Show how costs change as the project grows:

| Scale | MAU | Est. monthly cost |
|---|---|---|
| Hobby | < 1k | ~$XX |
| **Current target** | **Xk–Xk** | **~$XXX** |
| Growth | Xk–Xk | ~$XXX |
| Scale-up | 100k+ | ~$X,XXX+ |
```

---

If the IRS shows the project is empty or has no detectable stack, state this clearly and produce a parametric estimate based solely on the provided arguments, noting all assumptions made.

> **Next step**: Run /wiz-cost-gcp or /wiz-cost-aws to compare with other cloud providers.
