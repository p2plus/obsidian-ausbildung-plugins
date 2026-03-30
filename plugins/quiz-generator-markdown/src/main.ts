import { Notice, Plugin } from "obsidian";
import { generateQuizFromMarkdown, parseLearningNote } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, writePluginOutput } from "@ausbildung/plugin-kit";

interface QuizSettings extends BasePluginSettings {
  outputFolder: string;
}

const DEFAULT_SETTINGS: QuizSettings = {
  ...DEFAULT_BASE_SETTINGS,
  outputFolder: "quizzes"
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
    this.addSettingTab(new BaseSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async generateFromCurrent(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Keine aktive Notiz gefunden.");
      return;
    }
    const markdown = await this.app.vault.cachedRead(file);
    const note = parseLearningNote(file.path, markdown);
    const quizMarkdown = generateQuizFromMarkdown(note, markdown);
    const path = await writePluginOutput(this.app, this.settings.outputFolder, `${file.basename}-quiz.md`, quizMarkdown);
    new Notice(`Quiz erzeugt: ${path}`);
  }
}
