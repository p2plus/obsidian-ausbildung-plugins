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
  default: () => SpacedRepetitionEnginePlugin
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
function buildReviewPriorityAiRequest(entries) {
  return {
    systemPrompt: "You prioritize study reviews. Return strict JSON only.",
    userPrompt: clamp(
      JSON.stringify({
        task: "Prioritize review notes and explain why they should be reviewed now.",
        constraints: [
          "Return JSON with a top-level 'items' array.",
          "Each item needs notePath, title, priority, reason, recapPrompt."
        ],
        notes: entries.slice(0, 25).map((entry) => ({
          path: entry.note.path,
          title: entry.note.title,
          modulId: entry.note.modul_id,
          relevance: entry.note.pruefungsrelevanz,
          scoreLast: entry.note.score_last,
          nextReview: entry.note.next_review,
          content: entry.markdown.slice(0, 1500)
        }))
      })
    ),
    temperature: 0.2,
    responseFormat: "json"
  };
}
function normalizeReviewPriority(payload) {
  const items = payload?.items;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.flatMap((item) => {
    const record = item;
    if (typeof record.notePath !== "string" || typeof record.title !== "string" || typeof record.priority !== "number" || typeof record.reason !== "string" || typeof record.recapPrompt !== "string") {
      return [];
    }
    return [{
      notePath: record.notePath,
      title: record.title,
      priority: record.priority,
      reason: record.reason,
      recapPrompt: record.recapPrompt
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

// ../../packages/shared-core/src/repetition.ts
var RATING_INTERVALS = {
  vergessen: 1,
  schwer: 2,
  mittel: 4,
  leicht: 7
};
function calculateNextReview(currentDate, rating, previousIntervalDays = 0) {
  const baseInterval = RATING_INTERVALS[rating];
  const intervalDays = rating === "leicht" ? Math.max(baseInterval, Math.round(previousIntervalDays * 1.8) || baseInterval) : Math.max(baseInterval, Math.round(previousIntervalDays * 1.2) || baseInterval);
  const date = /* @__PURE__ */ new Date(`${currentDate}T12:00:00`);
  date.setDate(date.getDate() + intervalDays);
  return {
    nextReview: date.toISOString().slice(0, 10),
    intervalDays
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
async function updateLearningStatus(app, file, status) {
  const markdown = await app.vault.cachedRead(file);
  const updated = updateYamlField(markdown, "lernstatus", status);
  await app.vault.modify(file, updated);
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
  dailyQueueLimit: 8
};
var SpacedRepetitionEnginePlugin = class extends import_obsidian2.Plugin {
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("rotate-cw", "Review Queue Vorschau oeffnen", () => void this.openQueuePreview());
    this.addCommand({
      id: "generate-review-queue",
      name: "Reviews: Faellige Wiederholungen generieren",
      callback: () => void this.generateQueue()
    });
    this.addCommand({
      id: "preview-review-queue",
      name: "Reviews: Queue Vorschau oeffnen",
      callback: () => void this.openQueuePreview()
    });
    this.addCommand({
      id: "set-next-review-vergessen",
      name: "Reviews: Aktuelle Notiz als vergessen bewerten",
      callback: () => void this.scheduleCurrent("vergessen")
    });
    this.addCommand({
      id: "set-next-review-schwer",
      name: "Reviews: Aktuelle Notiz als schwer bewerten",
      callback: () => void this.scheduleCurrent("schwer")
    });
    this.addCommand({
      id: "set-next-review-mittel",
      name: "Reviews: Aktuelle Notiz als mittel bewerten",
      callback: () => void this.scheduleCurrent("mittel")
    });
    this.addCommand({
      id: "set-next-review-leicht",
      name: "Reviews: Aktuelle Notiz als leicht bewerten",
      callback: () => void this.scheduleCurrent("leicht")
    });
    this.addSettingTab(new SRSettingsTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async generateQueue() {
    const { markdown, fileName } = await this.buildQueueMarkdown();
    const path = await writePluginOutput(this.app, this.settings.periodicNotesFolder, fileName, markdown);
    noticeSuccess(`Review Queue geschrieben: ${path}`);
    await openOutputFile(this.app, path, true);
  }
  async buildQueueMarkdown() {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const due = scanned.filter((entry) => entry.note.next_review && entry.note.next_review <= today).sort((left, right) => {
      const leftScore = (left.note.pruefungsrelevanz === "ihk-kritisch" ? 100 : 0) + (100 - (left.note.score_last ?? 70));
      const rightScore = (right.note.pruefungsrelevanz === "ihk-kritisch" ? 100 : 0) + (100 - (right.note.score_last ?? 70));
      return rightScore - leftScore;
    }).slice(0, this.settings.dailyQueueLimit);
    const provider = getAiProviderConfig(this.settings);
    let enriched = due.map((entry, index) => ({
      notePath: entry.note.path,
      title: entry.note.title,
      priority: due.length - index,
      reason: `Faellig seit ${entry.note.next_review ?? today}`,
      recapPrompt: `Fasse [[${entry.file.basename}]] in drei Stichpunkten zusammen.`
    }));
    if (provider && due.length > 0) {
      try {
        const response = await runAiRequest(provider, buildReviewPriorityAiRequest(due));
        const parsed = normalizeReviewPriority(response.parsed);
        if (parsed.length > 0) {
          enriched = parsed;
        }
      } catch (error) {
        new import_obsidian2.Notice(`AI-Priorisierung fehlgeschlagen, nutze lokale Sortierung: ${String(error)}`);
      }
    }
    const markdown = [
      "# Review Queue",
      "",
      ...enriched.map((entry) => `- [ ] [[${entry.title}]] | Prioritaet ${entry.priority} | ${entry.reason}
  - Prompt: ${entry.recapPrompt}`)
    ].join("\n");
    return { markdown, fileName: `${today}-review-queue.md` };
  }
  async scheduleCurrent(rating) {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian2.Notice("Keine aktive Notiz gefunden.");
      return;
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const result = calculateNextReview(today, rating, 4);
    const content = await this.app.vault.cachedRead(file);
    let updated = updateYamlField(content, "next_review", result.nextReview);
    updated = updateYamlField(updated, "last_review", today);
    await this.app.vault.modify(file, updated);
    await updateLearningStatus(this.app, file, rating === "leicht" ? "sicher" : rating === "vergessen" ? "gelesen" : "geuebt");
    new import_obsidian2.Notice(`Naechste Wiederholung: ${result.nextReview}`);
  }
  openQueuePreview() {
    new ReviewQueueModal(this.app, this).open();
  }
};
var SRSettingsTab = class extends BaseSettingsTab {
  display() {
    super.display();
    const { containerEl } = this;
    containerEl.createEl("h3", { text: "Review Queue" });
    new import_obsidian2.Setting(containerEl).setName("Daily queue limit").setDesc("Maximum number of due reviews to include in the daily queue.").addText(
      (text) => text.setValue(String(this.plugin.settings.dailyQueueLimit)).onChange(async (value) => {
        this.plugin.settings.dailyQueueLimit = Number(value) || 8;
        await this.plugin.saveSettings();
      })
    );
  }
};
var ReviewQueueModal = class extends import_obsidian2.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const shell = contentEl.createDiv({ cls: "ausbildung-modal sr-modal" });
    const hero = shell.createDiv({ cls: "ausbildung-modal__hero" });
    hero.createDiv({ cls: "ausbildung-modal__eyebrow", text: "Spaced repetition" });
    hero.createEl("h2", { cls: "ausbildung-modal__title", text: "Review Queue Preview" });
    hero.createEl("p", {
      cls: "ausbildung-modal__subtitle",
      text: "Faellige Wiederholungen, priorisiert fuer den heutigen Durchgang. Verwende Filter zur Anpassung."
    });
    const stats = shell.createDiv({ cls: "ausbildung-modal__stats" });
    const queueStat = createStatCard(stats, "Due today", "...");
    const aiStat = createStatCard(stats, "Mode", this.plugin.settings.aiEnabled ? "AI + local" : "Local only");
    const progressStat = createStatCard(stats, "Filtered", "...");
    const filters = shell.createDiv({ cls: "ausbildung-modal__filters" });
    const priorityFilter = filters.createEl("select", { cls: "ausbildung-filter" });
    priorityFilter.createEl("option", { value: "all", text: "Alle Priorit\xE4ten" });
    priorityFilter.createEl("option", { value: "high", text: "Hohe (1-3)" });
    priorityFilter.createEl("option", { value: "medium", text: "Mittel (4-6)" });
    priorityFilter.createEl("option", { value: "low", text: "Niedrig (7+)" });
    const body = shell.createDiv({ cls: "ausbildung-modal__body" });
    const summary = body.createDiv({ cls: "ausbildung-modal__summary" });
    const preview = body.createDiv({ cls: "ausbildung-modal__rendered" });
    preview.setText("Loading...");
    const actions = shell.createDiv({ cls: "ausbildung-modal__actions" });
    const saveButton = actions.createEl("button", { cls: "mod-cta", text: "Save queue" });
    saveButton.disabled = true;
    const closeButton = actions.createEl("button", { text: "Close" });
    closeButton.addEventListener("click", () => this.close());
    let allItems = [];
    let filteredItems = [];
    try {
      const { markdown, fileName } = await this.plugin.buildQueueMarkdown();
      allItems = this.parseQueueItems(markdown);
      filteredItems = [...allItems];
      const itemCount = allItems.length;
      queueStat.setText(String(itemCount));
      aiStat.setText(this.plugin.settings.aiEnabled ? "AI-ready" : "Fallback");
      progressStat.setText(String(filteredItems.length));
      summary.empty();
      summary.createDiv({ cls: "ausbildung-modal__summary-item", text: `Daily limit: ${this.plugin.settings.dailyQueueLimit}` });
      summary.createDiv({ cls: "ausbildung-modal__summary-item", text: `Target: ${fileName}` });
      await this.renderPreview(preview, filteredItems);
      saveButton.setText(`Save as ${fileName}`);
      saveButton.disabled = itemCount === 0;
      saveButton.addEventListener("click", async () => {
        await this.plugin.generateQueue();
        this.close();
      });
      priorityFilter.addEventListener("change", () => {
        filteredItems = this.applyPriorityFilter(allItems, priorityFilter.value);
        progressStat.setText(String(filteredItems.length));
        void this.renderPreview(preview, filteredItems);
      });
    } catch (error) {
      preview.empty();
      preview.createDiv({
        cls: "ausbildung-modal__error",
        text: `Queue konnte nicht erzeugt werden: ${String(error)}`
      });
    }
  }
  parseQueueItems(markdown) {
    const lines = markdown.split("\n");
    const items = [];
    for (const [index, line] of lines.entries()) {
      const match = line.match(/^- \[ \] \[\[([^\]]+)\]\] \| Prioritaet (\d+) \| (.+)$/);
      if (match) {
        const [, title, priority, reason] = match;
        const promptMatch = lines[index + 1]?.match(/  - Prompt: (.+)$/);
        const recapPrompt = promptMatch ? promptMatch[1] : "";
        items.push({ title, priority: parseInt(priority), reason, recapPrompt });
      }
    }
    return items;
  }
  applyPriorityFilter(items, filter) {
    if (filter === "all") return items;
    if (filter === "high") return items.filter((item) => item.priority <= 3);
    if (filter === "medium") return items.filter((item) => item.priority > 3 && item.priority <= 6);
    if (filter === "low") return items.filter((item) => item.priority > 6);
    return items;
  }
  async renderPreview(preview, items) {
    preview.empty();
    if (items.length === 0) {
      preview.createDiv({
        cls: "ausbildung-modal__empty",
        text: "Keine Reviews entsprechen den Filterkriterien."
      });
    } else {
      const markdown = "# Review Queue\n\n" + items.map(
        (entry) => `- [ ] [[${entry.title}]] | Prioritaet ${entry.priority} | ${entry.reason}
  - Prompt: ${entry.recapPrompt}`
      ).join("\n");
      await import_obsidian2.MarkdownRenderer.render(this.app, markdown, preview, "", this.plugin);
    }
  }
};
function createStatCard(container, label, value) {
  const card = container.createDiv({ cls: "ausbildung-modal__stat" });
  card.createDiv({ cls: "ausbildung-modal__stat-label", text: label });
  return card.createDiv({ cls: "ausbildung-modal__stat-value", text: value });
}
