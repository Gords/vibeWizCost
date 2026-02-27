const http = require("node:http");
const fs = require("node:fs/promises");
const fssync = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = process.cwd();
const WEB_ROOT = path.join(ROOT, "web");
const MARKDOWN_ROOTS = [
  { label: "skills", dir: path.join(ROOT, ".claude", "skills") },
  { label: "cost", dir: path.join(ROOT, "cost") },
  { label: "estimates", dir: path.join(ROOT, "estimates") }
];

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
