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

// ../../packages/shared-core/src/ai.ts
function extractJsonObject(rawText) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return rawText.slice(start, end + 1);
}
function safeJsonParseWithRepair(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const extracted = extractJsonObject(rawText);
    if (!extracted) {
      return void 0;
    }
    try {
      return JSON.parse(extracted);
    } catch {
      return void 0;
    }
  }
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

// ../../packages/shared-core/src/study-material.ts
function cleanInlineMarkdown(text) {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").trim();
}
function normalizeSentence(text) {
  return cleanInlineMarkdown(text).replace(/^[-*]\s+/, "").replace(/\s+/g, " ").trim();
}
function analyzeStudyMaterial(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headings = [];
  const definitions = [];
  const bulletFacts = [];
  const statements = [];
  let currentHeading = "";
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed === "---") {
      continue;
    }
    if (/^#{1,6}\s+/.test(trimmed)) {
      const heading = normalizeSentence(trimmed.replace(/^#{1,6}\s+/, ""));
      if (heading) {
        headings.push(heading);
        currentHeading = heading;
      }
      continue;
    }
    const normalized = normalizeSentence(trimmed);
    if (!normalized) {
      continue;
    }
    const definitionMatch = normalized.match(/^([^:]{3,80}):\s+(.{10,})$/);
    if (definitionMatch) {
      definitions.push({
        term: definitionMatch[1].trim(),
        description: definitionMatch[2].trim()
      });
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      bulletFacts.push({
        heading: currentHeading || void 0,
        text: normalized
      });
      continue;
    }
    if (normalized.length >= 35 && normalized.length <= 220 && !normalized.startsWith("status:")) {
      statements.push(normalized);
    }
  }
  const issues = [];
  if (headings.length < 2) {
    issues.push("wenig klare Abschnittsstruktur");
  }
  if (definitions.length === 0) {
    issues.push("keine expliziten Definitionen");
  }
  if (bulletFacts.length === 0) {
    issues.push("kaum stichpunktartige Fakten");
  }
  if (statements.length === 0) {
    issues.push("wenige ausformulierte Kernaussagen");
  }
  const readinessScore = Math.min(headings.length, 4) * 2 + Math.min(definitions.length, 4) * 3 + Math.min(bulletFacts.length, 6) * 2 + Math.min(statements.length, 4) * 1;
  return {
    headings,
    definitions,
    bulletFacts,
    statements,
    readinessScore,
    issues
  };
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
  anthropicApiKey: "",
  anthropicModel: "claude-sonnet-4-6",
  googleApiKey: "",
  googleModel: "gemini-2.5-flash",
  zaiApiKey: "",
  zaiModel: "glm-4.5-air",
  minimaxApiKey: "",
  minimaxModel: "MiniMax-M1",
  moonshotApiKey: "",
  moonshotModel: "kimi-k2.5",
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
async function openOutputFile(app, path, newLeaf = false) {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof import_obsidian.TFile)) {
    return;
  }
  const leaf = app.workspace.getLeaf(newLeaf);
  await leaf.openFile(file);
}
function noticeSuccess(message) {
  new import_obsidian.Notice(message, 4e3);
}
function getAiProviderConfig(settings) {
  if (!settings.aiEnabled) {
    return null;
  }
  if (settings.aiProvider === "openai" && settings.openAiApiKey.trim()) {
    return {
      provider: "openai",
      apiKey: settings.openAiApiKey.trim(),
      model: settings.openAiModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  if (settings.aiProvider === "openrouter" && settings.openRouterApiKey.trim()) {
    return {
      provider: "openrouter",
      apiKey: settings.openRouterApiKey.trim(),
      model: settings.openRouterModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  if (settings.aiProvider === "anthropic" && settings.anthropicApiKey.trim()) {
    return {
      provider: "anthropic",
      apiKey: settings.anthropicApiKey.trim(),
      model: settings.anthropicModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  if (settings.aiProvider === "google" && settings.googleApiKey.trim()) {
    return {
      provider: "google",
      apiKey: settings.googleApiKey.trim(),
      model: settings.googleModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  if (settings.aiProvider === "zai" && settings.zaiApiKey.trim()) {
    return {
      provider: "zai",
      apiKey: settings.zaiApiKey.trim(),
      model: settings.zaiModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  if (settings.aiProvider === "minimax" && settings.minimaxApiKey.trim()) {
    return {
      provider: "minimax",
      apiKey: settings.minimaxApiKey.trim(),
      model: settings.minimaxModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  if (settings.aiProvider === "moonshot" && settings.moonshotApiKey.trim()) {
    return {
      provider: "moonshot",
      apiKey: settings.moonshotApiKey.trim(),
      model: settings.moonshotModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  if (settings.aiProvider === "custom" && settings.customApiKey.trim() && settings.customEndpoint.trim()) {
    return {
      provider: "custom",
      apiKey: settings.customApiKey.trim(),
      model: settings.customModel.trim(),
      endpoint: settings.customEndpoint.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  return null;
}
function getProviderEndpoint(config) {
  if (config.provider === "openai") {
    return "https://api.openai.com/v1/chat/completions";
  }
  if (config.provider === "openrouter") {
    return "https://openrouter.ai/api/v1/chat/completions";
  }
  if (config.provider === "anthropic") {
    return "https://api.anthropic.com/v1/chat/completions";
  }
  if (config.provider === "google") {
    return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  }
  if (config.provider === "zai") {
    return "https://api.z.ai/api/paas/v4/chat/completions";
  }
  if (config.provider === "minimax") {
    return "https://api.minimax.io/v1/chat/completions";
  }
  if (config.provider === "moonshot") {
    return "https://api.moonshot.ai/v1/chat/completions";
  }
  return config.endpoint ?? "https://api.openai.com/v1/chat/completions";
}
async function runAiRequest(config, request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 45e3);
  try {
    const body = {
      model: config.model,
      temperature: request.temperature ?? 0.2,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt }
      ]
    };
    if (request.responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    };
    if (config.provider === "openrouter") {
      headers["HTTP-Referer"] = "https://github.com/p2plus/obsidian-ausbildung-plugins";
      headers["X-Title"] = "Obsidian Ausbildung Plugins";
    }
    const response = await fetch(getProviderEndpoint(config), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const payload = await response.json();
    if (!response.ok) {
      const message = typeof payload.error === "object" && payload.error && "message" in payload.error ? String(payload.error.message) : providerErrorMessage(config.provider, response.status);
      throw new Error(message);
    }
    const content = payload.choices?.[0]?.message?.content;
    const rawText = typeof content === "string" ? content : "";
    const parsed = request.responseFormat === "json" ? safeJsonParseWithRepair(rawText) : void 0;
    return {
      provider: config.provider,
      model: config.model,
      rawText,
      parsed
    };
  } finally {
    clearTimeout(timeout);
  }
}
function providerErrorMessage(provider, status) {
  if (status === 401) {
    return `${providerLabel(provider)} rejected the API key.`;
  }
  if (status === 403) {
    return `${providerLabel(provider)} refused the request. Check account access or model permissions.`;
  }
  if (status === 404) {
    return `${providerLabel(provider)} endpoint or model was not found.`;
  }
  if (status === 429) {
    return `${providerLabel(provider)} rate limit reached.`;
  }
  if (status >= 500) {
    return `${providerLabel(provider)} returned a server error (${status}).`;
  }
  return `${providerLabel(provider)} request failed with HTTP ${status}.`;
}
function providerLabel(provider) {
  if (provider === "openai") return "OpenAI";
  if (provider === "openrouter") return "OpenRouter";
  if (provider === "anthropic") return "Anthropic";
  if (provider === "google") return "Google";
  if (provider === "zai") return "Z.AI";
  if (provider === "minimax") return "MiniMax";
  if (provider === "moonshot") return "Moonshot";
  return "Custom provider";
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
    this.addRibbonIcon("calendar-days", "Lernplan Vorschau oeffnen", () => void this.openPlanPreview());
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
    this.addCommand({
      id: "preview-study-plan",
      name: "Lernplan: Interaktive Vorschau",
      callback: () => void this.openPlanPreview()
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
    const readiness = scanned.map((entry) => ({
      path: entry.note.path,
      title: entry.note.title,
      signals: analyzeStudyMaterial(entry.markdown)
    }));
    const readyCount = readiness.filter((entry) => entry.signals.readinessScore >= 4).length;
    const weakCount = readiness.length - readyCount;
    const tasks = generateStudyPlan(
      scanned.map((entry) => entry.note),
      {
        examDate: this.settings.examDate,
        weeklyHours: this.settings.weeklyHours,
        holidays: this.settings.holidays,
        vacationDays: this.settings.vacationDays
      }
    );
    let markdown = [
      "# Ausgangslage",
      "",
      `- Auswertbare Lernnotizen: ${readyCount}`,
      `- Notizen mit schwacher Struktur: ${weakCount}`,
      "",
      renderStudyPlanMarkdown(tasks)
    ].join("\n");
    const provider = getAiProviderConfig(this.settings);
    if (provider) {
      try {
        const aiResponse = await runAiRequest(provider, {
          systemPrompt: "Du bist ein Lernplan-Optimierer. Gib kurze, hilfreiche Verbesserungsvorschl\xE4ge f\xFCr den Lernplan.",
          userPrompt: `Analysiere diesen Lernplan und gib 2-3 konkrete Verbesserungsvorschl\xE4ge:

${markdown.slice(0, 2e3)}`,
          temperature: 0.3
        });
        markdown += `

## AI-Vorschl\xE4ge
${aiResponse.rawText}`;
      } catch (error) {
      }
    }
    return markdown;
  }
  async generatePlan() {
    const markdown = await this.buildPlanMarkdown();
    const path = await writePluginOutput(this.app, this.settings.dashboardFolder, this.settings.outputFileName, markdown);
    noticeSuccess(`Lernplan geschrieben: ${path}`);
    await openOutputFile(this.app, path, true);
  }
  async writeDailyPlan() {
    const markdown = await this.buildPlanMarkdown();
    const fileName = `${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}-study-plan.md`;
    const path = await writePluginOutput(this.app, this.settings.periodicNotesFolder, fileName, markdown);
    noticeSuccess(`Tagesplan geschrieben: ${path}`);
    await openOutputFile(this.app, path, true);
  }
  openPlanPreview() {
    new PlanPreviewModal(this.app, this).open();
  }
};
var PlanPreviewModal = class extends import_obsidian2.Modal {
  constructor(app, plugin) {
    super(app);
    this.tasks = [];
    this.plugin = plugin;
    this.currentMonth = /* @__PURE__ */ new Date();
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const shell = contentEl.createDiv({ cls: "plan-preview-modal" });
    const header = shell.createDiv({ cls: "plan-header" });
    header.createEl("h2", { text: "Lernplan Vorschau" });
    const nav = header.createDiv({ cls: "plan-nav" });
    const prevBtn = nav.createEl("button", { text: "\u25C0" });
    const monthDisplay = nav.createEl("span", { text: this.currentMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" }) });
    const nextBtn = nav.createEl("button", { text: "\u25B6" });
    const calendar = shell.createDiv({ cls: "plan-calendar" });
    this.renderCalendar(calendar);
    const actions = shell.createDiv({ cls: "plan-actions" });
    const generateBtn = actions.createEl("button", { cls: "mod-cta", text: "Plan generieren" });
    const closeBtn = actions.createEl("button", { text: "Schlie\xDFen" });
    try {
      const markdown = await this.plugin.buildPlanMarkdown();
      this.tasks = this.parseTasks(markdown);
      this.renderCalendar(calendar);
      generateBtn.addEventListener("click", async () => {
        await this.plugin.generatePlan();
        this.close();
      });
    } catch (error) {
      calendar.setText(`Fehler: ${String(error)}`);
    }
    prevBtn.addEventListener("click", () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
      monthDisplay.setText(this.currentMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" }));
      this.renderCalendar(calendar);
    });
    nextBtn.addEventListener("click", () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
      monthDisplay.setText(this.currentMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" }));
      this.renderCalendar(calendar);
    });
    closeBtn.addEventListener("click", () => this.close());
  }
  parseTasks(markdown) {
    const lines = markdown.split("\n");
    const tasks = [];
    let currentTask = null;
    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (currentTask && currentTask.date) {
          tasks.push(currentTask);
        }
        const dateMatch = line.match(/## (\d{4}-\d{2}-\d{2})/);
        currentTask = dateMatch ? { date: dateMatch[1], topics: [], hours: 0, focus: "" } : null;
      } else if (currentTask && line.startsWith("- ")) {
        const topicMatch = line.match(/- (.+)/);
        if (topicMatch) {
          currentTask.topics.push(topicMatch[1]);
        }
      }
    }
    if (currentTask && currentTask.date) {
      tasks.push(currentTask);
    }
    return tasks;
  }
  renderCalendar(container) {
    container.empty();
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    const header = container.createDiv({ cls: "calendar-header" });
    weekdays.forEach((day) => header.createEl("div", { text: day, cls: "calendar-day-header" }));
    const grid = container.createDiv({ cls: "calendar-grid" });
    let current = new Date(startDate);
    while (current <= lastDay || current.getDay() !== 0) {
      const dayEl = grid.createDiv({ cls: "calendar-day" });
      if (current.getMonth() === month) {
        dayEl.addClass("current-month");
        dayEl.setText(current.getDate().toString());
        const dateStr = current.toISOString().slice(0, 10);
        const task = this.tasks.find((t) => t.date === dateStr);
        if (task) {
          dayEl.addClass("has-task");
          dayEl.setAttribute("title", `${task.topics.length} Themen`);
        }
      } else {
        dayEl.addClass("other-month");
      }
      current.setDate(current.getDate() + 1);
    }
  }
};
