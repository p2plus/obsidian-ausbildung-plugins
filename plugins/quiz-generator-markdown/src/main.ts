import { MarkdownRenderer, Modal, Notice, Plugin, Setting } from "obsidian";
import { buildQuizAiRequest, generateQuizFromMarkdown, normalizeQuizDraftQuestions, parseLearningNote, QuizDraftQuestion } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, getAiProviderConfig, noticeSuccess, openOutputFile, runAiRequest, writePluginOutput } from "@ausbildung/plugin-kit";

interface QuizSettings extends BasePluginSettings {
  outputFolder: string;
  questionCount: number;
  examLevel: string;
  generationMode: "rule-based" | "ai-enhanced";
}

const DEFAULT_SETTINGS: QuizSettings = {
  ...DEFAULT_BASE_SETTINGS,
  outputFolder: "quizzes",
  questionCount: 5,
  examLevel: "AP1",
  generationMode: "ai-enhanced"
};

export default class QuizGeneratorMarkdownPlugin extends Plugin {
  settings!: QuizSettings;

  async onload(): Promise<void> {
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

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async generateFromCurrent(): Promise<void> {
    const result = await this.buildQuizFromCurrent();
    const path = await writePluginOutput(this.app, this.settings.outputFolder, result.fileName, result.markdown);
    noticeSuccess(`Quiz erzeugt: ${path}`);
    await openOutputFile(this.app, path, true);
  }

  async buildQuizFromCurrent(): Promise<{ markdown: string; fileName: string }> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Keine aktive Notiz gefunden.");
      throw new Error("Keine aktive Notiz gefunden.");
    }
    const markdown = await this.app.vault.cachedRead(file);
    const note = parseLearningNote(file.path, markdown);
    let quizMarkdown = generateQuizFromMarkdown(note, markdown);
    const provider = getAiProviderConfig(this.settings);
    if (this.settings.generationMode === "ai-enhanced" && provider) {
      try {
        const response = await runAiRequest<{ questions?: unknown[] }>(
          provider,
          buildQuizAiRequest(note, markdown, this.settings.questionCount, this.settings.examLevel)
        );
        const questions = normalizeQuizDraftQuestions(response.parsed);
        if (questions.length > 0) {
          quizMarkdown = this.renderAiQuiz(note.title, note.modul_id ?? "UNSORTIERT", questions, provider.provider, provider.model, file.path);
        }
      } catch (error) {
        new Notice(`AI-Quizerzeugung fehlgeschlagen, nutze Regelmodus: ${String(error)}`);
      }
    }
    return { markdown: quizMarkdown, fileName: `${file.basename}-quiz.md` };
  }

  private renderAiQuiz(title: string, modulId: string, questions: QuizDraftQuestion[], provider: string, model: string, sourcePath: string): string {
    const lines = [
      "---",
      'status: "Entwurf"',
      'lerntyp: "quiz"',
      `modul_id: "${modulId}"`,
      'pruefungsrelevanz: "hoch"',
      `source_note: "${sourcePath}"`,
      `quiz_origin: "ai-enhanced"`,
      `last_ai_generated: "${new Date().toISOString()}"`,
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

  private openPreview(): void {
    new QuizPreviewModal(this.app, this).open();
  }
}

class QuizSettingsTab extends BaseSettingsTab<QuizSettings> {
  override display(): void {
    super.display();
    const { containerEl } = this;
    containerEl.createEl("h3", { text: "Quiz Generation" });
    new Setting(containerEl)
      .setName("Output folder")
      .addText((text) =>
        text.setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value.trim() || "quizzes";
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("Question count")
      .addText((text) =>
        text.setValue(String(this.plugin.settings.questionCount))
          .onChange(async (value) => {
            this.plugin.settings.questionCount = Number(value) || 5;
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("Exam level")
      .addText((text) =>
        text.setValue(this.plugin.settings.examLevel)
          .onChange(async (value) => {
            this.plugin.settings.examLevel = value.trim() || "AP1";
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("Generation mode")
      .setDesc("Use AI when enabled and configured, otherwise stay rule-based.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("rule-based", "Rule-based")
          .addOption("ai-enhanced", "AI-enhanced")
          .setValue(this.plugin.settings.generationMode)
          .onChange(async (value) => {
            this.plugin.settings.generationMode = value as "rule-based" | "ai-enhanced";
            await this.plugin.saveSettings();
          })
      );
  }
}

class QuizPreviewModal extends Modal {
  private plugin: QuizGeneratorMarkdownPlugin;

  constructor(app: Plugin["app"], plugin: QuizGeneratorMarkdownPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen(): Promise<void> {
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
      await MarkdownRenderer.render(this.app, result.markdown, preview, "", this.plugin);
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
}

function createStatCard(container: HTMLElement, label: string, value: string): HTMLElement {
  const card = container.createDiv({ cls: "ausbildung-modal__stat" });
  card.createDiv({ cls: "ausbildung-modal__stat-label", text: label });
  return card.createDiv({ cls: "ausbildung-modal__stat-value", text: value });
}
