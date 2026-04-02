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
    hero.createEl("h2", { cls: "ausbildung-modal__title", text: "Analytics Dashboard" });
    hero.createEl("p", {
      cls: "ausbildung-modal__subtitle",
      text: "Interaktive Analyse mit Charts, Vorhersagen und Export-Optionen."
    });
    const stats = shell.createDiv({ cls: "ausbildung-modal__stats" });
    const noteStat = createStatCard(stats, "Notes", "...");
    const reviewStat = createStatCard(stats, "Due reviews", "...");
    const progressStat = createStatCard(stats, "Progress", "...");
    const tabs = shell.createDiv({ cls: "analytics-tabs" });
    const reportTab = tabs.createEl("button", { cls: "analytics-tab active", text: "Report" });
    const chartsTab = tabs.createEl("button", { cls: "analytics-tab", text: "Charts" });
    const insightsTab = tabs.createEl("button", { cls: "analytics-tab", text: "Insights" });
    const exportTab = tabs.createEl("button", { cls: "analytics-tab", text: "Export" });
    const body = shell.createDiv({ cls: "ausbildung-modal__body" });
    const reportContainer = body.createDiv({ cls: "analytics-content" });
    const chartsContainer = body.createDiv({ cls: "analytics-content analytics-hidden" });
    const insightsContainer = body.createDiv({ cls: "analytics-content analytics-hidden" });
    const exportContainer = body.createDiv({ cls: "analytics-content analytics-hidden" });
    reportContainer.setText("Loading...");
    const actions = shell.createDiv({ cls: "ausbildung-modal__actions" });
    const saveButton = actions.createEl("button", { cls: "mod-cta", text: "Save report" });
    saveButton.disabled = true;
    const closeButton = actions.createEl("button", { text: "Close" });
    closeButton.addEventListener("click", () => this.close());
    let metrics: ReturnType<typeof calculateDashboardMetrics>;
    let notes: ReturnType<typeof scanVault> extends Promise<Array<{ note: infer T }>> ? T[] : never;
    try {
      const scanned = await scanVault(this.app, this.plugin.settings.rootFolders);
      notes = scanned.map((entry) => entry.note);
      metrics = calculateDashboardMetrics(notes);
      const markdown = await this.plugin.buildReport();
      noteStat.setText(String(metrics.total));
      reviewStat.setText(String(metrics.dueReviews));
      const mastered = metrics.byStatus.beherrscht || 0;
      progressStat.setText(`${mastered}/${metrics.total} mastered`);
      await this.renderReport(reportContainer, markdown);
      this.renderCharts(chartsContainer, metrics);
      await this.renderInsights(insightsContainer, metrics);
      this.renderExport(exportContainer, metrics, notes);
      saveButton.disabled = false;
      saveButton.addEventListener("click", async () => {
        await this.plugin.generateReport();
        this.close();
      });
      reportTab.addEventListener("click", () => this.switchTab(
        reportTab,
        [chartsTab, insightsTab, exportTab],
        reportContainer,
        [chartsContainer, insightsContainer, exportContainer]
      ));
      chartsTab.addEventListener("click", () => this.switchTab(
        chartsTab,
        [reportTab, insightsTab, exportTab],
        chartsContainer,
        [reportContainer, insightsContainer, exportContainer]
      ));
      insightsTab.addEventListener("click", () => this.switchTab(
        insightsTab,
        [reportTab, chartsTab, exportTab],
        insightsContainer,
        [reportContainer, chartsContainer, exportContainer]
      ));
      exportTab.addEventListener("click", () => this.switchTab(
        exportTab,
        [reportTab, chartsTab, insightsTab],
        exportContainer,
        [reportContainer, chartsContainer, insightsContainer]
      ));
    } catch (error) {
      reportContainer.empty();
      reportContainer.createDiv({
        cls: "ausbildung-modal__error",
        text: `Report konnte nicht erzeugt werden: ${String(error)}`
      });
    }
  }

  private async renderReport(container: HTMLElement, markdown: string): Promise<void> {
    container.empty();
    await MarkdownRenderer.render(this.app, markdown, container, "", this.plugin);
  }

  private renderCharts(container: HTMLElement, metrics: ReturnType<typeof calculateDashboardMetrics>): void {
    container.empty();
    if (metrics.total === 0) {
      container.createEl("p", { text: "Keine Lernnotizen im aktuellen Suchbereich gefunden." });
      return;
    }
    // Status pie chart
    const statusChart = container.createDiv({ cls: "analytics-chart" });
    statusChart.createEl("h3", { text: "Lernstatus Verteilung" });
    this.renderSimplePieChart(statusChart, metrics.byStatus);

    // Progress over time (simplified)
    const progressChart = container.createDiv({ cls: "analytics-chart" });
    progressChart.createEl("h3", { text: "Fortschritt nach Jahr" });
    Object.entries(metrics.byYear).forEach(([year, count]) => {
      const item = progressChart.createDiv({ cls: "chart-bar" });
      item.createSpan({ text: `${year}: ${count}` });
      const bar = item.createDiv({ cls: "chart-bar-fill" });
      bar.style.width = `${(count as number / metrics.total) * 100}%`;
    });
  }

  private renderSimplePieChart(container: HTMLElement, data: Record<string, number>): void {
    const total = Object.values(data).reduce((sum, val) => sum + (val as number), 0);
    if (total === 0) {
      container.createEl("p", { text: "Noch keine Statusdaten verfuegbar." });
      return;
    }
    Object.entries(data).forEach(([label, value]) => {
      const item = container.createDiv({ cls: "pie-item" });
      item.createSpan({ text: `${label}: ${value} (${((value as number / total) * 100).toFixed(1)}%)` });
      const bar = item.createDiv({ cls: "pie-bar" });
      bar.style.width = `${(value as number / total) * 100}%`;
    });
  }

  private async renderInsights(container: HTMLElement, metrics: ReturnType<typeof calculateDashboardMetrics>): Promise<void> {
    container.empty();
    container.createEl("h3", { text: "Vorhersagen & Insights" });

    // Simple prediction: based on current rate
    const mastered = metrics.byStatus.beherrscht || 0;
    const total = metrics.total;
    if (total === 0) {
      container.createEl("p", { text: "Keine ausreichenden Daten fuer eine Fortschrittsprognose." });
      return;
    }
    const completionRate = mastered / total;
    const daysToComplete = Math.ceil((1 - completionRate) * 30); // Rough estimate
    container.createEl("p", { text: `Bei aktueller Geschwindigkeit: ${daysToComplete} Tage bis zur Vollendung.` });

    // AI insights if available
    const provider = getAiProviderConfig(this.plugin.settings);
    if (provider) {
      try {
        const response = await runAiRequest(provider, {
          systemPrompt: "Gib eine kurze Vorhersage über den Lernfortschritt basierend auf den Metriken.",
          userPrompt: `Metriken: ${JSON.stringify(metrics).slice(0, 1000)}`,
          temperature: 0.5
        });
        container.createEl("p", { text: `AI-Vorhersage: ${response.rawText.slice(0, 200)}` });
      } catch (error) {
        container.createEl("p", { text: "AI-Vorhersage nicht verfügbar." });
      }
    }
  }

  private renderExport(container: HTMLElement, metrics: ReturnType<typeof calculateDashboardMetrics>, notes: Array<{ path: string; title: string; lernstatus?: string; modul_id?: string; score_last?: number }>): void {
    container.empty();
    container.createEl("h3", { text: "Export Optionen" });
    const jsonBtn = container.createEl("button", { text: "Export as JSON" });
    jsonBtn.addEventListener("click", () => this.exportData(metrics, notes, "json"));
    const csvBtn = container.createEl("button", { text: "Export as CSV" });
    csvBtn.addEventListener("click", () => this.exportData(metrics, notes, "csv"));
  }

  private async exportData(metrics: ReturnType<typeof calculateDashboardMetrics>, notes: Array<{ path: string; title: string; lernstatus?: string; modul_id?: string; score_last?: number }>, format: string): Promise<void> {
    let content = "";
    let ext = format;
    if (format === "json") {
      content = JSON.stringify({ metrics, notes: notes.slice(0, 50) }, null, 2);
    } else if (format === "csv") {
      content = "Path,Title,Status,Module,Score\n" +
        notes.map(note => `"${note.path}","${note.title}","${note.lernstatus}","${note.modul_id}","${note.score_last}"`).join("\n");
    }
    const fileName = `analytics-export-${Date.now()}.${ext}`;
    const path = await writePluginOutput(this.app, this.plugin.settings.dashboardFolder, fileName, content);
    noticeSuccess(`Exported to ${path}`);
  }

  private switchTab(activeTab: HTMLElement, inactiveTabs: HTMLElement[], activeContainer: HTMLElement, inactiveContainers: HTMLElement[]): void {
    activeTab.addClass("active");
    inactiveTabs.forEach((tab) => tab.removeClass("active"));
    activeContainer.removeClass("analytics-hidden");
    inactiveContainers.forEach((container) => container.addClass("analytics-hidden"));
  }
}

function createStatCard(container: HTMLElement, label: string, value: string): HTMLElement {
  const card = container.createDiv({ cls: "ausbildung-modal__stat" });
  card.createDiv({ cls: "ausbildung-modal__stat-label", text: label });
  return card.createDiv({ cls: "ausbildung-modal__stat-value", text: value });
}
