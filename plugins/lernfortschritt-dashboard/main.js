"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LernfortschrittDashboardPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// ../../packages/shared-core/src/dashboard.ts
function calculateDashboardMetrics(notes, today = /* @__PURE__ */ new Date()) {
  const byStatus = {};
  const byYear = {};
  const weakModules = /* @__PURE__ */ new Map();
  let dueReviews = 0;
  for (const note of notes) {
    const statusKey = note.lernstatus ?? note.status ?? "unbekannt";
    const yearKey = note.ausbildungsjahr ?? "ohne-jahr";
    byStatus[statusKey] = (byStatus[statusKey] ?? 0) + 1;
    byYear[yearKey] = (byYear[yearKey] ?? 0) + 1;
    if (typeof note.score_last === "number" && note.modul_id) {
      const current = weakModules.get(note.modul_id) ?? { total: 0, count: 0 };
      current.total += note.score_last;
      current.count += 1;
      weakModules.set(note.modul_id, current);
    }
    if (note.next_review && new Date(note.next_review) <= today) {
      dueReviews += 1;
    }
  }
  return {
    total: notes.length,
    byStatus,
    byYear,
    dueReviews,
    weakModules: [...weakModules.entries()].map(([modulId, value]) => ({
      modulId,
      averageScore: Math.round(value.total / value.count),
      count: value.count
    })).sort((left, right) => left.averageScore - right.averageScore).slice(0, 5)
  };
}
function renderDashboardMarkdown(metrics) {
  const lines = [
    "# Lernfortschritt Dashboard",
    "",
    `- Notizen gesamt: ${metrics.total}`,
    `- F\xE4llige Reviews: ${metrics.dueReviews}`,
    "",
    "## Status",
    ...Object.entries(metrics.byStatus).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Ausbildungsjahre",
    ...Object.entries(metrics.byYear).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Schwaechste Module",
    ...metrics.weakModules.map((item) => `- ${item.modulId}: ${item.averageScore}% aus ${item.count} Notizen`)
  ];
  return lines.join("\n");
}

// ../../packages/shared-core/src/notes.ts
var FRONTMATTER_DELIMITER = "---";
function parseScalarValue(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map((part) => part.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}
function parseFrontmatter(markdown) {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return {};
  }
  const result = {};
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === FRONTMATTER_DELIMITER) {
      break;
    }
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    result[key] = parseScalarValue(value);
  }
  return result;
}
function deriveModuleId(path, existing) {
  if (existing) {
    return existing;
  }
  const parts = path.split("/");
  const direct = parts.find((part) => /^LF\d+/i.test(part) || /^X\d+/i.test(part));
  if (direct) {
    return direct.match(/^(LF\d+|X\d+)/i)?.[1]?.toUpperCase() ?? "UNSORTIERT";
  }
  return "UNSORTIERT";
}
function parseLearningNote(path, markdown) {
  const fm = parseFrontmatter(markdown);
  const lines = markdown.split(/\r?\n/);
  const title = lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") ?? path.split("/").pop() ?? path;
  const folder = path.split("/").slice(0, -1).join("/");
  return {
    path,
    title,
    folder,
    status: typeof fm.status === "string" ? fm.status : void 0,
    ausbildungsjahr: typeof fm.ausbildungsjahr === "string" ? fm.ausbildungsjahr : void 0,
    lernstatus: typeof fm.lernstatus === "string" ? fm.lernstatus : void 0,
    lerntyp: typeof fm.lerntyp === "string" ? fm.lerntyp : void 0,
    modul_id: deriveModuleId(path, typeof fm.modul_id === "string" ? fm.modul_id : void 0),
    pruefungsrelevanz: typeof fm.pruefungsrelevanz === "string" ? fm.pruefungsrelevanz : void 0,
    last_review: typeof fm.last_review === "string" ? fm.last_review : void 0,
    next_review: typeof fm.next_review === "string" ? fm.next_review : void 0,
    difficulty: typeof fm.difficulty === "number" ? fm.difficulty : void 0,
    score_last: typeof fm.score_last === "number" ? fm.score_last : void 0,
    score_best: typeof fm.score_best === "number" ? fm.score_best : void 0,
    time_estimate_min: typeof fm.time_estimate_min === "number" ? fm.time_estimate_min : void 0,
    badge: typeof fm.badge === "string" ? fm.badge : void 0,
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : void 0
  };
}
function updateYamlField(markdown, key, value) {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return `---
${key}: "${value}"
---

${markdown}`;
  }
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === FRONTMATTER_DELIMITER) {
      lines.splice(index, 0, `${key}: "${value}"`);
      return lines.join("\n");
    }
    if (lines[index].startsWith(`${key}:`)) {
      lines[index] = `${key}: "${value}"`;
      return lines.join("\n");
    }
  }
  return markdown;
}

