import { Notice, Plugin } from "obsidian";
import { buildAnalyticsReport } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, scanVault, writePluginOutput } from "@ausbildung/plugin-kit";

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
    const markdown = buildAnalyticsReport(scanned.map((entry) => entry.note));
    const path = await writePluginOutput(this.app, this.settings.dashboardFolder, "analytics-report.md", markdown);
    new Notice(`Analytics-Report geschrieben: ${path}`);
  }
}
