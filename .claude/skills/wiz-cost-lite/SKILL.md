---
name: wiz-cost-lite
description: Generate a stakeholder-ready infrastructure cost report from a codebase. Orchestrates infra-estimate and gcp-cost-estimate, then produces a polished decision document for both technical and non-technical audiences. Use when asked to "generate a cost report", "create a decision report", "summarize infrastructure costs", or "/wiz-cost-lite".
argument-hint: [github-url-or-path]
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(ls *), Bash(mkdir *), Bash(rm *), Skill
---

# Cost Decision Report Generator

You are a senior cloud strategy consultant. Your job is to orchestrate infrastructure analysis and cost estimation, then transform the raw technical output into a polished, decision-ready report that serves **two audiences simultaneously**:

1. **Non-technical stakeholders** (founders, investors, product managers) — who need clear costs, risks, and business implications in plain language
2. **Technical stakeholders** (CTOs, engineers, DevOps) — who need architecture details, service mappings, and optimization paths

---

## Step 1 — Gather the raw analysis

Check the conversation context for existing outputs:

### If an Infrastructure Requirements Specification (IRS) already exists in context:
- Use it directly. Do not re-run `infra-estimate`.

### If an IRS does NOT exist:
- Run the `infra-estimate` skill first:
  - If `$ARGUMENTS` contains a GitHub URL or path, pass it through
  - If `$ARGUMENTS` is empty, it will analyze the current directory
- Wait for the IRS output before proceeding.

### If a GCP Cost Estimate already exists in context:
- Use it directly. Do not re-run `gcp-cost-estimate`.

### If a GCP Cost Estimate does NOT exist:
- Run the `gcp-cost-estimate` skill using the IRS.
- Wait for the cost estimate output before proceeding.

Once you have **both** the IRS and the GCP cost estimate, proceed to Step 2.

---

## Step 2 — Analyze and synthesize

Before writing the report, internally analyze:

1. **Cost drivers** — Which 2-3 services account for most of the spend? Why?
2. **Risk factors** — What could cause costs to spike? (e.g., no autoscaling limits, large file storage, HA requirements)
3. **Optimization opportunities** — What quick wins exist? What are the long-term levers?
4. **Business context** — How does this cost compare to typical SaaS unit economics? Is the infrastructure cost reasonable for the scale?
5. **Decision points** — What architectural choices would meaningfully change the cost?
6. **Scaling trajectory** — Where are the cost cliffs as the project grows?

---

## Step 3 — Generate the report

Create the output directory and file:
```bash
mkdir -p ./cost
```

Write the report to `./cost/<project-name>-decision-report.md` using the Write tool.

The report MUST follow the exact structure below. Every section is mandatory.

---

### Report Template

