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
  default: () => PruefungsSimulatorPlugin
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

// ../../packages/shared-core/src/exam.ts
function parseQuestionBlock(block, index) {
  const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const promptLine = lines.find((line) => line.startsWith("FRAGE:"));
  const pointsLine = lines.find((line) => line.startsWith("PUNKTE:"));
  if (!promptLine || !pointsLine) {
    return null;
  }
  const options = lines.filter((line) => line.startsWith("- ["));
  const correctIndexes = options.reduce((accumulator, line, optionIndex) => {
    if (line.startsWith("- [x]")) {
      accumulator.push(optionIndex);
    }
    return accumulator;
  }, []);
  return {
    id: `frage-${index + 1}`,
    prompt: promptLine.replace("FRAGE:", "").trim(),
    options: options.map((line) => line.replace(/^- \[[x ]\]\s*/, "")),
    correctIndexes,
    points: Number(pointsLine.replace("PUNKTE:", "").trim()),
    type: "mc"
  };
}
function parseExamMarkdown(markdown) {
  const fm = parseFrontmatter(markdown);
  const sections = markdown.split(/^## /m).slice(1);
  return {
    title: markdown.split(/\r?\n/).find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") ?? "Pruefung",
    pruefung: typeof fm.pruefung === "string" ? fm.pruefung : "Gesamtpruefung",
    zeitlimitMin: typeof fm.zeitlimit_min === "number" ? fm.zeitlimit_min : 60,
    punkteMax: typeof fm.punkte_max === "number" ? fm.punkte_max : void 0,
    modulId: typeof fm.modul_id === "string" ? fm.modul_id : void 0,
    questions: sections.map((section, index) => parseQuestionBlock(section, index)).filter((item) => Boolean(item))
  };
}
function gradeAttempt(exam, answers) {
  let score = 0;
  const weakTopics = /* @__PURE__ */ new Set();
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.selectedIndexes.join(",")]));
  for (const question of exam.questions) {
    const actual = answerMap.get(question.id) ?? "";
    const expected = question.correctIndexes.join(",");
    if (actual === expected) {
      score += question.points;
    } else if (exam.modulId) {
      weakTopics.add(exam.modulId);
    }
  }
  const maxScore = exam.questions.reduce((sum, question) => sum + question.points, 0);
  return {
    score,
    maxScore,
    percentage: maxScore > 0 ? Math.round(score / maxScore * 100) : 0,
    weakTopics: [...weakTopics]
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
  resultsFolder: "_plugin_outputs/pruefungsergebnisse",
  attempts: []
};
var ExamModal = class extends import_obsidian2.Modal {
  constructor(app, file, markdown, onSubmitAttempt) {
    super(app);
    this.file = file;
    this.markdown = markdown;
    this.onSubmitAttempt = onSubmitAttempt;
  }
  onOpen() {
    const exam = parseExamMarkdown(this.markdown);
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: exam.title });
    contentEl.createEl("p", { text: `Zeitlimit: ${exam.zeitlimitMin} Minuten` });
    const answerMap = /* @__PURE__ */ new Map();
    exam.questions.forEach((question) => {
      const container = contentEl.createDiv({ cls: "exam-question" });
      container.createEl("h3", { text: question.prompt });
      question.options.forEach((option, optionIndex) => {
        const label = container.createEl("label");
        const input = label.createEl("input", { type: "checkbox" });
        input.addEventListener("change", () => {
          const selected = answerMap.get(question.id) ?? [];
          if (input.checked) {
            selected.push(optionIndex);
          } else {
            const index = selected.indexOf(optionIndex);
            if (index >= 0) {
              selected.splice(index, 1);
            }
          }
          answerMap.set(question.id, [...new Set(selected)].sort());
        });
        label.appendText(` ${option}`);
        container.createEl("br");
      });
    });
    const submitButton = contentEl.createEl("button", { text: "Pruefung abgeben" });
    submitButton.addEventListener("click", async () => {
      const answers = exam.questions.map((question) => ({
        questionId: question.id,
        selectedIndexes: answerMap.get(question.id) ?? []
      }));
      const result = gradeAttempt(exam, answers);
      await this.onSubmitAttempt({
        filePath: this.file.path,
        title: exam.title,
        submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
        result
      });
      this.close();
    });
  }
};
var PruefungsSimulatorPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("timer", "Pruefung simulieren", () => void this.runCurrentQuiz());
    this.addCommand({
      id: "simulate-current-quiz",
      name: "Pruefung: Aktuelle Quiz-Notiz simulieren",
      callback: () => void this.runCurrentQuiz()
    });
    this.addSettingTab(new BaseSettingsTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async runCurrentQuiz() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian2.Notice("Keine aktive Quiz-Notiz gefunden.");
      return;
    }
    const markdown = await this.app.vault.cachedRead(file);
    const exam = parseExamMarkdown(markdown);
    if (exam.questions.length === 0) {
      new import_obsidian2.Notice("Diese Notiz enthaelt keine auswertbaren Multiple-Choice-Fragen.");
      return;
    }
    new ExamModal(this.app, file, markdown, async (attempt) => {
      this.settings.attempts.unshift(attempt);
      await this.saveSettings();
      const resultMarkdown = [
        `# Ergebnis: ${attempt.title}`,
        "",
        `- Zeitpunkt: ${attempt.submittedAt}`,
        `- Punkte: ${attempt.result.score}/${attempt.result.maxScore}`,
        `- Prozent: ${attempt.result.percentage}%`,
        `- Schwaechen: ${attempt.result.weakTopics.join(", ") || "keine"}`
      ].join("\n");
      const fileName = `${attempt.title.replace(/[^a-zA-Z0-9-_]/g, "_").toLowerCase()}-${Date.now()}.md`;
      const path = await writePluginOutput(this.app, this.settings.resultsFolder, fileName, resultMarkdown);
      noticeSuccess(`Pruefung ausgewertet: ${path}`);
    }).open();
  }
};
