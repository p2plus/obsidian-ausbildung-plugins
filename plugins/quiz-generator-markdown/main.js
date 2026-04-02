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
  default: () => QuizGeneratorMarkdownPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// ../../packages/shared-core/src/ai.ts
function clamp(text, maxLength = 8e3) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}
...` : text;
}
function extractJsonObject(rawText) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return rawText.slice(start, end + 1);
}
function buildQuizAiRequest(note, markdown, questionCount, examLevel) {
  return {
    systemPrompt: "You create exam-style multiple choice questions from study notes. Return strict JSON only.",
    userPrompt: clamp(
      JSON.stringify({
        task: "Generate multiple-choice questions from the note content.",
        constraints: [
          "Return JSON with a top-level 'questions' array.",
          "Each question needs question, options, correctIndex, explanation, difficulty.",
          "Use exactly 4 options per question.",
          "Only one correct answer.",
          "Make distractors plausible, not random."
        ],
        note: {
          title: note.title,
          modulId: note.modul_id,
          examLevel,
          questionCount
        },
        markdown
      })
    ),
    temperature: 0.4,
    responseFormat: "json"
  };
}
function normalizeQuizDraftQuestions(payload) {
  const questions = payload?.questions;
  if (!Array.isArray(questions)) {
    return [];
  }
  return questions.flatMap((item) => {
    const record = item;
    if (typeof record.question !== "string" || !Array.isArray(record.options) || typeof record.correctIndex !== "number") {
      return [];
    }
    const options = record.options.filter((option) => typeof option === "string").slice(0, 4);
    if (options.length < 2 || record.correctIndex < 0 || record.correctIndex >= options.length) {
      return [];
    }
    return [{
      question: record.question,
      options,
      correctIndex: record.correctIndex,
      explanation: typeof record.explanation === "string" ? record.explanation : void 0,
      difficulty: typeof record.difficulty === "number" ? record.difficulty : void 0
    }];
  });
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

// ../../packages/shared-core/src/quiz.ts
function cleanInlineMarkdown(text) {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").trim();
}
function normalizeSentence(text) {
  return cleanInlineMarkdown(text).replace(/^[-*]\s+/, "").replace(/\s+/g, " ").trim();
}
function buildDefinitionSeeds(lines) {
  const seeds = [];
  for (const rawLine of lines) {
    const line = normalizeSentence(rawLine);
    if (line.startsWith("#") || line.length < 12) {
      continue;
    }
    const match = line.match(/^([^:]{3,80}):\s+(.{10,})$/);
    if (!match) {
      continue;
    }
    const [, term, description] = match;
    seeds.push({
      question: `Welche Beschreibung passt am besten zu "${term.trim()}"?`,
      answer: description.trim(),
      explanation: `Die Notiz beschreibt "${term.trim()}" direkt mit: ${description.trim()}`
    });
  }
  return seeds;
}
function buildHeadingBulletSeeds(lines) {
  const seeds = [];
  let currentHeading = "";
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (/^#{2,}\s+/.test(trimmed)) {
      currentHeading = normalizeSentence(trimmed.replace(/^#{2,}\s+/, ""));
      continue;
    }
    if (!currentHeading || !/^[-*]\s+/.test(trimmed)) {
      continue;
    }
    const bullet = normalizeSentence(trimmed);
    if (bullet.length < 6) {
      continue;
    }
    seeds.push({
      question: `Was nennt die Notiz unter "${currentHeading}"?`,
      answer: bullet,
      explanation: `Unter "${currentHeading}" steht in der Notiz: ${bullet}`
    });
  }
  return seeds;
}
function buildStatementSeeds(lines) {
  const seeds = [];
  for (const rawLine of lines) {
    const line = normalizeSentence(rawLine);
    if (!line || line.startsWith("#") || line.startsWith("---") || line.length < 35 || line.length > 180) {
      continue;
    }
    seeds.push({
      question: "Welche Aussage steht so in der Notiz?",
      answer: line,
      explanation: `Diese Kernaussage steht in der Notiz: ${line}`
    });
  }
  return seeds;
}
function uniqueSeeds(seeds, maxCount = 5) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const seed of seeds) {
    const key = `${seed.question}::${seed.answer}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(seed);
    if (result.length >= maxCount) {
      break;
    }
  }
  return result;
}
function extractSeeds(markdown) {
  const lines = markdown.split(/\r?\n/);
  const seeds = [
    ...buildDefinitionSeeds(lines),
    ...buildHeadingBulletSeeds(lines),
    ...buildStatementSeeds(lines)
  ];
  return uniqueSeeds(seeds);
}
function distractorsFor(seed, answerPool) {
  const distractors = answerPool.filter((entry) => entry !== seed.answer).filter((entry) => entry.length > 0).slice(0, 2);
  const genericFallbacks = [
    "Das wird in der Notiz so nicht beschrieben.",
    "Die Notiz stuft das nur als Randaspekt ein.",
    "Dazu enthaelt die Notiz keine passende Aussage."
  ];
  for (const fallback of genericFallbacks) {
    if (distractors.length >= 3) {
      break;
    }
    if (fallback !== seed.answer && !distractors.includes(fallback)) {
      distractors.push(fallback);
    }
  }
  return distractors.slice(0, 3);
}
function renderQuestionBlock(seed, index, answerPool) {
  const options = [seed.answer, ...distractorsFor(seed, answerPool)];
  return [
    `## Frage ${index + 1}`,
    "",
    "TYPE: mc",
    "PUNKTE: 1",
    `FRAGE: ${seed.question}`,
    `- [x] ${options[0]}`,
    `- [ ] ${options[1] ?? "Keine passende Aussage."}`,
    `- [ ] ${options[2] ?? "Das wird anders beschrieben."}`,
    `- [ ] ${options[3] ?? "Diese Aussage passt nicht zum Thema."}`,
    "",
    `ERKLAERUNG: ${seed.explanation}`,
    ""
  ];
}
function generateQuizFromMarkdown(note, markdown) {
  const seeds = extractSeeds(markdown);
  const answerPool = seeds.map((seed) => seed.answer);
  const lines = [
    "---",
    'status: "Entwurf"',
    'lerntyp: "quiz"',
    `modul_id: "${note.modul_id ?? "UNSORTIERT"}"`,
    `pruefungsrelevanz: "${note.pruefungsrelevanz ?? "mittel"}"`,
    "---",
    "",
    `# Quiz zu ${note.title}`,
    ""
  ];
  if (seeds.length === 0) {
    lines.push("## Frage 1");
    lines.push("");
    lines.push("TYPE: mc");
    lines.push("PUNKTE: 1");
    lines.push(`FRAGE: Welche Kernaussage laesst sich aus "${note.title}" ableiten?`);
    lines.push("- [x] Die Notiz muss erst noch strukturierter ausgearbeitet werden, damit daraus gute Fragen entstehen.");
    lines.push("- [ ] Die Notiz ist bereits vollstaendig als Pruefung ausgewertet.");
    lines.push("- [ ] Die Notiz enthaelt gar kein relevantes Lernmaterial.");
    lines.push("- [ ] Die Notiz darf nicht fuer Quizfragen verwendet werden.");
    lines.push("");
    lines.push("ERKLAERUNG: Fuer gute lokale Fragen braucht die Notiz mindestens uebersichtliche Fakten, Listen, Definitionen oder klare Kernaussagen.");
    return lines.join("\n");
  }
  seeds.forEach((seed, index) => {
    lines.push(...renderQuestionBlock(seed, index, answerPool));
  });
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
function noticeError(message) {
  new import_obsidian.Notice(message, 7e3);
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
async function testAiProviderConnection(config) {
  const result = await runAiRequest(config, {
    systemPrompt: "You are a connectivity check. Return strict JSON only.",
    userPrompt: JSON.stringify({
      task: 'Return {"ok": true} and nothing else.'
    }),
    temperature: 0,
    responseFormat: "json"
  });
  if (result.parsed && typeof result.parsed === "object" && "ok" in result.parsed) {
    return `Connected to ${providerLabel(config.provider)} using ${config.model}.`;
  }
  return `Connected to ${providerLabel(config.provider)} using ${config.model}, but the response format was unusual.`;
}
var BaseSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("ausbildung-settings-tab");
    containerEl.createEl("h2", { text: this.plugin.manifest.name });
    const intro = containerEl.createDiv({ cls: "ausbildung-settings-intro" });
    intro.createDiv({ cls: "ausbildung-settings-intro__label", text: "Plugin Setup" });
    intro.createEl("p", {
      cls: "ausbildung-settings-intro__text",
      text: "These settings control where the plugin scans, where it writes output, and whether AI enrichment is active."
    });
    const scanSection = containerEl.createDiv({ cls: "ausbildung-settings-section" });
    scanSection.createEl("h3", { text: "Vault scope" });
    new import_obsidian.Setting(scanSection).setName("Root folders").setDesc("Comma-separated root folders to scan for notes. Leave empty to scan the whole vault.").addText(
      (text) => text.setValue(this.plugin.settings.rootFolders.join(", ")).onChange(async (value) => {
        this.plugin.settings.rootFolders = value.split(",").map((entry) => entry.trim()).filter(Boolean);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(scanSection).setName("Output folder").setDesc("Where generated markdown dashboards and plans should be written.").addText(
      (text) => text.setValue(this.plugin.settings.dashboardFolder).onChange(async (value) => {
        this.plugin.settings.dashboardFolder = value.trim() || "_plugin_outputs";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(scanSection).setName("Periodic notes folder").setDesc("Folder used for review queues and study journal integration.").addText(
      (text) => text.setValue(this.plugin.settings.periodicNotesFolder).onChange(async (value) => {
        this.plugin.settings.periodicNotesFolder = value.trim() || "Periodic/Daily";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(scanSection).setName("Prefer Dataview").setDesc("Use Dataview when available, but keep a safe fallback.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.useDataview).onChange(async (value) => {
        this.plugin.settings.useDataview = value;
        await this.plugin.saveSettings();
      })
    );
    const aiSection = containerEl.createDiv({ cls: "ausbildung-settings-section" });
    aiSection.createEl("h3", { text: "AI / BYOK" });
    aiSection.createDiv({
      cls: `ausbildung-settings-status ausbildung-settings-status--${this.plugin.settings.aiConnectionStatus}`,
      text: this.plugin.settings.aiConnectionStatus === "ok" ? "Connection verified" : this.plugin.settings.aiConnectionStatus === "error" ? "Connection failed" : "Connection not tested"
    });
    new import_obsidian.Setting(aiSection).setName("Enable AI features").setDesc("Use BYOK-backed AI features where the plugin supports them.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.aiEnabled).onChange(async (value) => {
        this.plugin.settings.aiEnabled = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    new import_obsidian.Setting(aiSection).setName("AI provider").setDesc("Choose the provider for AI-backed features.").addDropdown(
      (dropdown) => dropdown.addOption("openai", "OpenAI").addOption("openrouter", "OpenRouter").addOption("anthropic", "Anthropic").addOption("google", "Google").addOption("zai", "Z.AI").addOption("minimax", "MiniMax").addOption("moonshot", "Moonshot").addOption("custom", "Custom OpenAI-compatible").setValue(this.plugin.settings.aiProvider).onChange(async (value) => {
        this.plugin.settings.aiProvider = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    new import_obsidian.Setting(aiSection).setName("Request timeout").setDesc("Timeout in milliseconds for provider requests.").addText(
      (text) => text.setValue(String(this.plugin.settings.requestTimeoutMs)).onChange(async (value) => {
        this.plugin.settings.requestTimeoutMs = Number(value) || 45e3;
        await this.plugin.saveSettings();
      })
    );
    if (this.plugin.settings.aiProvider === "openai") {
      new import_obsidian.Setting(aiSection).setName("OpenAI API key").setDesc("Stored in Obsidian plugin settings.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("sk-...").setValue(this.plugin.settings.openAiApiKey).onChange(async (value) => {
          this.plugin.settings.openAiApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("OpenAI model").addText(
        (text) => text.setValue(this.plugin.settings.openAiModel).onChange(async (value) => {
          this.plugin.settings.openAiModel = value.trim() || "gpt-4.1-mini";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "openrouter") {
      new import_obsidian.Setting(aiSection).setName("OpenRouter API key").setDesc("Stored in Obsidian plugin settings.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("sk-or-...").setValue(this.plugin.settings.openRouterApiKey).onChange(async (value) => {
          this.plugin.settings.openRouterApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("OpenRouter model").addText(
        (text) => text.setValue(this.plugin.settings.openRouterModel).onChange(async (value) => {
          this.plugin.settings.openRouterModel = value.trim() || "openai/gpt-4.1-mini";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "anthropic") {
      new import_obsidian.Setting(aiSection).setName("Anthropic API key").setDesc("Uses Anthropic's OpenAI-compatible layer.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("sk-ant-...").setValue(this.plugin.settings.anthropicApiKey).onChange(async (value) => {
          this.plugin.settings.anthropicApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("Anthropic model").addText(
        (text) => text.setValue(this.plugin.settings.anthropicModel).onChange(async (value) => {
          this.plugin.settings.anthropicModel = value.trim() || "claude-sonnet-4-6";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "google") {
      new import_obsidian.Setting(aiSection).setName("Google API key").setDesc("Uses the Gemini OpenAI-compatible endpoint.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("AIza...").setValue(this.plugin.settings.googleApiKey).onChange(async (value) => {
          this.plugin.settings.googleApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("Google model").addText(
        (text) => text.setValue(this.plugin.settings.googleModel).onChange(async (value) => {
          this.plugin.settings.googleModel = value.trim() || "gemini-2.5-flash";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "zai") {
      new import_obsidian.Setting(aiSection).setName("Z.AI API key").setDesc("Uses Z.AI's OpenAI-compatible chat endpoint.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("API key").setValue(this.plugin.settings.zaiApiKey).onChange(async (value) => {
          this.plugin.settings.zaiApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("Z.AI model").addText(
        (text) => text.setValue(this.plugin.settings.zaiModel).onChange(async (value) => {
          this.plugin.settings.zaiModel = value.trim() || "glm-4.5-air";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "minimax") {
      new import_obsidian.Setting(aiSection).setName("MiniMax API key").setDesc("Uses MiniMax's OpenAI-compatible chat endpoint.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("API key").setValue(this.plugin.settings.minimaxApiKey).onChange(async (value) => {
          this.plugin.settings.minimaxApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("MiniMax model").addText(
        (text) => text.setValue(this.plugin.settings.minimaxModel).onChange(async (value) => {
          this.plugin.settings.minimaxModel = value.trim() || "MiniMax-M1";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "moonshot") {
      new import_obsidian.Setting(aiSection).setName("Moonshot API key").setDesc("Uses Moonshot's OpenAI-compatible Kimi endpoint.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("sk-...").setValue(this.plugin.settings.moonshotApiKey).onChange(async (value) => {
          this.plugin.settings.moonshotApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("Moonshot model").addText(
        (text) => text.setValue(this.plugin.settings.moonshotModel).onChange(async (value) => {
          this.plugin.settings.moonshotModel = value.trim() || "kimi-k2.5";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "custom") {
      new import_obsidian.Setting(aiSection).setName("Custom endpoint").setDesc("OpenAI-compatible chat completions endpoint.").addText(
        (text) => text.setValue(this.plugin.settings.customEndpoint).onChange(async (value) => {
          this.plugin.settings.customEndpoint = value.trim();
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian.Setting(aiSection).setName("Custom API key").setDesc("Stored in Obsidian plugin settings.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("API key").setValue(this.plugin.settings.customApiKey).onChange(async (value) => {
          this.plugin.settings.customApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("Custom model").addText(
        (text) => text.setValue(this.plugin.settings.customModel).onChange(async (value) => {
          this.plugin.settings.customModel = value.trim() || "gpt-4.1-mini";
          await this.plugin.saveSettings();
        })
      );
    }
    new import_obsidian.Setting(aiSection).setName("Test AI connection").setDesc("Checks the currently selected provider, model, and key.").addButton(
      (button) => button.setButtonText("Run test").onClick(async () => {
        const config = getAiProviderConfig(this.plugin.settings);
        if (!config) {
          noticeError("AI is disabled or the selected provider is missing required credentials.");
          return;
        }
        button.setDisabled(true);
        button.setButtonText("Testing...");
        try {
          const message = await testAiProviderConnection(config);
          this.plugin.settings.aiConnectionStatus = "ok";
          this.plugin.settings.aiConnectionMessage = message;
          this.plugin.settings.aiConnectionTestedAt = (/* @__PURE__ */ new Date()).toISOString();
          await this.plugin.saveSettings();
          noticeSuccess(message);
          this.display();
        } catch (error) {
          this.plugin.settings.aiConnectionStatus = "error";
          this.plugin.settings.aiConnectionMessage = String(error);
          this.plugin.settings.aiConnectionTestedAt = (/* @__PURE__ */ new Date()).toISOString();
          await this.plugin.saveSettings();
          noticeError(`AI connection test failed: ${String(error)}`);
          this.display();
        } finally {
          button.setDisabled(false);
          button.setButtonText("Run test");
        }
      })
    );
    const status = this.plugin.settings.aiConnectionStatus;
    const statusText = status === "ok" ? `Last test passed. ${this.plugin.settings.aiConnectionMessage}` : status === "error" ? `Last test failed. ${this.plugin.settings.aiConnectionMessage}` : this.plugin.settings.aiConnectionMessage;
    aiSection.createEl("p", {
      cls: "ausbildung-settings-status-text",
      text: this.plugin.settings.aiConnectionTestedAt ? `${statusText} (${this.plugin.settings.aiConnectionTestedAt})` : statusText
    });
  }
};

// src/main.ts
var DEFAULT_SETTINGS = {
  ...DEFAULT_BASE_SETTINGS,
  outputFolder: "quizzes",
  questionCount: 5,
  examLevel: "AP1",
  generationMode: "ai-enhanced"
};
var QuizGeneratorMarkdownPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("list-checks", "Quiz Vorschau oeffnen", () => void this.openPreview());
    this.addCommand({
      id: "generate-quiz-from-current-note",
      name: "Quiz: Aus aktueller Notiz erzeugen",
      callback: () => void this.generateFromCurrent()
    });
    this.addCommand({
      id: "preview-quiz-generation",
      name: "Quiz: Vorschau oeffnen",
      callback: () => void this.openPreview()
    });
    this.addSettingTab(new QuizSettingsTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async generateFromCurrent() {
    const result = await this.buildQuizFromCurrent();
    const path = await writePluginOutput(this.app, this.settings.outputFolder, result.fileName, result.markdown);
    noticeSuccess(`Quiz erzeugt: ${path}`);
    await openOutputFile(this.app, path, true);
  }
  async buildQuizFromCurrent() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian2.Notice("Keine aktive Notiz gefunden.");
      throw new Error("Keine aktive Notiz gefunden.");
    }
    const markdown = await this.app.vault.cachedRead(file);
    const note = parseLearningNote(file.path, markdown);
    let quizMarkdown = generateQuizFromMarkdown(note, markdown);
    const provider = getAiProviderConfig(this.settings);
    if (this.settings.generationMode === "ai-enhanced" && provider) {
      try {
        const response = await runAiRequest(
          provider,
          buildQuizAiRequest(note, markdown, this.settings.questionCount, this.settings.examLevel)
        );
        const questions = normalizeQuizDraftQuestions(response.parsed);
        if (questions.length > 0) {
          quizMarkdown = this.renderAiQuiz(note.title, note.modul_id ?? "UNSORTIERT", questions, provider.provider, provider.model, file.path);
        }
      } catch (error) {
        new import_obsidian2.Notice(`AI-Quizerzeugung fehlgeschlagen, nutze Regelmodus: ${String(error)}`);
      }
    }
    return { markdown: quizMarkdown, fileName: `${file.basename}-quiz.md` };
  }
  renderAiQuiz(title, modulId, questions, provider, model, sourcePath) {
    const lines = [
      "---",
      'status: "Entwurf"',
      'lerntyp: "quiz"',
      `modul_id: "${modulId}"`,
      'pruefungsrelevanz: "hoch"',
      `source_note: "${sourcePath}"`,
      `quiz_origin: "ai-enhanced"`,
      `last_ai_generated: "${(/* @__PURE__ */ new Date()).toISOString()}"`,
      `ai_provider: "${provider}"`,
      `ai_model: "${model}"`,
      "---",
      "",
      `# Quiz zu ${title}`,
      ""
    ];
    questions.forEach((question, index) => {
      lines.push(`## Frage ${index + 1}`);
      lines.push("");
      lines.push("TYPE: mc");
      lines.push(`PUNKTE: ${question.difficulty && question.difficulty >= 4 ? 2 : 1}`);
      lines.push(`FRAGE: ${question.question}`);
      question.options.forEach((option, optionIndex) => {
        lines.push(`- [${optionIndex === question.correctIndex ? "x" : " "}] ${option}`);
      });
      if (question.explanation) {
        lines.push("");
        lines.push(`ERKLAERUNG: ${question.explanation}`);
      }
      lines.push("");
    });
    return lines.join("\n");
  }
  openPreview() {
    new QuizPreviewModal(this.app, this).open();
  }
};
var QuizSettingsTab = class extends BaseSettingsTab {
  display() {
    super.display();
    const { containerEl } = this;
    containerEl.createEl("h3", { text: "Quiz Generation" });
    new import_obsidian2.Setting(containerEl).setName("Output folder").addText(
      (text) => text.setValue(this.plugin.settings.outputFolder).onChange(async (value) => {
        this.plugin.settings.outputFolder = value.trim() || "quizzes";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Question count").addText(
      (text) => text.setValue(String(this.plugin.settings.questionCount)).onChange(async (value) => {
        this.plugin.settings.questionCount = Number(value) || 5;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Exam level").addText(
      (text) => text.setValue(this.plugin.settings.examLevel).onChange(async (value) => {
        this.plugin.settings.examLevel = value.trim() || "AP1";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Generation mode").setDesc("Use AI when enabled and configured, otherwise stay rule-based.").addDropdown(
      (dropdown) => dropdown.addOption("rule-based", "Rule-based").addOption("ai-enhanced", "AI-enhanced").setValue(this.plugin.settings.generationMode).onChange(async (value) => {
        this.plugin.settings.generationMode = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
var QuizPreviewModal = class extends import_obsidian2.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const shell = contentEl.createDiv({ cls: "ausbildung-modal quiz-modal" });
    const hero = shell.createDiv({ cls: "ausbildung-modal__hero" });
    hero.createDiv({ cls: "ausbildung-modal__eyebrow", text: "Quiz generation" });
    hero.createEl("h2", { cls: "ausbildung-modal__title", text: "Quiz Preview & Editor" });
    hero.createEl("p", {
      cls: "ausbildung-modal__subtitle",
      text: "Voransicht des Quiz-Sets. Bearbeite Fragen vor dem Speichern."
    });
    const stats = shell.createDiv({ cls: "ausbildung-modal__stats" });
    const questionStat = createStatCard(stats, "Questions", "...");
    createStatCard(stats, "Mode", this.plugin.settings.generationMode === "ai-enhanced" ? "AI-enhanced" : "Rule-based");
    createStatCard(stats, "Exam level", this.plugin.settings.examLevel);
    const tabs = shell.createDiv({ cls: "ausbildung-modal__tabs" });
    const previewTab = tabs.createEl("button", { cls: "ausbildung-tab active", text: "Preview" });
    const editTab = tabs.createEl("button", { cls: "ausbildung-tab", text: "Edit" });
    const exportTab = tabs.createEl("button", { cls: "ausbildung-tab", text: "Export" });
    const body = shell.createDiv({ cls: "ausbildung-modal__body" });
    const summary = body.createDiv({ cls: "ausbildung-modal__summary" });
    const previewContainer = body.createDiv({ cls: "ausbildung-modal__rendered" });
    const editContainer = body.createDiv({ cls: "ausbildung-modal__editor ausbildung-hidden" });
    const exportContainer = body.createDiv({ cls: "ausbildung-modal__export ausbildung-hidden" });
    previewContainer.setText("Loading...");
    const actions = shell.createDiv({ cls: "ausbildung-modal__actions" });
    const saveButton = actions.createEl("button", { cls: "mod-cta", text: "Save quiz" });
    saveButton.disabled = true;
    const closeButton = actions.createEl("button", { text: "Close" });
    closeButton.addEventListener("click", () => this.close());
    try {
      const result = await this.plugin.buildQuizFromCurrent();
      const questionCount = (result.markdown.match(/^## Frage /gm) ?? []).length;
      questionStat.setText(String(questionCount));
      summary.empty();
      summary.createDiv({ cls: "ausbildung-modal__summary-item", text: `Output: ${this.plugin.settings.outputFolder}/${result.fileName}` });
      summary.createDiv({ cls: "ausbildung-modal__summary-item", text: `Target level: ${this.plugin.settings.examLevel}` });
      this.renderPreview(previewContainer, result.markdown);
      this.renderEdit(editContainer, result.markdown);
      this.renderExport(exportContainer, () => this.getEditedMarkdown(editContainer, result.markdown), result.fileName);
      saveButton.setText(`Save as ${result.fileName}`);
      saveButton.disabled = false;
      saveButton.addEventListener("click", async () => {
        const finalMarkdown = this.getEditedMarkdown(editContainer, result.markdown);
        const path = await writePluginOutput(this.app, this.plugin.settings.outputFolder, result.fileName, finalMarkdown);
        noticeSuccess(`Quiz erzeugt: ${path}`);
        await openOutputFile(this.app, path, true);
        this.close();
      });
      previewTab.addEventListener("click", () => this.switchTab(
        previewTab,
        [editTab, exportTab],
        previewContainer,
        [editContainer, exportContainer]
      ));
      editTab.addEventListener("click", () => this.switchTab(
        editTab,
        [previewTab, exportTab],
        editContainer,
        [previewContainer, exportContainer]
      ));
      exportTab.addEventListener("click", () => this.switchTab(
        exportTab,
        [previewTab, editTab],
        exportContainer,
        [previewContainer, editContainer]
      ));
    } catch (error) {
      previewContainer.empty();
      previewContainer.createDiv({ cls: "ausbildung-modal__error", text: String(error) });
    }
  }
  async renderPreview(container, markdown) {
    container.empty();
    await import_obsidian2.MarkdownRenderer.render(this.app, markdown, container, "", this.plugin);
  }
  renderEdit(container, markdown) {
    container.empty();
    const textarea = container.createEl("textarea", { cls: "ausbildung-editor", text: markdown });
    textarea.style.width = "100%";
    textarea.style.height = "400px";
    textarea.style.resize = "vertical";
  }
  renderExport(container, getMarkdown, fileName) {
    container.empty();
    const formats = ["Markdown", "JSON", "CSV"];
    formats.forEach((format) => {
      const button = container.createEl("button", { cls: "mod-cta", text: `Export as ${format}` });
      button.addEventListener("click", () => this.exportQuiz(getMarkdown(), fileName, format.toLowerCase()));
    });
  }
  switchTab(activeTab, inactiveTabs, activeContainer, inactiveContainers) {
    activeTab.addClass("active");
    inactiveTabs.forEach((tab) => tab.removeClass("active"));
    activeContainer.removeClass("ausbildung-hidden");
    inactiveContainers.forEach((container) => container.addClass("ausbildung-hidden"));
  }
  getEditedMarkdown(editContainer, original) {
    const textarea = editContainer.querySelector("textarea");
    return textarea ? textarea.value : original;
  }
  async exportQuiz(markdown, fileName, format) {
    let content = markdown;
    let ext = "md";
    if (format === "json") {
      const questions = this.parseQuestions(markdown);
      content = JSON.stringify({ fileName, questions }, null, 2);
      ext = "json";
    } else if (format === "csv") {
      const questions = this.parseQuestions(markdown);
      content = "Question,Options,Correct,Explanation\n" + questions.map((q) => `"${q.question}","${q.options.join(";")}","${q.correct}","${q.explanation}"`).join("\n");
      ext = "csv";
    }
    const exportFileName = `${fileName.replace(".md", "")}.${ext}`;
    const path = await writePluginOutput(this.app, this.plugin.settings.outputFolder, exportFileName, content);
    noticeSuccess(`Exported to ${path}`);
  }
  parseQuestions(markdown) {
    const lines = markdown.split("\n");
    const questions = [];
    let currentQuestion = null;
    for (const line of lines) {
      if (line.startsWith("## Frage")) {
        if (currentQuestion) questions.push(currentQuestion);
        currentQuestion = { question: "", options: [], correct: "", explanation: "" };
      } else if (line.startsWith("FRAGE:")) {
        if (!currentQuestion) {
          continue;
        }
        currentQuestion.question = line.replace("FRAGE:", "").trim();
      } else if (line.startsWith("- [")) {
        if (!currentQuestion) {
          continue;
        }
        currentQuestion.options.push(line.replace(/^- \[.\] /, "").trim());
        if (line.includes("[x]")) currentQuestion.correct = line.replace(/^- \[.\] /, "").trim();
      } else if (line.startsWith("ERKLAERUNG:")) {
        if (!currentQuestion) {
          continue;
        }
        currentQuestion.explanation = line.replace("ERKLAERUNG:", "").trim();
      }
    }
    if (currentQuestion) questions.push(currentQuestion);
    return questions;
  }
};
function createStatCard(container, label, value) {
  const card = container.createDiv({ cls: "ausbildung-modal__stat" });
  card.createDiv({ cls: "ausbildung-modal__stat-label", text: label });
  return card.createDiv({ cls: "ausbildung-modal__stat-value", text: value });
}
