import { App, Modal, Notice, Plugin, TFile } from "obsidian";
import { ExamAttemptAnswer, ExamAttemptResult, gradeAttempt, parseExamMarkdown } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, noticeSuccess, writePluginOutput } from "@ausbildung/plugin-kit";

interface ExamAttemptLog {
  filePath: string;
  title: string;
  submittedAt: string;
  result: ExamAttemptResult;
}

interface ExamSettings extends BasePluginSettings {
  resultsFolder: string;
  attempts: ExamAttemptLog[];
}

const DEFAULT_SETTINGS: ExamSettings = {
  ...DEFAULT_BASE_SETTINGS,
  resultsFolder: "_plugin_outputs/pruefungsergebnisse",
  attempts: []
};

class ExamModal extends Modal {
  private readonly file: TFile;
  private readonly markdown: string;
  private readonly onSubmitAttempt: (result: ExamAttemptLog) => Promise<void>;

  constructor(app: App, file: TFile, markdown: string, onSubmitAttempt: (result: ExamAttemptLog) => Promise<void>) {
    super(app);
    this.file = file;
    this.markdown = markdown;
    this.onSubmitAttempt = onSubmitAttempt;
  }

  onOpen(): void {
    const exam = parseExamMarkdown(this.markdown);
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: exam.title });
    contentEl.createEl("p", { text: `Zeitlimit: ${exam.zeitlimitMin} Minuten` });
    const answerMap = new Map<string, number[]>();

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
      const answers: ExamAttemptAnswer[] = exam.questions.map((question) => ({
        questionId: question.id,
        selectedIndexes: answerMap.get(question.id) ?? []
      }));
      const result = gradeAttempt(exam, answers);
      await this.onSubmitAttempt({
        filePath: this.file.path,
        title: exam.title,
        submittedAt: new Date().toISOString(),
        result
      });
      this.close();
    });
  }
}

export default class PruefungsSimulatorPlugin extends Plugin {
  settings!: ExamSettings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addRibbonIcon("timer", "Pruefung simulieren", () => void this.runCurrentQuiz());
    this.addCommand({
      id: "simulate-current-quiz",
      name: "Pruefung: Aktuelle Quiz-Notiz simulieren",
      callback: () => void this.runCurrentQuiz()
    });
    this.addSettingTab(new BaseSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async runCurrentQuiz(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Keine aktive Quiz-Notiz gefunden.");
      return;
    }
    const markdown = await this.app.vault.cachedRead(file);
    const exam = parseExamMarkdown(markdown);
    if (exam.questions.length === 0) {
      new Notice("Diese Notiz enthaelt keine auswertbaren Multiple-Choice-Fragen.");
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
}
