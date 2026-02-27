const fileListEl = document.getElementById("fileList");
const fileSearchEl = document.getElementById("fileSearch");
const emptyStateEl = document.getElementById("emptyState");
const docSurfaceEl = document.getElementById("docSurface");
const markdownContentEl = document.getElementById("markdownContent");
const tocEl = document.getElementById("toc");
const activeTitleEl = document.getElementById("activeTitle");
const activeLabelEl = document.getElementById("activeLabel");
const activeUpdatedEl = document.getElementById("activeUpdated");
const activeSizeEl = document.getElementById("activeSize");

let allFiles = [];
let visibleFiles = [];
let activePath = "";

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

function updateUrl(path) {
  const url = new URL(window.location.href);
  if (path) {
    url.searchParams.set("file", path);
  } else {
    url.searchParams.delete("file");
  }
  window.history.replaceState({}, "", url);
}

function getQueryFile() {
  return new URL(window.location.href).searchParams.get("file");
}

function clearContent() {
  markdownContentEl.innerHTML = "";
  tocEl.innerHTML = "";
  tocEl.classList.add("hidden");
  docSurfaceEl.classList.add("hidden");
  emptyStateEl.classList.remove("hidden");
  activeLabelEl.textContent = "Select a file to begin";
  activeTitleEl.textContent = "No file selected";
  activeUpdatedEl.textContent = "Updated: -";
  activeSizeEl.textContent = "Size: -";
}

function escapeHtml(text) {
  const p = document.createElement("p");
  p.textContent = text;
  return p.innerHTML;
}

function renderFileList() {
  fileListEl.innerHTML = "";

  if (!visibleFiles.length) {
    fileListEl.innerHTML = `<li><p style="color:#6a7882;font-size:.85rem;margin:10px 4px;">No markdown files found.</p></li>`;
    return;
  }

  visibleFiles.forEach((file, index) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.path = file.path;
    button.className = file.path === activePath ? "active" : "";
    button.style.animationDelay = `${index * 25}ms`;

    const sectionClass = file.section === "cost" ? "pill-cost" : "pill-skills";
    const sectionLabel = file.section === "cost" ? "Estimate" : "Skill";

    button.innerHTML = `
      <span class="file-name">${escapeHtml(file.name)}</span>
      <span class="file-path">${escapeHtml(file.path)}</span>
      <span class="pill ${sectionClass}">${sectionLabel}</span>
    `;

    button.addEventListener("click", () => {
      loadFile(file.path);
    });

    li.appendChild(button);
    fileListEl.appendChild(li);
  });
}

function filterFiles(term) {
  const query = term.toLowerCase().trim();
  visibleFiles = !query
    ? [...allFiles]
    : allFiles.filter((file) => file.path.toLowerCase().includes(query) || file.name.toLowerCase().includes(query));
  renderFileList();
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
    updateUrl(activePath);

    activeLabelEl.textContent = payload.path;
    activeTitleEl.textContent = payload.path.split("/").pop().replace(/\.md$/i, "");
    activeUpdatedEl.textContent = `Updated: ${formatDate(payload.updatedAt)}`;
    activeSizeEl.textContent = `Size: ${formatBytes(payload.sizeBytes)}`;

    emptyStateEl.classList.add("hidden");
    docSurfaceEl.classList.remove("hidden");
    renderFileList();
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

  if (!window.marked || !window.DOMPurify) {
    emptyStateEl.innerHTML =
      "<h3>Renderer libraries are unavailable</h3><p>Check your internet connection or vendor the JS libraries locally.</p>";
    return;
  }

  try {
    const response = await fetch("/api/files");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    allFiles = payload.files || [];
    visibleFiles = [...allFiles];
    renderFileList();

    const queryFile = getQueryFile();
    if (queryFile && allFiles.some((file) => file.path === queryFile)) {
      await loadFile(queryFile);
      return;
    }

    if (allFiles.length) {
      await loadFile(allFiles[0].path);
    } else {
      emptyStateEl.innerHTML = "<h3>No markdown files found</h3><p>Create files under <code>.claude/skills</code> or <code>cost</code>.</p>";
    }
  } catch (error) {
    emptyStateEl.innerHTML = `<h3>API not available</h3><p>${escapeHtml(String(error))}</p>`;
  }
}

fileSearchEl.addEventListener("input", (event) => {
  filterFiles(event.target.value);
});

window.addEventListener("DOMContentLoaded", init);
