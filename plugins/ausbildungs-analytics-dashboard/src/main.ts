import { MarkdownRenderer, Modal, Notice, Plugin } from "obsidian";
import { buildAnalyticsAiRequest, buildAnalyticsReport, calculateDashboardMetrics, normalizeAnalyticsInsight } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, getAiProviderConfig, noticeSuccess, openOutputFile, runAiRequest, scanVault, writePluginOutput } from "@ausbildung/plugin-kit";

export default class AusbildungsAnalyticsDashboardPlugin extends Plugin {
  settings!: BasePluginSettings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addCommand({
      id: "generate-analytics-report",
      name: "Analytics: Bericht generieren",
      callback: () => void this.generateReport()
    });
    this.addCommand({
      id: "preview-analytics-report",
      name: "Analytics: Vorschau oeffnen",
      callback: () => void this.openPreview()
    });
    this.addSettingTab(new BaseSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_BASE_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async generateReport(): Promise<void> {
    const result = await this.buildReport();
    const path = await writePluginOutput(this.app, this.settings.dashboardFolder, "analytics-report.md", result);
    noticeSuccess(`Analytics-Report geschrieben: ${path}`);
    await openOutputFile(this.app, path, true);
  }

  async buildReport(): Promise<string> {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    const notes = scanned.map((entry) => entry.note);
    const metrics = calculateDashboardMetrics(notes);
    let markdown = [
      buildAnalyticsReport(notes),
      "",
      "## Fortschritt nach Ausbildungsjahr",
      ...Object.entries(metrics.byYear).map(([year, count]) => `- ${year}: ${count}`),
      "",
      "## Faellige Reviews",
      `- ${metrics.dueReviews}`,
      "",
      "## Schwaechste Module",
      ...metrics.weakModules.map((entry) => `- ${entry.modulId}: ${entry.averageScore}% aus ${entry.count} Eintraegen`)
    ].join("\n");

    const provider = getAiProviderConfig(this.settings);
    if (provider) {
      try {
        const response = await runAiRequest(provider, buildAnalyticsAiRequest(notes, markdown));
        const insight = normalizeAnalyticsInsight(response.parsed);
        if (insight) {
          markdown += [
            "",
            "## Einordnung",
            insight.summary,
            "",
            "## Risiken",
            ...insight.risks.map((risk) => `- ${risk}`),
            "",
            "## Naechste Schritte",
            ...insight.nextActions.map((action) => `- ${action}`)
          ].join("\n");
        }
      } catch (error) {
        markdown += `\n\n## AI-Hinweis\n- Narrative Zusammenfassung nicht verfuegbar: ${String(error)}`;
      }
    }
    return markdown;
  }

  private openPreview(): void {
    new AnalyticsPreviewModal(this.app, this).open();
  }
}

class AnalyticsPreviewModal extends Modal {
  private plugin: AusbildungsAnalyticsDashboardPlugin;

  constructor(app: Plugin["app"], plugin: AusbildungsAnalyticsDashboardPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    const shell = contentEl.createDiv({ cls: "ausbildung-modal analytics-modal" });
    const hero = shell.createDiv({ cls: "ausbildung-modal__hero" });
    hero.createDiv({ cls: "ausbildung-modal__eyebrow", text: "Analytics" });
    hero.createEl("h2", { cls: "ausbildung-modal__title", text: "Analytics Preview" });
    hero.createEl("p", {
      cls: "ausbildung-modal__subtitle",
      text: "Aggregierter Bericht ueber Fortschritt, Review-Druck und schwache Module."
    });
    const stats = shell.createDiv({ cls: "ausbildung-modal__stats" });
    const noteStat = createStatCard(stats, "Notes", "...");
    const reviewStat = createStatCard(stats, "Due reviews", "...");
    const body = shell.createDiv({ cls: "ausbildung-modal__body" });
    const summary = body.createDiv({ cls: "ausbildung-modal__summary" });
    const preview = body.createDiv({ cls: "ausbildung-modal__rendered" });
    preview.setText("Loading...");
    const actions = shell.createDiv({ cls: "ausbildung-modal__actions" });
    const saveButton = actions.createEl("button", { cls: "mod-cta", text: "Save report" });
    saveButton.disabled = true;
    const closeButton = actions.createEl("button", { text: "Close" });
    closeButton.addEventListener("click", () => this.close());
    try {
      const markdown = await this.plugin.buildReport();
      noteStat.setText(matchMetric(markdown, /- Notizen: (\d+)/) ?? "0");
      reviewStat.setText(matchMetric(markdown, /## Faellige Reviews\s+- (\d+)/m) ?? "0");
      summary.empty();
      summary.createDiv({ cls: "ausbildung-modal__summary-item", text: `Output: ${this.plugin.settings.dashboardFolder}/analytics-report.md` });
      summary.createDiv({ cls: "ausbildung-modal__summary-item", text: this.plugin.settings.aiEnabled ? "Narrative summary enabled" : "Local metrics only" });
      preview.empty();
      await MarkdownRenderer.render(this.app, markdown, preview, "", this.plugin);
      saveButton.disabled = false;
      saveButton.addEventListener("click", async () => {
        await this.plugin.generateReport();
        this.close();
      });
    } catch (error) {
      preview.empty();
      preview.createDiv({
        cls: "ausbildung-modal__error",
        text: `Report konnte nicht erzeugt werden: ${String(error)}`
      });
    }
  }
}

function createStatCard(container: HTMLElement, label: string, value: string): HTMLElement {
  const card = container.createDiv({ cls: "ausbildung-modal__stat" });
  card.createDiv({ cls: "ausbildung-modal__stat-label", text: label });
  return card.createDiv({ cls: "ausbildung-modal__stat-value", text: value });
}

function matchMetric(markdown: string, pattern: RegExp): string | null {
  return markdown.match(pattern)?.[1] ?? null;
}
