import { MarkdownRenderer, Modal, Notice, Plugin, Setting } from "obsidian";
import { buildReviewPriorityAiRequest, calculateNextReview, normalizeReviewPriority, updateYamlField } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, getAiProviderConfig, noticeSuccess, openOutputFile, runAiRequest, scanVault, updateLearningStatus, writePluginOutput } from "@ausbildung/plugin-kit";

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

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async generateQueue(): Promise<void> {
    const { markdown, fileName } = await this.buildQueueMarkdown();
    const path = await writePluginOutput(this.app, this.settings.periodicNotesFolder, fileName, markdown);
    noticeSuccess(`Review Queue geschrieben: ${path}`);
    await openOutputFile(this.app, path, true);
  }

  async buildQueueMarkdown(): Promise<{ markdown: string; fileName: string }> {
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
    return { markdown, fileName: `${today}-review-queue.md` };
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
    let updated = updateYamlField(content, "next_review", result.nextReview);
    updated = updateYamlField(updated, "last_review", today);
    await this.app.vault.modify(file, updated);
    await updateLearningStatus(this.app, file, rating === "leicht" ? "sicher" : rating === "vergessen" ? "gelesen" : "geuebt");
    new Notice(`Naechste Wiederholung: ${result.nextReview}`);
  }

  private openQueuePreview(): void {
    new ReviewQueueModal(this.app, this).open();
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

class ReviewQueueModal extends Modal {
  private plugin: SpacedRepetitionEnginePlugin;

  constructor(app: Plugin["app"], plugin: SpacedRepetitionEnginePlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen(): Promise<void> {
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
    priorityFilter.createEl("option", { value: "all", text: "Alle Prioritäten" });
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
    let allItems: any[] = [];
    let filteredItems: any[] = [];
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

  private parseQueueItems(markdown: string): Array<{ title: string; priority: number; reason: string; recapPrompt: string }> {
    const lines = markdown.split("\n");
    const items: Array<{ title: string; priority: number; reason: string; recapPrompt: string }> = [];
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

  private applyPriorityFilter(items: Array<{ title: string; priority: number; reason: string; recapPrompt: string }>, filter: string): Array<{ title: string; priority: number; reason: string; recapPrompt: string }> {
    if (filter === "all") return items;
    if (filter === "high") return items.filter((item) => item.priority <= 3);
    if (filter === "medium") return items.filter((item) => item.priority > 3 && item.priority <= 6);
    if (filter === "low") return items.filter((item) => item.priority > 6);
    return items;
  }

  private async renderPreview(preview: HTMLElement, items: Array<{ title: string; priority: number; reason: string; recapPrompt: string }>): Promise<void> {
    preview.empty();
    if (items.length === 0) {
      preview.createDiv({
        cls: "ausbildung-modal__empty",
        text: "Keine Reviews entsprechen den Filterkriterien."
      });
    } else {
      const markdown = "# Review Queue\n\n" + items.map((entry) =>
        `- [ ] [[${entry.title}]] | Prioritaet ${entry.priority} | ${entry.reason}\n  - Prompt: ${entry.recapPrompt}`
      ).join("\n");
      await MarkdownRenderer.render(this.app, markdown, preview, "", this.plugin);
    }
  }
}

function createStatCard(container: HTMLElement, label: string, value: string): HTMLElement {
  const card = container.createDiv({ cls: "ausbildung-modal__stat" });
  card.createDiv({ cls: "ausbildung-modal__stat-label", text: label });
  return card.createDiv({ cls: "ausbildung-modal__stat-value", text: value });
}
