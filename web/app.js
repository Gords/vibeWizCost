const projectListEl = document.getElementById("projectList");
const providerNavEl = document.getElementById("providerNav");
const reportsContainerEl = document.getElementById("reportsContainer");
const emptyStateEl = document.getElementById("emptyState");
const activeProjectTitleEl = document.getElementById("activeProjectTitle");
const activeProjectMetaEl = document.getElementById("activeProjectMeta");
const exportPdfBtn = document.getElementById("exportPdfBtn");

const BASE_TABS = [
  { id: "infra", label: "Infra", title: "Infrastructure", icon: null },
  { id: "aws", label: "AWS", title: "Amazon Web Services", icon: "/icons/aws.svg" },
  { id: "vercel", label: "Vercel", title: "Vercel", icon: "/icons/vercel.svg" },
  { id: "gcp", label: "GCP", title: "Google Cloud", icon: "/icons/gcp.svg" },
  { id: "azure", label: "Azure", title: "Microsoft Azure", icon: "/icons/azure.svg" }
];

const fileCache = new Map();
let projects = [];
let activeProjectId = "";
let activeTabId = "";

function escapeHtml(text) {
  const p = document.createElement("p");
  p.textContent = String(text);
  return p.innerHTML;
}

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

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

function detectTabId(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes("infra")) return "infra";
  if (lower.includes("aws") || lower.includes("amazon")) return "aws";
  if (lower.includes("vercel")) return "vercel";
  if (lower.includes("gcp") || lower.includes("gcloud") || lower.includes("google")) return "gcp";
  if (lower.includes("azure")) return "azure";
  return "other";
}

function buildProjects(files) {
  const byProject = new Map();

  for (const file of files) {
    if (!file.path.startsWith("estimates/") || !file.path.toLowerCase().endsWith(".md")) {
      continue;
    }

    const relPath = file.path.slice("estimates/".length);
    const parts = relPath.split("/");
    if (parts.length < 2) continue;

    const projectId = parts[0];
    const filename = parts[parts.length - 1];

    if (!byProject.has(projectId)) {
      byProject.set(projectId, {
        id: projectId,
        name: projectId,
        files: [],
        fileByTab: {},
        extras: [],
        updatedAt: null
      });
    }

    const project = byProject.get(projectId);
    project.files.push({
      ...file,
      filename
    });
  }

  const allProjects = [...byProject.values()].map((project) => {
    project.files.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    project.updatedAt = project.files[0]?.updatedAt || null;

    for (const file of project.files) {
      const tabId = detectTabId(file.filename);
      if (tabId === "other") {
        project.extras.push(file);
        continue;
      }
      if (!project.fileByTab[tabId]) {
        project.fileByTab[tabId] = file;
      }
    }

    return project;
  });

  allProjects.sort((a, b) => a.name.localeCompare(b.name));
  return allProjects;
}

function getActiveProject() {
  return projects.find((project) => project.id === activeProjectId) || null;
}

function tabButtonHtml(tab, ready) {
  const icon = tab.icon
    ? `<img src="${tab.icon}" alt="${escapeHtml(tab.label)} logo" />`
    : `<div class="generic-icon">I</div>`;
  const stateClass = ready ? "status-ready" : "status-empty";
  return `
    <button class="provider-card ${stateClass}" type="button" data-tab-id="${tab.id}">
      ${icon}
      <div>
        <strong>${escapeHtml(tab.label)}</strong>
        <span>${ready ? "Available" : "No file yet"}</span>
      </div>
    </button>
  `;
}

function renderProjectList() {
  if (!projects.length) {
    projectListEl.innerHTML = `<p class="empty-sidebar">No projects in <code>estimates/</code>.</p>`;
    return;
  }

  projectListEl.innerHTML = projects
    .map((project) => {
      return `
        <button class="project-item" type="button" data-project-id="${project.id}">
          <strong>${escapeHtml(project.name)}</strong>
          <span>${project.files.length} files</span>
        </button>
      `;
    })
    .join("");

  const buttons = projectListEl.querySelectorAll(".project-item");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const projectId = button.getAttribute("data-project-id");
      if (!projectId || projectId === activeProjectId) return;
      setActiveProject(projectId);
    });
  });
}

function syncProjectActiveState() {
  const buttons = projectListEl.querySelectorAll(".project-item");
  buttons.forEach((button) => {
    const isActive = button.getAttribute("data-project-id") === activeProjectId;
    button.classList.toggle("is-active", isActive);
  });
}

function renderProviderTabs(project) {
  const base = BASE_TABS.map((tab) => tabButtonHtml(tab, Boolean(project.fileByTab[tab.id])));
  const extras = project.extras.map((file, index) => {
    const extraTabId = `extra-${index}`;
    return `
      <button class="provider-card status-ready" type="button" data-tab-id="${extraTabId}">
        <div class="generic-icon">?</div>
        <div>
          <strong>Other</strong>
          <span>${escapeHtml(file.filename)}</span>
        </div>
      </button>
    `;
  });

  providerNavEl.innerHTML = [...base, ...extras].join("");
  const buttons = providerNavEl.querySelectorAll(".provider-card");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab-id");
      if (!tabId || tabId === activeTabId) return;
      setActiveTab(tabId);
    });
  });
}