// ../../packages/plugin-kit/src/index.ts
var import_obsidian = require("obsidian");
var DEFAULT_BASE_SETTINGS = {
  rootFolders: ["000_Ausbildung_Industriekaufmann_2026", "quizzes"],
  dashboardFolder: "_plugin_outputs",
  periodicNotesFolder: "Periodic/Daily",
  useDataview: true
};
async function scanVault(app, rootFolders) {
  const files = app.vault.getMarkdownFiles().filter((file) => rootFolders.some((folder) => file.path.startsWith(folder)));
  const results = [];
  for (const file of files) {
    const markdown = await app.vault.cachedRead(file);
    results.push({
      note: parseLearningNote(file.path, markdown),
      file,
      markdown
    });
  }
  return results;
}
async function ensureFolder(app, folderPath) {
  const parts = folderPath.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
}
async function writePluginOutput(app, folderPath, fileName, content) {
  await ensureFolder(app, folderPath);
  const path = `${folderPath}/${fileName}`;
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian.TFile) {
    await app.vault.modify(existing, content);
  } else {
    await app.vault.create(path, content);
  }
  return path;
}
async function updateLearningStatus(app, file, status) {
  const markdown = await app.vault.cachedRead(file);
  const updated = updateYamlField(markdown, "lernstatus", status);
  await app.vault.modify(file, updated);
}
function getDataviewApi(plugin, useDataview) {
  if (!useDataview) {
    return null;
  }
  const candidate = plugin.app.plugins?.plugins?.dataview?.api;
  return candidate ?? null;
}
function noticeSuccess(message) {
  new import_obsidian.Notice(message, 4e3);
}
var BaseSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: this.plugin.manifest.name });
    new import_obsidian.Setting(containerEl).setName("Root folders").setDesc("Comma-separated root folders to scan for notes.").addText(
      (text) => text.setValue(this.plugin.settings.rootFolders.join(", ")).onChange(async (value) => {
        this.plugin.settings.rootFolders = value.split(",").map((entry) => entry.trim()).filter(Boolean);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Output folder").setDesc("Where generated markdown dashboards and plans should be written.").addText(
      (text) => text.setValue(this.plugin.settings.dashboardFolder).onChange(async (value) => {
        this.plugin.settings.dashboardFolder = value.trim() || "_plugin_outputs";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Periodic notes folder").setDesc("Folder used for review queues and study journal integration.").addText(
      (text) => text.setValue(this.plugin.settings.periodicNotesFolder).onChange(async (value) => {
        this.plugin.settings.periodicNotesFolder = value.trim() || "Periodic/Daily";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Prefer Dataview").setDesc("Use Dataview when available, but keep a safe fallback.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.useDataview).onChange(async (value) => {
        this.plugin.settings.useDataview = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/main.ts
var DEFAULT_SETTINGS = {
  ...DEFAULT_BASE_SETTINGS,
  snapshotFileName: "lernfortschritt-dashboard.md"
};
var LernfortschrittDashboardPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("bar-chart-3", "Lernfortschritt Snapshot", () => void this.generateSnapshot());
    this.addCommand({
      id: "generate-dashboard-snapshot",
      name: "Dashboard: Snapshot generieren",
      callback: () => void this.generateSnapshot()
    });
    this.addCommand({
      id: "mark-current-note-geuebt",
      name: "Dashboard: Aktuelle Notiz als geuebt markieren",
      callback: () => void this.markCurrent("geuebt")
    });
    this.addCommand({
      id: "mark-current-note-beherrscht",
      name: "Dashboard: Aktuelle Notiz als beherrscht markieren",
      callback: () => void this.markCurrent("beherrscht")
    });
    this.addSettingTab(new BaseSettingsTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async generateSnapshot() {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    const metrics = calculateDashboardMetrics(scanned.map((entry) => entry.note));
    const dataviewApi = getDataviewApi(this, this.settings.useDataview);
    const dataviewHint = dataviewApi ? "\n\n> Dataview erkannt: Live-Abfragen koennen in dieser Snapshot-Note ergaenzt werden.\n" : "\n\n> Dataview nicht aktiv: Snapshot basiert auf sicherem Vault-Scan.\n";
    const content = `${renderDashboardMarkdown(metrics)}${dataviewHint}`;
    const path = await writePluginOutput(this.app, this.settings.dashboardFolder, this.settings.snapshotFileName, content);
    noticeSuccess(`Dashboard geschrieben: ${path}`);
  }
  async markCurrent(status) {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian2.Notice("Keine aktive Notiz gefunden.");
      return;
    }
    await updateLearningStatus(this.app, file, status);
    noticeSuccess(`lernstatus auf ${status} gesetzt.`);
  }
};
