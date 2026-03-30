import { Notice, Plugin } from "obsidian";
import { buildAnalyticsAiRequest, buildAnalyticsReport, calculateDashboardMetrics, normalizeAnalyticsInsight } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, getAiProviderConfig, runAiRequest, scanVault, writePluginOutput } from "@ausbildung/plugin-kit";

export default class AusbildungsAnalyticsDashboardPlugin extends Plugin {
  settings!: BasePluginSettings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addCommand({
      id: "generate-analytics-report",
      name: "Analytics: Bericht generieren",
      callback: () => void this.generateReport()
    });
    this.addSettingTab(new BaseSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_BASE_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async generateReport(): Promise<void> {
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
    const path = await writePluginOutput(this.app, this.settings.dashboardFolder, "analytics-report.md", markdown);
    new Notice(`Analytics-Report geschrieben: ${path}`);
  }
}
