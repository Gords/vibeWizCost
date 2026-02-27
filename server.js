const http = require("node:http");
const fs = require("node:fs/promises");
const fssync = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = process.cwd();
const WEB_ROOT = path.join(ROOT, "web");
const ESTIMATES_ROOT = path.join(ROOT, "estimates");
const MARKDOWN_ROOTS = [
  { label: "skills", dir: path.join(ROOT, ".claude", "skills") },
  { label: "cost", dir: path.join(ROOT, "cost") },
  { label: "estimates", dir: path.join(ROOT, "estimates") }
];
const GENERATABLE_PROVIDERS = new Set(["aws", "vercel", "gcp", "azure"]);
const PROVIDER_NAMES = {
  aws: "Amazon Web Services",
  vercel: "Vercel",
  gcp: "Google Cloud Platform",
  azure: "Microsoft Azure"
};
const PROVIDER_REFERENCE_FILES = {
  aws: [
    ".claude/skills/wiz-cost-aws/architecture-guide.md",
    ".claude/skills/wiz-cost-aws/aws-pricing.md"
  ],
  vercel: [
    ".claude/skills/wiz-cost-vercel/architecture-guide.md",
    ".claude/skills/wiz-cost-vercel/vercel-pricing.md"
  ],
  gcp: [
    ".claude/skills/wiz-cost-gcp/architecture-guide.md",
    ".claude/skills/wiz-cost-gcp/gcp-pricing.md"
  ],
  azure: [
    ".claude/skills/wiz-cost-azure/architecture-guide.md",
    ".claude/skills/wiz-cost-azure/azure-pricing.md"
  ]
};
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const MAX_BODY_BYTES = 256 * 1024;
const MAX_JOBS = 100;
const jobs = new Map();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function isPathInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isSafeProjectName(project) {
  return typeof project === "string" && /^[A-Za-z0-9._-]+$/.test(project);
}

function resolveProjectDir(project) {
  if (!isSafeProjectName(project)) {
    return null;
  }
  const projectDir = path.resolve(ESTIMATES_ROOT, project);
  return isPathInside(ESTIMATES_ROOT, projectDir) ? projectDir : null;
}

async function directoryExists(dirPath) {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function collectMarkdownFiles(dirPath, bucket = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await collectMarkdownFiles(absolutePath, bucket);
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
      continue;
    }

    const stat = await fs.stat(absolutePath);
    bucket.push({
      absolutePath,
      updatedAt: stat.mtime.toISOString(),
      sizeBytes: stat.size
    });
  }

  return bucket;
}

function toPublicPath(absolutePath) {
  return path.relative(ROOT, absolutePath).replaceAll(path.sep, "/");
}

