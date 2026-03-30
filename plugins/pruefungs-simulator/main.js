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
  rootFolders: ["000_Ausbildung_Industriekaufmann_2026", "quizzes"],
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
  requestTimeoutMs: 45e3
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
