const emptyStateEl = document.getElementById("emptyState");
const docSurfaceEl = document.getElementById("docSurface");
const markdownContentEl = document.getElementById("markdownContent");
const tocEl = document.getElementById("toc");
const activeTitleEl = document.getElementById("activeTitle");
const activeLabelEl = document.getElementById("activeLabel");
const activeUpdatedEl = document.getElementById("activeUpdated");
const activeSizeEl = document.getElementById("activeSize");
const sidebarEl = document.querySelector(".sidebar");
const layoutEl = document.querySelector(".layout");
const exportPdfBtn = document.getElementById("exportPdfBtn");

const TARGET_FILE = "cost/vibewiz-cost-markdown-viewer-vercel.md";
let activePath = TARGET_FILE;

function formatDate(isoDate) {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleString();
}

function formatBytes(bytes) {
  if (typeof bytes !== "number") return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function clearContent() {
  markdownContentEl.innerHTML = "";
  tocEl.innerHTML = "";
  tocEl.classList.add("hidden");
  docSurfaceEl.classList.add("hidden");
  emptyStateEl.classList.remove("hidden");
  activeLabelEl.textContent = "Fixed source";
  activeTitleEl.textContent = "No file selected";
  activeUpdatedEl.textContent = "Updated: -";
  activeSizeEl.textContent = "Size: -";
}

function escapeHtml(text) {
  const p = document.createElement("p");
  p.textContent = text;
  return p.innerHTML;
}

function exportToPdf() {
  const previousTitle = document.title;
  const reportName = activePath ? activePath.split("/").pop().replace(/\.md$/i, "") : "cost-report";
  document.title = reportName;
  window.print();
  window.setTimeout(() => {
    document.title = previousTitle;
  }, 400);
}

function buildToc() {
  const headings = [...markdownContentEl.querySelectorAll("h1, h2, h3")];
  if (!headings.length) {
    tocEl.innerHTML = "";
    tocEl.classList.add("hidden");
    return;
  }

  headings.forEach((heading, index) => {
    if (!heading.id) {
      heading.id = `${slugify(heading.textContent)}-${index}`;
    }
  });

  const links = headings
    .map((heading) => {
      return `<a href="#${heading.id}">${escapeHtml(heading.textContent)}</a>`;
    })
    .join("");

  tocEl.innerHTML = `<h4>On this page</h4>${links}`;
  tocEl.classList.remove("hidden");
}

async function loadFile(filePath) {
  try {
    const response = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const markdown = payload.content || "";
    const html = window.marked.parse(markdown, {
      gfm: true,
      breaks: false
    });
    const sanitized = window.DOMPurify.sanitize(html);

    markdownContentEl.innerHTML = sanitized;
    activePath = payload.path;

    activeLabelEl.textContent = payload.path;
    activeTitleEl.textContent = payload.path.split("/").pop().replace(/\.md$/i, "");
    activeUpdatedEl.textContent = `Updated: ${formatDate(payload.updatedAt)}`;
    activeSizeEl.textContent = `Size: ${formatBytes(payload.sizeBytes)}`;

    emptyStateEl.classList.add("hidden");
    docSurfaceEl.classList.remove("hidden");
    buildToc();

    if (window.hljs) {
      document.querySelectorAll("pre code").forEach((block) => {
        window.hljs.highlightElement(block);
      });
    }
  } catch (error) {
    clearContent();
    emptyStateEl.innerHTML = `<h3>Unable to load file</h3><p>${escapeHtml(String(error))}</p>`;
  }
}

async function init() {
  clearContent();

  if (sidebarEl) {
    sidebarEl.classList.add("hidden");
  }
  if (layoutEl) {
    layoutEl.style.gridTemplateColumns = "1fr";
  }

  if (!window.marked || !window.DOMPurify) {
    emptyStateEl.innerHTML =
      "<h3>Renderer libraries are unavailable</h3><p>Check your internet connection or vendor the JS libraries locally.</p>";
    return;
  }

  try {
    await loadFile(TARGET_FILE);
  } catch (error) {
    emptyStateEl.innerHTML = `<h3>API not available</h3><p>${escapeHtml(String(error))}</p>`;
  }
}

window.addEventListener("DOMContentLoaded", init);

if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", exportToPdf);
}
