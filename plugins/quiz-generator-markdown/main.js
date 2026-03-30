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
function extractCandidates(markdown) {
  const structured = markdown.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("- ") || line.startsWith("## ") || /\*\*.+\*\*/.test(line)).slice(0, 5);
  if (structured.length > 0) {
    return structured;
  }
  return markdown.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 20 && !line.startsWith("#") && !line.startsWith("---")).slice(0, 5);
}
function generateQuizFromMarkdown(note, markdown) {
  const candidates = extractCandidates(markdown);
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
  candidates.forEach((candidate, index) => {
    lines.push(`## Frage ${index + 1}`);
    lines.push("");
    lines.push("TYPE: mc");
    lines.push("PUNKTE: 1");
    lines.push(`FRAGE: Welche Aussage passt am besten zu "${candidate.replace(/^(- |## )/, "")}"?`);
    lines.push("- [x] Diese Antwort muss fachlich aus der Notiz abgeleitet werden.");
    lines.push("- [ ] Diese Antwort ist absichtlich unpraezise.");
    lines.push("- [ ] Diese Antwort widerspricht der Notiz.");
    lines.push("");
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
    new import_obsidian.Setting(containerEl).setName("Root folders").setDesc("Comma-separated root folders to scan for notes. Leave empty to scan the whole vault.").addText(
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
    containerEl.createEl("h3", { text: "AI / BYOK" });
    new import_obsidian.Setting(containerEl).setName("Enable AI features").setDesc("Use BYOK-backed AI features where the plugin supports them.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.aiEnabled).onChange(async (value) => {
        this.plugin.settings.aiEnabled = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    new import_obsidian.Setting(containerEl).setName("AI provider").setDesc("Choose the provider for AI-backed features.").addDropdown(
      (dropdown) => dropdown.addOption("openai", "OpenAI").addOption("openrouter", "OpenRouter").addOption("custom", "Custom OpenAI-compatible").setValue(this.plugin.settings.aiProvider).onChange(async (value) => {
        this.plugin.settings.aiProvider = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Request timeout").setDesc("Timeout in milliseconds for provider requests.").addText(
      (text) => text.setValue(String(this.plugin.settings.requestTimeoutMs)).onChange(async (value) => {
        this.plugin.settings.requestTimeoutMs = Number(value) || 45e3;
        await this.plugin.saveSettings();
      })
    );
    if (this.plugin.settings.aiProvider === "openai") {
      new import_obsidian.Setting(containerEl).setName("OpenAI API key").setDesc("Stored in Obsidian plugin settings.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("sk-...").setValue(this.plugin.settings.openAiApiKey).onChange(async (value) => {
          this.plugin.settings.openAiApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(containerEl).setName("OpenAI model").addText(
        (text) => text.setValue(this.plugin.settings.openAiModel).onChange(async (value) => {
          this.plugin.settings.openAiModel = value.trim() || "gpt-4.1-mini";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "openrouter") {
      new import_obsidian.Setting(containerEl).setName("OpenRouter API key").setDesc("Stored in Obsidian plugin settings.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("sk-or-...").setValue(this.plugin.settings.openRouterApiKey).onChange(async (value) => {
          this.plugin.settings.openRouterApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(containerEl).setName("OpenRouter model").addText(
        (text) => text.setValue(this.plugin.settings.openRouterModel).onChange(async (value) => {
          this.plugin.settings.openRouterModel = value.trim() || "openai/gpt-4.1-mini";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "custom") {
      new import_obsidian.Setting(containerEl).setName("Custom endpoint").setDesc("OpenAI-compatible chat completions endpoint.").addText(
        (text) => text.setValue(this.plugin.settings.customEndpoint).onChange(async (value) => {
          this.plugin.settings.customEndpoint = value.trim();
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian.Setting(containerEl).setName("Custom API key").setDesc("Stored in Obsidian plugin settings.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("API key").setValue(this.plugin.settings.customApiKey).onChange(async (value) => {
          this.plugin.settings.customApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(containerEl).setName("Custom model").addText(
        (text) => text.setValue(this.plugin.settings.customModel).onChange(async (value) => {
          this.plugin.settings.customModel = value.trim() || "gpt-4.1-mini";
          await this.plugin.saveSettings();
        })
      );
    }
    new import_obsidian.Setting(containerEl).setName("Test AI connection").setDesc("Checks the currently selected provider, model, and key.").addButton(
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
    containerEl.createEl("p", {
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
    hero.createEl("h2", { cls: "ausbildung-modal__title", text: "Quiz Preview" });
    hero.createEl("p", {
      cls: "ausbildung-modal__subtitle",
      text: "Voransicht des Quiz-Sets fuer die aktuell geoeffnete Notiz."
    });
    const stats = shell.createDiv({ cls: "ausbildung-modal__stats" });
    const questionStat = createStatCard(stats, "Questions", "...");
    createStatCard(stats, "Mode", this.plugin.settings.generationMode === "ai-enhanced" ? "AI-enhanced" : "Rule-based");
    createStatCard(stats, "Exam level", this.plugin.settings.examLevel);
    const body = shell.createDiv({ cls: "ausbildung-modal__body" });
    const preview = body.createDiv({ cls: "ausbildung-modal__rendered" });
    preview.setText("Loading...");
    const actions = shell.createDiv({ cls: "ausbildung-modal__actions" });
    const saveButton = actions.createEl("button", { cls: "mod-cta", text: "Save quiz" });
    saveButton.disabled = true;
    const closeButton = actions.createEl("button", { text: "Close" });
    closeButton.addEventListener("click", () => this.close());
    try {
      const result = await this.plugin.buildQuizFromCurrent();
      questionStat.setText(String((result.markdown.match(/^## Frage /gm) ?? []).length));
      preview.empty();
      await import_obsidian2.MarkdownRenderer.render(this.app, result.markdown, preview, "", this.plugin);
      saveButton.setText(`Save as ${result.fileName}`);
      saveButton.disabled = false;
      saveButton.addEventListener("click", async () => {
        await this.plugin.generateFromCurrent();
        this.close();
      });
    } catch (error) {
      preview.empty();
      preview.createDiv({ cls: "ausbildung-modal__error", text: String(error) });
    }
  }
};
function createStatCard(container, label, value) {
  const card = container.createDiv({ cls: "ausbildung-modal__stat" });
  card.createDiv({ cls: "ausbildung-modal__stat-label", text: label });
  return card.createDiv({ cls: "ausbildung-modal__stat-value", text: value });
}
