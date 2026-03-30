import { Notice, Plugin } from "obsidian";
import { calculateDashboardMetrics, renderDashboardMarkdown } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, getDataviewApi, noticeSuccess, scanVault, updateLearningStatus, writePluginOutput } from "@ausbildung/plugin-kit";

interface DashboardSettings extends BasePluginSettings {
  snapshotFileName: string;
}

const DEFAULT_SETTINGS: DashboardSettings = {
  ...DEFAULT_BASE_SETTINGS,
  snapshotFileName: "lernfortschritt-dashboard.md"
};

export default class LernfortschrittDashboardPlugin extends Plugin {
  settings!: DashboardSettings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addRibbonIcon("bar-chart-3", "Lernfortschritt Snapshot", () => void this.generateSnapshot());
    this.addCommand({
      id: "generate-dashboard-snapshot",
      name: "Dashboard: Snapshot generieren",
      callback: () => void this.generateSnapshot()
    });
    this.addCommand({
      id: "mark-current-note-geuebt",
      name: "Dashboard: Aktuelle Notiz als geuebt markieren",
      callback: () => void this.markCurrent("geuebt")
    });
    this.addCommand({
      id: "mark-current-note-beherrscht",
      name: "Dashboard: Aktuelle Notiz als beherrscht markieren",
      callback: () => void this.markCurrent("beherrscht")
    });
    this.addSettingTab(new BaseSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async generateSnapshot(): Promise<void> {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    const metrics = calculateDashboardMetrics(scanned.map((entry) => entry.note));
    const dataviewApi = getDataviewApi(this, this.settings.useDataview);
    const dataviewHint = dataviewApi ? "\n\n> Dataview erkannt: Live-Abfragen koennen in dieser Snapshot-Note ergaenzt werden.\n" : "\n\n> Dataview nicht aktiv: Snapshot basiert auf sicherem Vault-Scan.\n";
    const content = `${renderDashboardMarkdown(metrics)}${dataviewHint}`;
    const path = await writePluginOutput(this.app, this.settings.dashboardFolder, this.settings.snapshotFileName, content);
    noticeSuccess(`Dashboard geschrieben: ${path}`);
  }

  private async markCurrent(status: string): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Keine aktive Notiz gefunden.");
      return;
    }
    await updateLearningStatus(this.app, file, status);
    noticeSuccess(`lernstatus auf ${status} gesetzt.`);
  }
}
