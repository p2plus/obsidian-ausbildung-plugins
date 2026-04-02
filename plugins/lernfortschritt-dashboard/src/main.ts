import { Modal, Notice, Plugin } from "obsidian";
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
    this.addCommand({
      id: "open-live-dashboard",
      name: "Dashboard: Live-Ansicht öffnen",
      callback: () => void this.openLiveDashboard()
    });
    this.addSettingTab(new BaseSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async generateSnapshot(): Promise<void> {
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

  private openLiveDashboard(): void {
    new LiveDashboardModal(this.app, this).open();
  }
}

class LiveDashboardModal extends Modal {
  private plugin: LernfortschrittDashboardPlugin;
  private metrics: any;

  constructor(app: Plugin["app"], plugin: LernfortschrittDashboardPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    const shell = contentEl.createDiv({ cls: "live-dashboard-modal" });

    // Header
    const header = shell.createDiv({ cls: "dashboard-header" });
    header.createEl("h2", { text: "Live Lernfortschritt Dashboard" });

    // Filters
    const filters = shell.createDiv({ cls: "dashboard-filters" });
    const yearFilter = filters.createEl("select", { cls: "dashboard-filter" });
    yearFilter.createEl("option", { value: "all", text: "Alle Jahre" });

    // Charts container
    const charts = shell.createDiv({ cls: "dashboard-charts" });

    // Load data
    await this.loadMetrics();
    this.renderFilters(yearFilter);
    this.renderCharts(charts, yearFilter.value);

    yearFilter.addEventListener("change", () => this.renderCharts(charts, yearFilter.value));

    // Actions
    const actions = shell.createDiv({ cls: "dashboard-actions" });
    const snapshotBtn = actions.createEl("button", { cls: "mod-cta", text: "Snapshot erstellen" });
    const closeBtn = actions.createEl("button", { text: "Schließen" });

    snapshotBtn.addEventListener("click", async () => {
      await this.plugin.generateSnapshot();
      this.close();
    });
    closeBtn.addEventListener("click", () => this.close());
  }

  private async loadMetrics(): Promise<void> {
    const scanned = await scanVault(this.app, this.plugin.settings.rootFolders);
    this.metrics = calculateDashboardMetrics(scanned.map((entry) => entry.note));
  }

  private renderFilters(yearFilter: HTMLSelectElement): void {
    Object.keys(this.metrics.byYear).forEach(year => {
      yearFilter.createEl("option", { value: year, text: year });
    });
  }

  private renderCharts(container: HTMLElement, yearFilter: string): void {
    container.empty();

    // Status chart
    const statusChart = container.createDiv({ cls: "chart-card" });
    statusChart.createEl("h3", { text: "Lernstatus" });
    const statusData = yearFilter === "all" ? this.metrics.byStatus : this.filterByYear(this.metrics.byYear, yearFilter).byStatus;
    this.renderPieChart(statusChart, statusData);

    // Progress bar for total
    const progressCard = container.createDiv({ cls: "chart-card" });
    progressCard.createEl("h3", { text: "Gesamtfortschritt" });
    const mastered = this.metrics.byStatus.beherrscht || 0;
    const total = this.metrics.total;
    this.renderProgressBar(progressCard, mastered, total);

    // Weak modules
    const modulesCard = container.createDiv({ cls: "chart-card" });
    modulesCard.createEl("h3", { text: "Schwächste Module" });
    this.metrics.weakModules.slice(0, 3).forEach((module: any) => {
      const item = modulesCard.createDiv({ cls: "module-item" });
      item.createSpan({ text: `${module.modulId}: ${module.averageScore}%` });
      this.renderMiniProgressBar(item, module.averageScore);
    });

    // Milestone celebration
    if (mastered >= total * 0.5) {
      const celebration = container.createDiv({ cls: "celebration" });
      celebration.createEl("p", { text: "🎉 Über 50% der Notizen beherrscht! Gut gemacht!" });
    }
  }

  private filterByYear(byYear: any, year: string): any {
    // Simplified: assume all notes are included for now
    return this.metrics;
  }

  private renderPieChart(container: HTMLElement, data: Record<string, number>): void {
    const canvas = container.createEl("div", { cls: "pie-chart" });
    const total = Object.values(data).reduce((sum: number, val: number) => sum + val, 0);
    let cumulative = 0;
    const colors = ['#2f7d61', '#d97706', '#7d5a2f', '#b24a3f'];
    let colorIndex = 0;
    Object.entries(data).forEach(([label, value]) => {
      const percentage = (value as number) / total * 100;
      const segment = canvas.createDiv({ cls: "pie-segment" });
      segment.style.background = colors[colorIndex % colors.length];
      segment.style.transform = `rotate(${cumulative}deg)`;
      segment.style.clipPath = `polygon(0 0, 50% 0, 50% 100%, 0 100%)`;
      const labelDiv = canvas.createDiv({ cls: "pie-label", text: `${label}: ${value}` });
      cumulative += percentage * 3.6; // 3.6 degrees per percent
      colorIndex++;
    });
  }

  private renderProgressBar(container: HTMLElement, current: number, total: number): void {
    const bar = container.createDiv({ cls: "progress-bar" });
    const fill = bar.createDiv({ cls: "progress-fill" });
    fill.style.width = `${(current / total) * 100}%`;
    container.createEl("p", { text: `${current}/${total} beherrscht` });
  }

  private renderMiniProgressBar(container: HTMLElement, percentage: number): void {
    const bar = container.createDiv({ cls: "mini-progress-bar" });
    const fill = bar.createDiv({ cls: "mini-progress-fill" });
    fill.style.width = `${percentage}%`;
  }
}