async function listMarkdownFiles() {
  const files = [];

  for (const source of MARKDOWN_ROOTS) {
    if (!(await directoryExists(source.dir))) {
      continue;
    }

    const sourceFiles = await collectMarkdownFiles(source.dir);
    for (const file of sourceFiles) {
      files.push({
        path: toPublicPath(file.absolutePath),
        name: path.basename(file.absolutePath, ".md"),
        section: source.label,
        updatedAt: file.updatedAt,
        sizeBytes: file.sizeBytes
      });
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

function writeJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": MIME_TYPES[".json"],
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function writeNotFound(res, message = "Not found") {
  writeJson(res, 404, { error: message });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", reject);
  });
}

async function parseJsonBody(req) {
  const body = await readRequestBody(req);
  if (!body.trim()) {
    return {};
  }
  return JSON.parse(body);
}

async function readOptionalFile(relativePath, maxChars = 9000) {
  const absolute = path.join(ROOT, relativePath);
  try {
    const text = await fs.readFile(absolute, "utf8");
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n...[truncated]` : text;
  } catch {
    return "";
  }
}

function unwrapMarkdownFence(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  if (match) {
    return match[1].trim();
  }
  return trimmed;
}

function pruneJobs() {
  if (jobs.size <= MAX_JOBS) {
    return;
  }
  const sorted = [...jobs.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const removeCount = jobs.size - MAX_JOBS;
  for (let i = 0; i < removeCount; i += 1) {
    jobs.delete(sorted[i].id);
  }
}

function serializeJob(job) {
  return {
    id: job.id,
    project: job.project,
    provider: job.provider,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt || null,
    completedAt: job.completedAt || null,
    outputPath: job.outputPath || null,
    error: job.error || null
  };
}

async function buildGenerationPrompt(project, provider, infraContent) {
  const providerName = PROVIDER_NAMES[provider] || provider.toUpperCase();
  const references = PROVIDER_REFERENCE_FILES[provider] || [];
  const referenceChunks = [];

  for (const relativeFile of references) {
    const text = await readOptionalFile(relativeFile, 10000);
    if (!text) continue;
    referenceChunks.push(`## Reference: ${relativeFile}\n${text}`);
  }

  const refsText = referenceChunks.length
    ? referenceChunks.join("\n\n")
    : "No additional reference files were available.";

  return [
    "You are an infrastructure cost estimation assistant.",
    `Generate a markdown report for project "${project}" on provider "${providerName}".`,
    "Return markdown only. Do not wrap in code fences.",
    "Use clear sections and include architecture, line-item cost breakdown, summary totals, optimization tips, and scale projections.",
    "",
    "## Infrastructure Requirements",
    infraContent,
    "",
    "## Provider Pricing/Architecture References",
    refsText
  ].join("\n");
}

function runClaudePrompt(prompt) {
  return new Promise((resolve, reject) => {
    const args = [
      "-p",
      prompt,
      "--output-format",
      "text",
      "--permission-mode",
      "dontAsk",
      "--no-session-persistence",
      "--tools",
      ""
    ];

    const child = spawn(CLAUDE_BIN, args, {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Claude process exited with code ${code}`));
        return;
      }
      resolve(stdout);
    });
  });
}

async function executeGenerationJob(job) {
  job.status = "running";
  job.startedAt = new Date().toISOString();

  try {
    const projectDir = resolveProjectDir(job.project);
    if (!projectDir || !(await directoryExists(projectDir))) {
      throw new Error("Project directory was not found under estimates/");
    }

    const infraPath = path.join(projectDir, "infra.md");
    let infraContent;
    try {
      infraContent = await fs.readFile(infraPath, "utf8");
    } catch {
      throw new Error(`Missing infrastructure file: estimates/${job.project}/infra.md`);
    }

    const prompt = await buildGenerationPrompt(job.project, job.provider, infraContent);
    const output = await runClaudePrompt(prompt);
    const markdown = unwrapMarkdownFence(output);
    if (!markdown) {
      throw new Error("Claude returned empty output");
    }

    const outputPath = path.join(projectDir, `${job.provider}.md`);
    await fs.writeFile(outputPath, `${markdown.trim()}\n`, "utf8");

    job.status = "completed";
    job.outputPath = path.relative(ROOT, outputPath).replaceAll(path.sep, "/");
    job.completedAt = new Date().toISOString();
    job.error = null;
  } catch (error) {
    job.status = "failed";
    job.completedAt = new Date().toISOString();
    job.error = error instanceof Error ? error.message : String(error);
  } finally {
    pruneJobs();
  }
}

function findActiveJob(project, provider) {
  return [...jobs.values()].find((job) => job.project === project && job.provider === provider && (job.status === "queued" || job.status === "running"));
}

function markdownPathAllowed(candidateAbsolutePath) {
  return MARKDOWN_ROOTS.some((source) => {
    if (!fssync.existsSync(source.dir)) {
      return false;
    }
    return isPathInside(source.dir, candidateAbsolutePath);
  });
}

async function handleApi(req, res, requestUrl) {
  if (requestUrl.pathname === "/api/files") {
    const files = await listMarkdownFiles();
    writeJson(res, 200, {
      generatedAt: new Date().toISOString(),
      count: files.length,
      files
    });
    return;
  }

  if (requestUrl.pathname === "/api/file") {
    const requested = requestUrl.searchParams.get("path");
    if (!requested) {
      writeJson(res, 400, { error: "Missing required query parameter: path" });
      return;
    }

    const normalized = requested.replaceAll("\\", "/");
    if (!normalized.toLowerCase().endsWith(".md") || normalized.startsWith("/")) {
      writeJson(res, 400, { error: "Only relative .md files are supported" });
      return;
    }

    const absolutePath = path.resolve(ROOT, normalized);
    if (!markdownPathAllowed(absolutePath)) {
      writeJson(res, 403, { error: "Requested file is outside allowed markdown folders" });
      return;
    }

    try {
      const content = await fs.readFile(absolutePath, "utf8");
      const stat = await fs.stat(absolutePath);
      writeJson(res, 200, {
        path: toPublicPath(absolutePath),
        updatedAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
        content
      });
    } catch {
      writeNotFound(res, "Markdown file not found");
    }
    return;
  }

  if (requestUrl.pathname === "/api/generate") {
    if (req.method !== "POST") {
      writeJson(res, 405, { error: "Method not allowed" });
      return;
    }

    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      writeJson(res, 400, { error: `Invalid JSON body: ${error instanceof Error ? error.message : String(error)}` });
      return;
    }

    const project = typeof body.project === "string" ? body.project.trim() : "";
    const provider = typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "";

    if (!project || !provider) {
      writeJson(res, 400, { error: "Required fields: project, provider" });
      return;
    }
    if (!GENERATABLE_PROVIDERS.has(provider)) {
      writeJson(res, 400, { error: `Unsupported provider: ${provider}` });
      return;
    }

    const projectDir = resolveProjectDir(project);
    if (!projectDir || !(await directoryExists(projectDir))) {
      writeJson(res, 404, { error: `Project not found: estimates/${project}` });
      return;
    }

    const existing = findActiveJob(project, provider);
    if (existing) {
      writeJson(res, 200, { reused: true, job: serializeJob(existing) });
      return;
    }

    const jobId = crypto.randomUUID();
    const job = {
      id: jobId,
      project,
      provider,
      status: "queued",
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      outputPath: null,
      error: null
    };

    jobs.set(jobId, job);
    setImmediate(() => {
      executeGenerationJob(job).catch((error) => {
        job.status = "failed";
        job.error = error instanceof Error ? error.message : String(error);
        job.completedAt = new Date().toISOString();
      });
    });

    writeJson(res, 202, { job: serializeJob(job) });
    return;
  }

  if (requestUrl.pathname === "/api/generate-status") {
    const jobId = requestUrl.searchParams.get("jobId");
    if (!jobId) {
      writeJson(res, 400, { error: "Missing required query parameter: jobId" });
      return;
    }

    const job = jobs.get(jobId);
    if (!job) {
      writeNotFound(res, "Generation job not found");
      return;
    }

    writeJson(res, 200, { job: serializeJob(job) });
    return;
  }

  writeNotFound(res);
}

function safeStaticPath(urlPath) {
  const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
  const resolved = path.resolve(WEB_ROOT, `.${requestedPath}`);
  return isPathInside(WEB_ROOT, resolved) ? resolved : null;
}

async function handleStatic(req, res, requestUrl) {
  const targetPath = safeStaticPath(requestUrl.pathname);
  if (!targetPath) {
    writeNotFound(res);
    return;
  }

  let stat;
  try {
    stat = await fs.stat(targetPath);
  } catch {
    writeNotFound(res);
    return;
  }

  if (stat.isDirectory()) {
    writeNotFound(res);
    return;
  }

  const extension = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";

  res.writeHead(200, { "Content-Type": contentType });
  fssync.createReadStream(targetPath).pipe(res);
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", `http://${req.headers.host}`);
      if (requestUrl.pathname.startsWith("/api/")) {
        await handleApi(req, res, requestUrl);
        return;
      }

      await handleStatic(req, res, requestUrl);
    } catch (error) {
      writeJson(res, 500, {
        error: "Internal server error",
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`Markdown viewer running on http://${HOST}:${PORT}`);
  });
}

module.exports = {
  createServer,
  listMarkdownFiles
};
