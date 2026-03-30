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
  default: () => LernplanGeneratorPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

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

// ../../packages/shared-core/src/planner.ts
function isBlocked(date, settings) {
  const blocked = /* @__PURE__ */ new Set([...settings.holidays ?? [], ...settings.vacationDays ?? []]);
  return blocked.has(date);
}
function rankNote(note) {
  const relevanceScore = {
    "ihk-kritisch": 4,
    hoch: 3,
    mittel: 2,
    niedrig: 1
  }[note.pruefungsrelevanz ?? "niedrig"] ?? 0;
  const performancePenalty = typeof note.score_last === "number" ? Math.max(0, 100 - note.score_last) / 20 : 1;
  const reviewBoost = note.next_review ? 2 : 0;
  return relevanceScore + performancePenalty + reviewBoost;
}
function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}
function generateStudyPlan(notes, settings) {
  const examDate = /* @__PURE__ */ new Date(`${settings.examDate}T12:00:00`);
  const today = /* @__PURE__ */ new Date();
  const queue = [...notes].filter((note) => Boolean(note.modul_id)).sort((left, right) => rankNote(right) - rankNote(left));
  const tasks = [];
  let pointer = new Date(today);
  const dailyMinutes = settings.dailyMinutes ?? Math.max(30, Math.floor(settings.weeklyHours * 60 / 5));
  let queueIndex = 0;
  while (pointer <= examDate && queue.length > 0) {
    const iso = toIsoDate(pointer);
    if (pointer.getDay() !== 0 && !isBlocked(iso, settings)) {
      const note = queue[queueIndex % queue.length];
      tasks.push({
        date: iso,
        notePath: note.path,
        modulId: note.modul_id ?? "UNSORTIERT",
        minutes: note.time_estimate_min ?? dailyMinutes,
        reason: note.next_review && note.next_review <= iso ? "Faellige Wiederholung" : "Pruefungsorientierte Priorisierung"
      });
      queueIndex += 1;
    }
    pointer.setDate(pointer.getDate() + 1);
  }
  return tasks;
}
function renderStudyPlanMarkdown(tasks) {
  const lines = ["# Lernplan", ""];
  for (const task of tasks) {
    lines.push(`- ${task.date}: ${task.modulId} (${task.minutes} min) - ${task.reason}`);
  }
  return lines.join("\n");
}

// ../../packages/plugin-kit/src/index.ts
var import_obsidian = require("obsidian");
var DEFAULT_BASE_SETTINGS = {
  rootFolders: [],
  dashboardFolder: "_plugin_outputs",
  periodicNotesFolder: "Periodic/Daily",
  useDataview: true,
  aiEnabled: false,
  aiProvider: "openai",
  openAiApiKey: "",
  openAiModel: "gpt-4.1-mini",
  openRouterApiKey: "",
  openRouterModel: "openai/gpt-4.1-mini",
  customApiKey: "",
  customModel: "gpt-4.1-mini",
  customEndpoint: "https://api.openai.com/v1/chat/completions",
  requestTimeoutMs: 45e3,
  aiConnectionStatus: "unknown",
  aiConnectionMessage: "No connection test run yet.",
  aiConnectionTestedAt: ""
};
async function scanVault(app, rootFolders) {
  const normalizedRoots = rootFolders.map((entry) => entry.trim()).filter(Boolean);
  const files = app.vault.getMarkdownFiles().filter((file) => normalizedRoots.length === 0 || normalizedRoots.some((folder) => file.path.startsWith(folder)));
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
function noticeSuccess(message) {
  new import_obsidian.Notice(message, 4e3);
}

// src/main.ts
var DEFAULT_SETTINGS = {
  ...DEFAULT_BASE_SETTINGS,
  examDate: "2026-11-15",
  weeklyHours: 6,
  holidays: [],
  vacationDays: [],
  outputFileName: "lernplan.md"
};
var LernplanSettingsTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Lernplan Generator" });
    new import_obsidian2.Setting(containerEl).setName("Exam date").addText(
      (text) => text.setPlaceholder("YYYY-MM-DD").setValue(this.plugin.settings.examDate).onChange(async (value) => {
        this.plugin.settings.examDate = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Weekly hours").addText(
      (text) => text.setValue(String(this.plugin.settings.weeklyHours)).onChange(async (value) => {
        this.plugin.settings.weeklyHours = Number(value) || 6;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Holidays").setDesc("Comma-separated YYYY-MM-DD dates").addText(
      (text) => text.setValue(this.plugin.settings.holidays.join(", ")).onChange(async (value) => {
        this.plugin.settings.holidays = value.split(",").map((entry) => entry.trim()).filter(Boolean);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Vacation days").setDesc("Comma-separated YYYY-MM-DD dates").addText(
      (text) => text.setValue(this.plugin.settings.vacationDays.join(", ")).onChange(async (value) => {
        this.plugin.settings.vacationDays = value.split(",").map((entry) => entry.trim()).filter(Boolean);
        await this.plugin.saveSettings();
      })
    );
  }
};
var LernplanGeneratorPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("calendar-days", "Lernplan generieren", () => void this.generatePlan());
    this.addCommand({
      id: "generate-study-plan",
      name: "Lernplan: Plan generieren",
      callback: () => void this.generatePlan()
    });
    this.addCommand({
      id: "generate-study-plan-periodic",
      name: "Lernplan: Heute in Periodic Notes schreiben",
      callback: () => void this.writeDailyPlan()
    });
    this.addSettingTab(new LernplanSettingsTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async buildPlanMarkdown() {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    const tasks = generateStudyPlan(
      scanned.map((entry) => entry.note),
      {
        examDate: this.settings.examDate,
        weeklyHours: this.settings.weeklyHours,
        holidays: this.settings.holidays,
        vacationDays: this.settings.vacationDays
      }
    );
    return renderStudyPlanMarkdown(tasks);
  }
  async generatePlan() {
    const markdown = await this.buildPlanMarkdown();
    const path = await writePluginOutput(this.app, this.settings.dashboardFolder, this.settings.outputFileName, markdown);
    noticeSuccess(`Lernplan geschrieben: ${path}`);
  }
  async writeDailyPlan() {
    const markdown = await this.buildPlanMarkdown();
    const fileName = `${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}-study-plan.md`;
    const path = await writePluginOutput(this.app, this.settings.periodicNotesFolder, fileName, markdown);
    noticeSuccess(`Tagesplan geschrieben: ${path}`);
  }
};
