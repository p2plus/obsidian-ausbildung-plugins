import { Notice, Plugin, Setting } from "obsidian";
import { buildReviewPriorityAiRequest, calculateNextReview, normalizeReviewPriority } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, getAiProviderConfig, runAiRequest, scanVault, updateLearningStatus, writePluginOutput } from "@ausbildung/plugin-kit";

type Rating = "vergessen" | "schwer" | "mittel" | "leicht";

interface SRSettings extends BasePluginSettings {
  dailyQueueLimit: number;
}

const DEFAULT_SETTINGS: SRSettings = {
  ...DEFAULT_BASE_SETTINGS,
  dailyQueueLimit: 8
};

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

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async generateQueue(): Promise<void> {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    const today = new Date().toISOString().slice(0, 10);
    const due = scanned
      .filter((entry) => entry.note.next_review && entry.note.next_review <= today)
      .sort((left, right) => {
        const leftScore = (left.note.pruefungsrelevanz === "ihk-kritisch" ? 100 : 0) + (100 - (left.note.score_last ?? 70));
        const rightScore = (right.note.pruefungsrelevanz === "ihk-kritisch" ? 100 : 0) + (100 - (right.note.score_last ?? 70));
        return rightScore - leftScore;
      })
      .slice(0, this.settings.dailyQueueLimit);

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
        new Notice(`AI-Priorisierung fehlgeschlagen, nutze lokale Sortierung: ${String(error)}`);
      }
    }

    const markdown = [
      "# Review Queue",
      "",
      ...enriched.map((entry) => `- [ ] [[${entry.title}]] | Prioritaet ${entry.priority} | ${entry.reason}\n  - Prompt: ${entry.recapPrompt}`)
    ].join("\n");
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
    let updated = content;
    if (content.includes("next_review:")) {
      updated = updated.replace(/^next_review:.*$/m, `next_review: "${result.nextReview}"`);
    } else {
      updated = `---\nnext_review: "${result.nextReview}"\n---\n\n${updated}`;
    }
    if (updated.includes("last_review:")) {
      updated = updated.replace(/^last_review:.*$/m, `last_review: "${today}"`);
    } else {
      updated = updated.replace(/^---\n/, `---\nlast_review: "${today}"\n`);
    }
    await this.app.vault.modify(file, updated);
    await updateLearningStatus(this.app, file, rating === "leicht" ? "sicher" : rating === "vergessen" ? "gelesen" : "geuebt");
    new Notice(`Naechste Wiederholung: ${result.nextReview}`);
  }
}

class SRSettingsTab extends BaseSettingsTab<SRSettings> {
  override display(): void {
    super.display();
    const { containerEl } = this;
    containerEl.createEl("h3", { text: "Review Queue" });
    new Setting(containerEl)
      .setName("Daily queue limit")
      .setDesc("Maximum number of due reviews to include in the daily queue.")
      .addText((text) =>
        text.setValue(String(this.plugin.settings.dailyQueueLimit))
          .onChange(async (value) => {
            this.plugin.settings.dailyQueueLimit = Number(value) || 8;
            await this.plugin.saveSettings();
          })
      );
  }
}