function getTabMetadata(tabId) {
  if (tabId.startsWith("extra-")) {
    return { label: "Other", title: "Additional Estimate", icon: null };
  }
  return BASE_TABS.find((tab) => tab.id === tabId) || { label: tabId, title: tabId, icon: null };
}

function getFileForTab(project, tabId) {
  if (tabId.startsWith("extra-")) {
    const index = Number(tabId.replace("extra-", ""));
    return Number.isNaN(index) ? null : project.extras[index] || null;
  }
  return project.fileByTab[tabId] || null;
}

function syncTabActiveState() {
  const buttons = providerNavEl.querySelectorAll(".provider-card");
  buttons.forEach((button) => {
    const isActive = button.getAttribute("data-tab-id") === activeTabId;
    button.classList.toggle("is-active", isActive);
  });
}

function renderMissingTabState(project, tabId) {
  const tab = getTabMetadata(tabId);
  reportsContainerEl.innerHTML = `
    <article class="report-section report-missing">
      <header class="report-header">
        <div class="provider-meta">
          ${tab.icon ? `<img src="${tab.icon}" alt="${escapeHtml(tab.label)} logo" />` : `<div class="generic-icon">I</div>`}
          <div>
            <p class="provider-kicker">${escapeHtml(project.name)}</p>
            <h3>${escapeHtml(tab.title)}</h3>
          </div>
        </div>
      </header>
      <div class="missing-message">No <code>${escapeHtml(tab.label.toLowerCase())}.md</code> file found in this project.</div>
    </article>
  `;
}

function highlightCodeBlocks() {
  if (!window.hljs) return;
  document.querySelectorAll("pre code").forEach((block) => {
    window.hljs.highlightElement(block);
  });
}

async function getFilePayload(path) {
  if (fileCache.has(path)) {
    return fileCache.get(path);
  }
  const payload = await fetchJson(`/api/file?path=${encodeURIComponent(path)}`);
  fileCache.set(path, payload);
  return payload;
}

async function renderTabContent(project, tabId) {
  const file = getFileForTab(project, tabId);
  if (!file) {
    renderMissingTabState(project, tabId);
    return;
  }

  const tab = getTabMetadata(tabId);
  const payload = await getFilePayload(file.path);
  const html = window.marked.parse(payload.content || "", { gfm: true, breaks: false });
  const sanitized = window.DOMPurify.sanitize(html);

  reportsContainerEl.innerHTML = `
    <article class="report-section">
      <header class="report-header">
        <div class="provider-meta">
          ${tab.icon ? `<img src="${tab.icon}" alt="${escapeHtml(tab.label)} logo" />` : `<div class="generic-icon">I</div>`}
          <div>
            <p class="provider-kicker">${escapeHtml(project.name)}</p>
            <h3>${escapeHtml(tab.title)}</h3>
            <p class="provider-file">${escapeHtml(payload.path)}</p>
          </div>
        </div>
        <div class="provider-stats">
          <span>Updated: ${escapeHtml(formatDate(payload.updatedAt))}</span>
          <span>Size: ${escapeHtml(formatBytes(payload.sizeBytes))}</span>
        </div>
      </header>
      <div class="markdown-body">${sanitized}</div>
    </article>
  `;

  highlightCodeBlocks();
}

function pickDefaultTab(project) {
  if (project.fileByTab.infra) return "infra";
  for (const tab of BASE_TABS) {
    if (project.fileByTab[tab.id]) return tab.id;
  }
  if (project.extras.length) return "extra-0";
  return "infra";
}

async function setActiveTab(tabId) {
  const project = getActiveProject();
  if (!project) return;
  activeTabId = tabId;
  syncTabActiveState();
  await renderTabContent(project, tabId);
}

async function setActiveProject(projectId) {
  activeProjectId = projectId;
  syncProjectActiveState();

  const project = getActiveProject();
  if (!project) return;

  activeProjectTitleEl.textContent = project.name;
  activeProjectMetaEl.textContent = `Folder: estimates/${project.name} • Files: ${project.files.length}`;

  renderProviderTabs(project);
  await setActiveTab(pickDefaultTab(project));
}

async function init() {
  if (!window.marked || !window.DOMPurify) {
    emptyStateEl.classList.remove("hidden");
    emptyStateEl.innerHTML = "<h3>Renderer libraries unavailable</h3><p>Check your internet connection.</p>";
    return;
  }

  const payload = await fetchJson("/api/files");
  projects = buildProjects(payload.files || []);

  if (!projects.length) {
    emptyStateEl.classList.remove("hidden");
    providerNavEl.innerHTML = "";
    reportsContainerEl.innerHTML = "";
    projectListEl.innerHTML = `<p class="empty-sidebar">No projects in <code>estimates/</code>.</p>`;
    return;
  }

  emptyStateEl.classList.add("hidden");
  renderProjectList();
  await setActiveProject(projects[0].id);
}

function exportToPdf() {
  const previousTitle = document.title;
  const project = getActiveProject();
  const activeProjectName = project ? project.name : "estimate";
  const tab = getTabMetadata(activeTabId || "infra");
  document.title = `${activeProjectName}-${tab.label}`.toLowerCase();
  window.print();
  window.setTimeout(() => {
    document.title = previousTitle;
  }, 400);
}

window.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    emptyStateEl.classList.remove("hidden");
    emptyStateEl.innerHTML = `<h3>Failed to load estimates</h3><p>${escapeHtml(String(error))}</p>`;
  });
});

if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", exportToPdf);
}