```markdown
# Infrastructure Cost Report
### [Project Name]

> Generated [date] | Source: [local path or GitHub URL]

---

## At a Glance

<!--
This section is the MOST IMPORTANT. A busy executive should be able to read ONLY this
section and understand what the project costs and whether to proceed.
Keep it to 6-8 lines maximum. No jargon. No service names. Plain business language.
-->

**What this app does**: [One sentence describing the application's purpose, inferred from the stack]

**What it costs to run**:

| | Monthly | Annual |
|---|---------|--------|
| Current target scale | **$XXX** | **$X,XXX** |
| Bare minimum (hobby) | $XX | $XXX |
| Growth scenario | $XXX–$X,XXX | $X,XXX–$XX,XXX |

**Bottom line**: [One sentence verdict — e.g., "Infrastructure costs are modest and well within typical ranges for a SaaS product at this stage." or "Database costs are disproportionately high and should be addressed before scaling."]

---

## Executive Summary

<!--
For non-technical decision-makers. Write in plain language.
Explain WHAT things cost and WHY, without requiring cloud knowledge.
Use analogies where helpful. Avoid acronyms — or define them on first use.
-->

### How the money breaks down

<!--
Use a simple visual bar chart using Unicode block characters.
This gives an instant visual sense of where money goes.
Calculate percentage of total for each category.
-->

```
Monthly Cost Breakdown ($XXX total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Servers & Computing  ██████████████████░░░░░░░░  $XX  (XX%)
  Database             ████████████░░░░░░░░░░░░░░  $XX  (XX%)
  Caching              ████████░░░░░░░░░░░░░░░░░░  $XX  (XX%)
  Storage & Files      ██░░░░░░░░░░░░░░░░░░░░░░░░  $XX  (XX%)
  Networking & CDN     ██░░░░░░░░░░░░░░░░░░░░░░░░  $XX  (XX%)
  DevOps & CI/CD       █░░░░░░░░░░░░░░░░░░░░░░░░░  $XX  (XX%)
```

### What drives the cost

[2-3 paragraphs explaining the top cost drivers in plain language. Example:]

> The largest portion of your monthly bill goes to **database hosting** ($XX/month). Think of this as renting a dedicated, always-on filing cabinet that stores all your application data. It needs to be reliable and fast, which is why it costs more than other components.
>
> **Server costs** ($XX/month) cover the computers that actually run your application code. We've configured these to stay warm (always ready to respond), which avoids slow startup times for your users but adds a baseline cost even during quiet periods.

### Key risks to watch

<!--
List 2-4 risks in plain language with business impact.
-->

| Risk | What could happen | Estimated impact |
|------|-------------------|-----------------|
| [e.g., User growth beyond 50k MAU] | [Database needs upgrade to handle load] | [+$XX–$XXX/month] |
| [e.g., Large file uploads] | [Storage costs scale linearly] | [+$X per 100 GB] |

---

## Technical Architecture

<!--
For CTOs, engineers, and DevOps teams.
This section can use technical terminology freely.
-->

### Stack overview

**[One-line stack summary from the IRS, e.g., "Next.js 14 SSR + Express REST API + PostgreSQL + Redis + BullMQ"]**

### Service mapping

<!--
Show exactly which GCP service maps to each application component.
Include the reasoning for each choice.
-->

| Application Component | GCP Service | Config | Why this choice |
|-----------------------|-------------|--------|-----------------|
| [e.g., Frontend (SSR)] | [Cloud Run] | [1 vCPU, 512 MB, min=1] | [Serverless, scales to zero on idle, built-in HTTPS] |
| [e.g., Backend API] | [Cloud Run] | [1 vCPU, 512 MB, min=1] | [Stateless HTTP — ideal for Cloud Run] |
| [e.g., Database] | [Cloud SQL PostgreSQL] | [db-g1-small, 20 GB SSD] | [Managed, auto-backup, sufficient for current scale] |
| ... | ... | ... | ... |

### Architecture diagram

<!--
Create a simple ASCII architecture diagram showing how services connect.
Keep it readable. Show data flow direction with arrows.
-->

```
                    ┌─────────────┐
    Users ──────────│  Cloud CDN  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Cloud Run  │
                    │  (Frontend) │
                    └──────┬──────┘
                           │ API calls
                    ┌──────▼──────┐
                    │  Cloud Run  │──────── Cloud Storage
                    │  (Backend)  │         (uploads)
                    └──┬─────┬───┘
                       │     │
              ┌────────▼┐  ┌─▼──────────┐
              │Cloud SQL │  │ Memorystore│
              │(Postgres)│  │  (Redis)   │
              └──────────┘  └────────────┘
```

### Detailed cost breakdown

<!--
Full line-by-line costs from the GCP estimate.
Include the pricing formula or logic for each.
-->

| # | GCP Service | Configuration | Calculation | Monthly Cost |
|---|-------------|---------------|-------------|-------------|
| 1 | [Service] | [Config] | [Brief formula] | $XX.XX |
| 2 | ... | ... | ... | ... |
| | | | **Subtotal** | **$XXX.XX** |
| | | | Free tier savings | -$XX.XX |
| | | | **Net total** | **$XXX.XX** |

---

## Scaling Roadmap

<!--
Show how costs evolve as the product grows.
Both audiences benefit from this — business needs it for financial planning,
engineering needs it for capacity planning.
-->

### Cost by growth stage

| Stage | Users (MAU) | Monthly cost | What changes |
|-------|-------------|-------------|--------------|
| MVP / Hobby | < 1,000 | ~$XX | Minimal instances, shared DB |
| **Current target** | **X,000–XX,000** | **~$XXX** | **[current config]** |
| Growth | XX,000–100,000 | ~$XXX–$X,XXX | DB upgrade, more instances, HA |
| Scale | 100,000+ | ~$X,XXX–$X,XXX | Kubernetes, read replicas, CDN |

### Scaling triggers

<!--
Specific, actionable thresholds that signal when to upgrade.
-->

| When you hit... | You should... | Cost impact |
|-----------------|---------------|-------------|
| [e.g., >5,000 concurrent users] | [Add Cloud Run instances (min=2)] | [+$14/month per instance] |
| [e.g., DB CPU > 80% sustained] | [Upgrade to db-custom-2-7680] | [+$78/month] |
| [e.g., >50 GB stored files] | [Add lifecycle policies] | [Saves ~$X/month] |

---

## Recommendations

<!--
Prioritized, actionable recommendations.
Tag each with audience and effort level.
-->

### Quick wins (implement now)

| # | Recommendation | Savings / Benefit | Effort |
|---|---------------|-------------------|--------|
| 1 | [e.g., Enable Cloud CDN caching for static assets] | [Faster load times, lower egress cost] | Low |
| 2 | ... | ... | ... |

### Strategic improvements (plan for next quarter)

| # | Recommendation | Savings / Benefit | Effort |
|---|---------------|-------------------|--------|
| 1 | [e.g., Add structured logging with Cloud Logging] | [Faster debugging, cost visibility] | Medium |
| 2 | ... | ... | ... |

### Before scaling past [threshold]

| # | Recommendation | Why |
|---|---------------|-----|
| 1 | [e.g., Enable Cloud SQL HA] | [Single-point-of-failure at current config] |
| 2 | ... | ... |

---

## Assumptions & Caveats

<!--
Be transparent about what's estimated vs known.
This builds trust with both audiences.
-->

- Pricing based on GCP us-central1 (Iowa) region as of [date]. Adjust ±15% for other regions.
- Estimates assume [X MAU, Y req/day] as stated in the IRS.
- Costs do not include: [list exclusions — e.g., third-party APIs, domain registration, email services, monitoring SaaS]
- Database size estimates are based on schema analysis; actual growth depends on usage patterns.
- [Any other assumptions from the IRS or estimate]

---

*Report generated by wiz-cost-lite skill using infra-estimate + gcp-cost-estimate*
```

---

## Step 4 — Present to the user

After writing the file:

1. Tell the user the report has been saved and its path
2. Display the **full report** in the conversation (not just a summary)
3. Ask if they'd like to:
   - Adjust any assumptions (scale, region, availability)
   - Add another cloud provider estimate (e.g., AWS, Azure) for comparison
   - Deep-dive into any specific section

---

## Quality checklist (verify before outputting)

Before presenting the report, verify:

- [ ] "At a Glance" section is understandable by someone with zero technical knowledge
- [ ] Every dollar amount in the Executive Summary matches the Technical Architecture section
- [ ] The ASCII cost bar chart percentages add up to ~100%
- [ ] Architecture diagram accurately reflects the services in the cost table
- [ ] Scaling roadmap includes at least 4 tiers
- [ ] Every recommendation is specific and actionable (not generic advice)
- [ ] Assumptions section lists all material caveats
- [ ] No undefined acronyms in the Executive Summary section
- [ ] File has been written to `./cost/<project-name>-decision-report.md`
