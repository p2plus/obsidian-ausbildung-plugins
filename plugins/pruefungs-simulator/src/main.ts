import { App, Modal, Notice, Plugin, TFile } from "obsidian";
import { analyzeStudyMaterial, ExamAttemptAnswer, ExamAttemptResult, generateQuizFromMarkdown, gradeAttempt, parseExamMarkdown, parseLearningNote } from "@ausbildung/shared-core";
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
  private timerInterval: number | null = null;
  private submitted = false;

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
    const header = contentEl.createDiv({ cls: "exam-header" });
    header.createEl("h2", { text: exam.title });

    // Timer and progress
    const timerEl = header.createEl("div", { cls: "exam-timer", text: `Zeit: ${exam.zeitlimitMin}:00` });
    const progressEl = header.createEl("div", { cls: "exam-progress" });
    const progressBar = progressEl.createEl("div", { cls: "exam-progress-bar" });
    progressEl.createEl("span", { text: `0/${exam.questions.length} Fragen beantwortet` });

    const answerMap = new Map<string, number[]>();

    // Start timer
    const endTime = Date.now() + exam.zeitlimitMin * 60 * 1000;
    this.timerInterval = window.setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      timerEl.setText(`Zeit: ${minutes}:${seconds.toString().padStart(2, '0')}`);
      if (remaining <= 0) {
        this.clearTimer();
        void this.submitExam(exam, answerMap);
      }
    }, 1000);

    exam.questions.forEach((question, qIndex) => {
      const container = contentEl.createDiv({ cls: "exam-question" });
      container.createEl("h3", { text: `${qIndex + 1}. ${question.prompt}` });
      question.options.forEach((option, optionIndex) => {
        const label = container.createEl("label", { cls: "exam-option" });
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
          this.updateProgress(answerMap, exam.questions.length, progressBar, progressEl);
        });
        label.appendText(` ${option}`);
      });
    });

    const submitButton = contentEl.createEl("button", { cls: "exam-submit", text: "Pruefung abgeben" });
    submitButton.addEventListener("click", async () => {
      this.clearTimer();
      await this.submitExam(exam, answerMap);
    });
  }

  onClose(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timerInterval !== null) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateProgress(answerMap: Map<string, number[]>, total: number, progressBar: HTMLElement, progressEl: HTMLElement): void {
    const answered = Array.from(answerMap.values()).filter(arr => arr.length > 0).length;
    const percentage = (answered / total) * 100;
    progressBar.style.width = `${percentage}%`;
    progressEl.lastElementChild!.setText(`${answered}/${total} Fragen beantwortet`);
  }

  private async submitExam(exam: any, answerMap: Map<string, number[]>): Promise<void> {
    if (this.submitted) {
      return;
    }
    this.submitted = true;
    const answers: ExamAttemptAnswer[] = exam.questions.map((question: any) => ({
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
    // Show result modal
    new ExamResultModal(this.app, result).open();
  }
}

class ExamResultModal extends Modal {
  private result: ExamAttemptResult;

  constructor(app: App, result: ExamAttemptResult) {
    super(app);
    this.result = result;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    const shell = contentEl.createDiv({ cls: "exam-result-modal" });
    shell.createEl("h2", { text: "Prüfungsergebnis" });

    // Score
    const scoreCard = shell.createDiv({ cls: "result-card" });
    scoreCard.createEl("h3", { text: "Punkte" });
    scoreCard.createEl("p", { text: `${this.result.score}/${this.result.maxScore} (${this.result.percentage}%)` });
    this.renderProgressBar(scoreCard, this.result.percentage);

    // Analytics
    const analytics = shell.createDiv({ cls: "result-analytics" });
    analytics.createEl("h3", { text: "Analyse" });
    if (this.result.weakTopics.length > 0) {
      analytics.createEl("p", { text: `Schwache Themen: ${this.result.weakTopics.join(", ")}` });
    } else {
      analytics.createEl("p", { text: "Alle Themen gut beherrscht!" });
    }

    // Performance chart (simple)
    const chart = shell.createDiv({ cls: "result-chart" });
    chart.createEl("h3", { text: "Leistung" });
    const perfText = this.result.percentage >= 80 ? "Ausgezeichnet" : this.result.percentage >= 60 ? "Gut" : this.result.percentage >= 40 ? "Befriedigend" : "Nicht bestanden";
    chart.createEl("p", { text: perfText });

    const closeBtn = shell.createEl("button", { text: "Schließen" });
    closeBtn.addEventListener("click", () => this.close());
  }

  private renderProgressBar(container: HTMLElement, percentage: number): void {
    const bar = container.createDiv({ cls: "result-progress-bar" });
    const fill = bar.createDiv({ cls: "result-progress-fill" });
    fill.style.width = `${percentage}%`;
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
    const originalMarkdown = await this.app.vault.cachedRead(file);
    let markdown = originalMarkdown;
    let exam = parseExamMarkdown(markdown);
    if (exam.questions.length === 0) {
      const note = parseLearningNote(file.path, originalMarkdown);
      const signals = analyzeStudyMaterial(originalMarkdown);
      if (signals.readinessScore < 4) {
        new Notice(`Die Notiz ist fuer lokale Pruefungsfragen noch schwach vorbereitet: ${signals.issues.join(", ")}`);
      }
      markdown = generateQuizFromMarkdown(note, originalMarkdown);
      exam = parseExamMarkdown(markdown);
    }
    if (exam.questions.length === 0) {
      new Notice("Diese Notiz enthaelt noch zu wenig klar strukturierte Fakten fuer eine lokale Pruefung.");
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
