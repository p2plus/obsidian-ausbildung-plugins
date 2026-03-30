import { Notice, Plugin } from "obsidian";
import { calculateNextReview } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, scanVault, writePluginOutput } from "@ausbildung/plugin-kit";

type Rating = "vergessen" | "schwer" | "mittel" | "leicht";

interface SRSettings extends BasePluginSettings {}

export default class SpacedRepetitionEnginePlugin extends Plugin {
  settings!: SRSettings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addCommand({
      id: "generate-review-queue",
      name: "Reviews: Faellige Wiederholungen generieren",
      callback: () => void this.generateQueue()
    });
    this.addCommand({
      id: "set-next-review-mittel",
      name: "Reviews: Aktuelle Notiz mit Bewertung mittel planen",
      callback: () => void this.scheduleCurrent("mittel")
    });
    this.addSettingTab(new BaseSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_BASE_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async generateQueue(): Promise<void> {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    const today = new Date().toISOString().slice(0, 10);
    const due = scanned.filter((entry) => entry.note.next_review && entry.note.next_review <= today);
    const markdown = ["# Review Queue", "", ...due.map((entry) => `- [ ] [[${entry.file.basename}]] (${entry.note.modul_id ?? "UNSORTIERT"})`)].join("\n");
    const fileName = `${today}-review-queue.md`;
    const path = await writePluginOutput(this.app, this.settings.periodicNotesFolder, fileName, markdown);
    new Notice(`Review Queue geschrieben: ${path}`);
  }

  private async scheduleCurrent(rating: Rating): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Keine aktive Notiz gefunden.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const result = calculateNextReview(today, rating, 4);
    const content = await this.app.vault.cachedRead(file);
    const updated = content.includes("next_review:")
      ? content.replace(/^next_review:.*$/m, `next_review: "${result.nextReview}"`)
      : `---\nnext_review: "${result.nextReview}"\n---\n\n${content}`;
    await this.app.vault.modify(file, updated);
    new Notice(`Naechste Wiederholung: ${result.nextReview}`);
  }
}
