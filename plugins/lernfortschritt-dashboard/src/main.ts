import { Modal, Notice, Plugin } from "obsidian";
import { analyzeStudyMaterial, applyVaultDoctorFixes, buildLearningHubState, calculateDashboardMetrics, LearningHubState, renderDashboardMarkdown, renderVaultDoctorMarkdown, runVaultDoctor, VaultDoctorReport } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, getDataviewApi, noticeSuccess, openOutputFile, scanVault, updateLearningStatus, writePluginOutput } from "@ausbildung/plugin-kit";

interface DashboardSettings extends BasePluginSettings {
  snapshotFileName: string;
  doctorFileName: string;
}

const DEFAULT_SETTINGS: DashboardSettings = {
  ...DEFAULT_BASE_SETTINGS,
  snapshotFileName: "lernfortschritt-dashboard.md",
  doctorFileName: "vault-doctor.md"
};

type ScanResult = Awaited<ReturnType<typeof scanVault>>[number];

export default class LernfortschrittDashboardPlugin extends Plugin {
  settings!: DashboardSettings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addRibbonIcon("bar-chart-3", "Lernzentrale oeffnen", () => void this.openLiveDashboard());
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
      name: "Dashboard: Lernzentrale öffnen",
      callback: () => void this.openLiveDashboard()
    });
    this.addCommand({
      id: "run-vault-doctor",
      name: "Dashboard: Vault Doctor",
      callback: () => void this.openVaultDoctor()
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
    const readyCount = scanned.filter((entry) => analyzeStudyMaterial(entry.markdown).readinessScore >= 4).length;
    const dataviewApi = getDataviewApi(this, this.settings.useDataview);
    const dataviewHint = dataviewApi
      ? "\n\n> Dataview erkannt: Live-Abfragen koennen in dieser Snapshot-Note ergaenzt werden.\n"
      : "\n\n> Dataview nicht aktiv: Snapshot basiert auf sicherem Vault-Scan.\n";
    const content = `${renderDashboardMarkdown(metrics)}\n\n## Materialqualitaet\n- Gut nutzbare Lernnotizen: ${readyCount}\n- Noch duenn strukturierte Notizen: ${metrics.total - readyCount}${dataviewHint}`;
    const path = await writePluginOutput(this.app, this.settings.dashboardFolder, this.settings.snapshotFileName, content);
    noticeSuccess(`Dashboard geschrieben: ${path}`);
  }

  async buildDoctorReport(): Promise<VaultDoctorReport> {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    return runVaultDoctor(scanned.map((entry) => ({ note: entry.note, markdown: entry.markdown })));
  }

  async writeDoctorReport(): Promise<string> {
    const report = await this.buildDoctorReport();
    const path = await writePluginOutput(
      this.app,
      this.settings.dashboardFolder,
      this.settings.doctorFileName,
      renderVaultDoctorMarkdown(report)
    );
    return path;
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

  private openVaultDoctor(): void {
    new VaultDoctorModal(this.app, this).open();
  }
}

class LiveDashboardModal extends Modal {
  private plugin: LernfortschrittDashboardPlugin;
  private scanned: ScanResult[] = [];
  private hubState!: LearningHubState;

  constructor(app: Plugin["app"], plugin: LernfortschrittDashboardPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    const shell = contentEl.createDiv({ cls: "live-dashboard-modal" });

    const header = shell.createDiv({ cls: "dashboard-header" });
    header.createEl("h2", { text: "Lernzentrale" });
    header.createEl("p", {
      text: "Ein Einstieg fuer reale Lernarbeit: heute sinnvoll, aktuelle Notiz, Review-Stau und schwache Module an einem Ort."
    });

    const filters = shell.createDiv({ cls: "dashboard-filters" });
    const yearFilter = filters.createEl("select", { cls: "dashboard-filter" });
    yearFilter.createEl("option", { value: "all", text: "Alle Jahre" });

    const hub = shell.createDiv({ cls: "learning-hub" });
    const recommendations = hub.createDiv({ cls: "learning-hub__recommendations" });
    const currentNote = hub.createDiv({ cls: "learning-hub__current-note" });
    const charts = shell.createDiv({ cls: "dashboard-charts" });

    const actions = shell.createDiv({ cls: "dashboard-actions" });
    const snapshotBtn = actions.createEl("button", { text: "Snapshot schreiben" });
    const reviewBtn = actions.createEl("button", { cls: "mod-cta", text: "Review Queue" });
    const planBtn = actions.createEl("button", { text: "Lernplan" });
    const doctorBtn = actions.createEl("button", { text: "Vault Doctor" });
    const closeBtn = actions.createEl("button", { text: "Schließen" });

    await this.loadHubState();
    this.renderFilters(yearFilter);
    this.renderHub(recommendations, currentNote, yearFilter.value);
    this.renderCharts(charts, yearFilter.value);

    yearFilter.addEventListener("change", () => {
      this.renderHub(recommendations, currentNote, yearFilter.value);
      this.renderCharts(charts, yearFilter.value);
    });

    snapshotBtn.addEventListener("click", async () => {
      await this.plugin.generateSnapshot();
      this.close();
    });
    reviewBtn.addEventListener("click", () => void this.runCommand("spaced-repetition-engine:preview-review-queue"));
    planBtn.addEventListener("click", () => void this.runCommand("lernplan-generator:preview-study-plan"));
    doctorBtn.addEventListener("click", () => {
      this.close();
      new VaultDoctorModal(this.app, this.plugin).open();
    });
    closeBtn.addEventListener("click", () => this.close());
  }

  private async loadHubState(): Promise<void> {
    this.scanned = await scanVault(this.app, this.plugin.settings.rootFolders);
    const activeFile = this.app.workspace.getActiveFile();
    this.hubState = buildLearningHubState(
      this.scanned.map((entry) => entry.note),
      this.scanned.map((entry) => ({ path: entry.note.path, markdown: entry.markdown })),
      activeFile?.path
    );
  }

  private renderFilters(yearFilter: HTMLSelectElement): void {
    Object.keys(this.hubState.metrics.byYear).forEach((year) => {
      yearFilter.createEl("option", { value: year, text: year });
    });
  }

  private renderHub(recommendationsEl: HTMLElement, currentNoteEl: HTMLElement, yearFilter: string): void {
    recommendationsEl.empty();
    currentNoteEl.empty();

    const filtered = this.getFilteredState(yearFilter);
    const hero = recommendationsEl.createDiv({ cls: "learning-hub__hero-card" });
    hero.createDiv({ cls: "learning-hub__eyebrow", text: "Heute sinnvoll" });
    hero.createEl("h3", { text: filtered.metrics.dueReviews > 0 ? "Erst den Review-Stau abbauen" : "Heute ist Raum fuer aktives Ueben" });
    hero.createEl("p", {
      text: filtered.metrics.dueReviews > 0
        ? `Es gibt ${filtered.metrics.dueReviews} faellige Reviews. Das zuerst zu machen ist meist sinnvoller als neuer Stoff.`
        : "Kein grober Rueckstau sichtbar. Nutze die aktuelle Notiz fuer Quiz oder eine kurze Pruefungssimulation."
    });

    const grid = recommendationsEl.createDiv({ cls: "learning-hub__grid" });
    filtered.recommendations.forEach((recommendation) => {
      const card = grid.createDiv({ cls: `learning-hub__card learning-hub__card--${recommendation.emphasis}` });
      card.createDiv({ cls: "learning-hub__card-kicker", text: this.getEmphasisLabel(recommendation.emphasis) });
      card.createEl("h4", { text: recommendation.title });
      card.createEl("p", { text: recommendation.reason });
      const button = card.createEl("button", {
        cls: recommendation.emphasis === "urgent" ? "mod-cta" : "",
        text: recommendation.cta
      });
      button.addEventListener("click", () => void this.handleRecommendation(recommendation.id));
    });

    const noteCard = currentNoteEl.createDiv({ cls: "learning-hub__note-card" });
    noteCard.createDiv({ cls: "learning-hub__eyebrow", text: "Aktuelle Notiz" });
    if (!filtered.activeNote) {
      noteCard.createEl("h3", { text: "Keine aktive Lernnotiz" });
      noteCard.createEl("p", {
        text: "Oeffne eine Lernnotiz. Dann kann die Lernzentrale direkt Quiz, Pruefung und Notizqualitaet auf diese Datei beziehen."
      });
      return;
    }

    noteCard.createEl("h3", { text: filtered.activeNote.title });
    const chips = noteCard.createDiv({ cls: "learning-hub__chips" });
    chips.createSpan({ cls: "learning-hub__chip", text: `Readiness ${filtered.activeNote.readinessScore}/6` });
    if (filtered.activeNote.moduleId) {
      chips.createSpan({ cls: "learning-hub__chip", text: filtered.activeNote.moduleId });
    }
    if (filtered.activeNote.lernstatus) {
      chips.createSpan({ cls: "learning-hub__chip", text: filtered.activeNote.lernstatus });
    }
    if (filtered.activeNote.dueReview) {
      chips.createSpan({ cls: "learning-hub__chip learning-hub__chip--urgent", text: "Review fällig" });
    }

    if (filtered.activeNote.issues.length > 0) {
      noteCard.createEl("p", { text: "Damit die Note wirklich lernbar wird, sollte sie noch klarer werden:" });
      const issueList = noteCard.createEl("ul", { cls: "learning-hub__issues" });
      filtered.activeNote.issues.forEach((issue) => issueList.createEl("li", { text: issue }));
    } else {
      noteCard.createEl("p", { text: "Die Notiz ist strukturiert genug fuer Quiz und kurze Pruefungsläufe." });
    }

    const noteActions = noteCard.createDiv({ cls: "learning-hub__note-actions" });
    const quizBtn = noteActions.createEl("button", { cls: "mod-cta", text: "Quiz zur aktuellen Notiz" });
    const examBtn = noteActions.createEl("button", { text: "Pruefung simulieren" });
    quizBtn.disabled = filtered.activeNote.readinessScore < 4;
    examBtn.disabled = filtered.activeNote.readinessScore < 4;
    quizBtn.addEventListener("click", () => void this.runCommand("quiz-generator-markdown:preview-quiz-generation"));
    examBtn.addEventListener("click", () => void this.runCommand("pruefungs-simulator:simulate-current-quiz"));
  }

  private renderCharts(container: HTMLElement, yearFilter: string): void {
    container.empty();
    const filtered = this.getFilteredState(yearFilter);
    const metrics = filtered.metrics;

    const statusChart = container.createDiv({ cls: "chart-card" });
    statusChart.createEl("h3", { text: "Lernstatus" });
    this.renderPieChart(statusChart, metrics.byStatus);

    const progressCard = container.createDiv({ cls: "chart-card" });
    progressCard.createEl("h3", { text: "Gesamtfortschritt" });
    const mastered = metrics.byStatus.beherrscht || 0;
    this.renderProgressBar(progressCard, mastered, metrics.total);
    progressCard.createEl("p", {
      cls: "chart-card__meta",
      text: `${filtered.usableStudyNotes} gut nutzbare Lernnotizen, ${filtered.weaklyStructuredNotes} noch roh`
    });

    const modulesCard = container.createDiv({ cls: "chart-card" });
    modulesCard.createEl("h3", { text: "Schwaechste Module" });
    if (metrics.weakModules.length === 0) {
      modulesCard.createEl("p", { text: "Noch keine Score-Daten vorhanden." });
    } else {
      metrics.weakModules.slice(0, 3).forEach((module) => {
        const item = modulesCard.createDiv({ cls: "module-item" });
        item.createSpan({ text: `${module.modulId}: ${module.averageScore}%` });
        this.renderMiniProgressBar(item, module.averageScore);
      });
    }

    const reviewCard = container.createDiv({ cls: "chart-card" });
    reviewCard.createEl("h3", { text: "Heute im Blick" });
    reviewCard.createEl("p", { text: `${metrics.dueReviews} Reviews sind faellig.` });
    if (filtered.dueReviewTitles.length > 0) {
      const dueList = reviewCard.createEl("ul", { cls: "learning-hub__issues" });
      filtered.dueReviewTitles.forEach((title) => dueList.createEl("li", { text: title }));
    } else {
      reviewCard.createEl("p", { text: "Kein Review-Stau sichtbar." });
    }

    if (mastered > 0 && metrics.total > 0 && mastered >= metrics.total * 0.5) {
      const celebration = container.createDiv({ cls: "celebration" });
      celebration.createEl("p", { text: "Mehr als die Hälfte sitzt bereits. Jetzt lohnt sich Transfer und Prüfungssimulation." });
    }
  }

  private getFilteredState(yearFilter: string): LearningHubState {
    if (yearFilter === "all") {
      return this.hubState;
    }

    const filteredScanned = this.scanned.filter((entry) => (entry.note.ausbildungsjahr ?? "ohne-jahr") === yearFilter);
    return buildLearningHubState(
      filteredScanned.map((entry) => entry.note),
      filteredScanned.map((entry) => ({ path: entry.note.path, markdown: entry.markdown })),
      this.hubState.activeNote?.path
    );
  }

  private getEmphasisLabel(emphasis: "urgent" | "next" | "steady"): string {
    if (emphasis === "urgent") {
      return "Jetzt";
    }
    if (emphasis === "next") {
      return "Als naechstes";
    }
    return "Nebenbei";
  }

  private async handleRecommendation(id: string): Promise<void> {
    if (id === "snapshot") {
      await this.plugin.generateSnapshot();
      return;
    }

    const commandMap: Record<string, string> = {
      "review-queue": "spaced-repetition-engine:preview-review-queue",
      "quiz-current": "quiz-generator-markdown:preview-quiz-generation",
      "simulate-current": "pruefungs-simulator:simulate-current-quiz",
      "plan-week": "lernplan-generator:preview-study-plan"
    };
    const commandId = commandMap[id];
    if (commandId) {
      await this.runCommand(commandId);
    }
  }

  private async runCommand(commandId: string): Promise<void> {
    const commandsApi = (this.app as Plugin["app"] & {
      commands?: {
        findCommand: (id: string) => unknown;
        executeCommandById: (id: string) => Promise<boolean> | boolean;
      };
    }).commands;
    const command = commandsApi?.findCommand(commandId);
    if (!command) {
      new Notice(`Aktion nicht verfuegbar: ${commandId}`);
      return;
    }
    this.close();
    await commandsApi!.executeCommandById(commandId);
  }

  private renderPieChart(container: HTMLElement, data: Record<string, number>): void {
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    if (total === 0) {
      container.createEl("p", { text: "Noch keine Daten fuer diesen Filter." });
      return;
    }

    const canvas = container.createDiv({ cls: "pie-chart" });
    const legend = container.createDiv({ cls: "pie-legend" });
    let cumulative = 0;
    const colors = ["#2f7d61", "#d97706", "#7d5a2f", "#b24a3f", "#3f6bb2"];

    Object.entries(data).forEach(([label, value], index) => {
      const segment = canvas.createDiv({ cls: "pie-segment" });
      segment.style.background = colors[index % colors.length];
      segment.style.transform = `rotate(${cumulative}deg)`;
      segment.style.clipPath = "polygon(50% 50%, 50% 0, 100% 0, 100% 100%)";
      cumulative += (value / total) * 360;

      const legendRow = legend.createDiv({ cls: "pie-legend__item" });
      legendRow.createSpan({ cls: "pie-legend__swatch" }).style.background = colors[index % colors.length];
      legendRow.createSpan({ text: `${label}: ${value}` });
    });
  }

  private renderProgressBar(container: HTMLElement, current: number, total: number): void {
    const safeTotal = total === 0 ? 1 : total;
    const bar = container.createDiv({ cls: "progress-bar" });
    const fill = bar.createDiv({ cls: "progress-fill" });
    fill.style.width = `${(current / safeTotal) * 100}%`;
    container.createEl("p", { text: total === 0 ? "Noch keine Notizen im Filter." : `${current}/${total} beherrscht` });
  }

  private renderMiniProgressBar(container: HTMLElement, percentage: number): void {
    const bar = container.createDiv({ cls: "mini-progress-bar" });
    const fill = bar.createDiv({ cls: "mini-progress-fill" });
    fill.style.width = `${Math.max(0, Math.min(percentage, 100))}%`;
  }
}

class VaultDoctorModal extends Modal {
  private plugin: LernfortschrittDashboardPlugin;
  private cardsEl?: HTMLElement;
  private previewEl?: HTMLElement;
  private fixBtn?: HTMLButtonElement;
  private fixFolderBtn?: HTMLButtonElement;
  private folderFilter?: HTMLSelectElement;
  private report?: VaultDoctorReport;
  private selectedFolder = "all";

  constructor(app: Plugin["app"], plugin: LernfortschrittDashboardPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    const shell = contentEl.createDiv({ cls: "live-dashboard-modal" });
    const header = shell.createDiv({ cls: "dashboard-header" });
    header.createEl("h2", { text: "Vault Doctor" });
    header.createEl("p", {
      text: "Kein Orakel, nur ein nüchterner Blick auf Metadaten, Review-Daten und Notizstruktur."
    });

    const cards = shell.createDiv({ cls: "dashboard-charts" });
    const preview = shell.createDiv({ cls: "learning-hub__note-card" });
    this.cardsEl = cards;
    this.previewEl = preview;
    const filterBar = shell.createDiv({ cls: "dashboard-filters" });
    const folderFilter = filterBar.createEl("select", { cls: "dashboard-filter" });
    folderFilter.createEl("option", { value: "all", text: "Alle Ordner" });
    this.folderFilter = folderFilter;
    const actions = shell.createDiv({ cls: "dashboard-actions" });
    const fixBtn = actions.createEl("button", { text: "Quick fixes anwenden" });
    const fixFolderBtn = actions.createEl("button", { text: "Ordner fixen" });
    const saveBtn = actions.createEl("button", { cls: "mod-cta", text: "Bericht schreiben" });
    const closeBtn = actions.createEl("button", { text: "Schließen" });
    this.fixBtn = fixBtn;
    this.fixFolderBtn = fixFolderBtn;
    closeBtn.addEventListener("click", () => this.close());

    await this.refreshReport();

    folderFilter.addEventListener("change", () => {
      this.selectedFolder = folderFilter.value;
      if (this.previewEl && this.report) {
        this.renderIssues(this.previewEl, this.report);
      }
      this.updateFixButtons();
    });
    fixBtn.addEventListener("click", () => void this.applyQuickFixes());
    fixFolderBtn.addEventListener("click", () => void this.applyFolderQuickFixes());

    saveBtn.addEventListener("click", async () => {
      const path = await this.plugin.writeDoctorReport();
      noticeSuccess(`Vault Doctor geschrieben: ${path}`);
      await openOutputFile(this.app, path, true);
      this.close();
    });
  }

  private async refreshReport(): Promise<void> {
    if (!this.cardsEl || !this.previewEl || !this.fixBtn) {
      return;
    }
    this.report = await this.plugin.buildDoctorReport();
    this.renderSummary(this.cardsEl, this.report);
    this.populateFolderFilter(this.report);
    this.renderIssues(this.previewEl, this.report);
    this.updateFixButtons();
  }

  private async applyQuickFixes(): Promise<void> {
    if (!this.fixBtn) {
      return;
    }
    this.fixBtn.disabled = true;
    const scanned = await scanVault(this.app, this.plugin.settings.rootFolders);
    let changed = 0;
    for (const entry of scanned) {
      if (this.selectedFolder !== "all" && !entry.note.folder.startsWith(this.selectedFolder)) {
        continue;
      }
      const result = applyVaultDoctorFixes(entry.note, entry.markdown);
      if (result.applied.length > 0 && result.markdown !== entry.markdown) {
        await this.app.vault.modify(entry.file, result.markdown);
        changed += 1;
      }
    }
    noticeSuccess(changed > 0 ? `${changed} Notizen mit sicheren Quick Fixes aktualisiert.` : "Keine sicheren Quick Fixes gefunden.");
    await this.refreshReport();
  }

  private async applyFolderQuickFixes(): Promise<void> {
    if (!this.fixFolderBtn || this.selectedFolder === "all") {
      return;
    }
    this.fixFolderBtn.disabled = true;
    const scanned = await scanVault(this.app, [this.selectedFolder]);
    let changed = 0;
    for (const entry of scanned) {
      const result = applyVaultDoctorFixes(entry.note, entry.markdown);
      if (result.applied.length > 0 && result.markdown !== entry.markdown) {
        await this.app.vault.modify(entry.file, result.markdown);
        changed += 1;
      }
    }
    noticeSuccess(changed > 0 ? `${changed} Notizen in ${this.selectedFolder} korrigiert.` : `In ${this.selectedFolder} gab es nichts Sicheres zu reparieren.`);
    await this.refreshReport();
  }

  private isFixable(code: string): boolean {
    return [
      "missing-frontmatter",
      "missing-lernstatus",
      "missing-lerntyp",
      "missing-pruefungsrelevanz",
      "invalid-lernstatus",
      "invalid-lerntyp",
      "invalid-pruefungsrelevanz",
      "invalid-review-date",
      "review-order",
      "invalid-score",
      "invalid-time-estimate"
    ].includes(code);
  }

  private renderSummary(container: HTMLElement, report: VaultDoctorReport): void {
    const scanned = container.createDiv({ cls: "chart-card" });
    scanned.createEl("h3", { text: "Überblick" });
    scanned.createEl("p", { text: `${report.scannedNotes} Lernnotizen gescannt` });

    const errors = container.createDiv({ cls: "chart-card" });
    errors.createEl("h3", { text: "Problemdruck" });
    errors.createEl("p", { text: `${report.bySeverity.error} Fehler, ${report.bySeverity.warning} Warnungen, ${report.bySeverity.info} Hinweise` });

    const top = container.createDiv({ cls: "chart-card" });
    top.createEl("h3", { text: "Was gerade am häufigsten auffällt" });
    const list = top.createEl("ul", { cls: "learning-hub__issues" });
    const topCodes = Object.entries(report.byCode).sort((left, right) => right[1] - left[1]).slice(0, 5);
    if (topCodes.length === 0) {
      list.createEl("li", { text: "Nichts Auffälliges gefunden." });
      return;
    }
    topCodes.forEach(([code, count]) => list.createEl("li", { text: `${code}: ${count}` }));
  }

  private renderIssues(container: HTMLElement, report: VaultDoctorReport): void {
    container.empty();
    const filteredIssues = report.issues.filter((issue) => this.selectedFolder === "all" || issue.path.startsWith(`${this.selectedFolder}/`) || issue.path === this.selectedFolder);
    container.createDiv({ cls: "learning-hub__eyebrow", text: "Einzelbefunde" });
    container.createEl("h3", { text: filteredIssues.length === 0 ? "Sieht sauber aus" : "Wo es gerade hakt" });
    if (filteredIssues.length === 0) {
      container.createEl("p", { text: "Keine offensichtlichen Brüche gefunden. Das Material wirkt für die aktuelle Plugin-Logik stabil genug." });
      return;
    }
    const list = container.createDiv({ cls: "learning-hub__doctor-list" });
    filteredIssues.slice(0, 20).forEach((issue) => {
      const item = list.createDiv({ cls: `learning-hub__doctor-item learning-hub__doctor-item--${issue.severity}` });
      item.createDiv({ cls: "learning-hub__card-kicker", text: `${issue.severity.toUpperCase()} · ${issue.code}` });
      item.createEl("h4", { text: issue.title });
      item.createEl("p", { text: issue.message });
      item.createEl("small", { text: issue.path });
      const actions = item.createDiv({ cls: "learning-hub__doctor-actions" });
      const fixOneBtn = actions.createEl("button", { text: "Diesen Befund fixen" });
      fixOneBtn.disabled = !this.isFixable(issue.code);
      fixOneBtn.addEventListener("click", () => void this.applySingleIssueFix(issue.path));
    });
    if (filteredIssues.length > 20) {
      container.createEl("p", { text: `Es gibt noch ${filteredIssues.length - 20} weitere Befunde. Schreib den Bericht, wenn du alles als Markdown haben willst.` });
    }
  }

  private populateFolderFilter(report: VaultDoctorReport): void {
    if (!this.folderFilter) {
      return;
    }
    const previous = this.selectedFolder;
    this.folderFilter.empty();
    this.folderFilter.createEl("option", { value: "all", text: "Alle Ordner" });
    const folders = new Set(
      report.issues.map((issue) => {
        const parts = issue.path.split("/");
        return parts.length > 1 ? parts.slice(0, -1).join("/") : "/";
      })
    );
    [...folders].sort().forEach((folder) => {
      this.folderFilter!.createEl("option", { value: folder, text: folder });
    });
    const nextValue = folders.has(previous) || previous === "all" ? previous : "all";
    this.selectedFolder = nextValue;
    this.folderFilter.value = nextValue;
  }

  private updateFixButtons(): void {
    if (!this.report) {
      return;
    }
    const relevant = this.report.issues.filter((issue) => (this.selectedFolder === "all" || issue.path.startsWith(`${this.selectedFolder}/`) || issue.path === this.selectedFolder) && this.isFixable(issue.code));
    if (this.fixBtn) {
      this.fixBtn.disabled = relevant.length === 0;
    }
    if (this.fixFolderBtn) {
      this.fixFolderBtn.disabled = this.selectedFolder === "all" || relevant.length === 0;
    }
  }

  private async applySingleIssueFix(path: string): Promise<void> {
    const file = this.app.vault.getMarkdownFiles().find((entry) => entry.path === path);
    if (!file) {
      new Notice(`Datei nicht gefunden: ${path}`);
      return;
    }
    const markdown = await this.app.vault.cachedRead(file);
    const note = (await scanVault(this.app, [])).find((entry) => entry.note.path === path)?.note;
    if (!note) {
      new Notice(`Notiz konnte nicht geladen werden: ${path}`);
      return;
    }
    const result = applyVaultDoctorFixes(note, markdown);
    if (result.applied.length === 0 || result.markdown === markdown) {
      new Notice("Hier gab es keinen sicheren Quick Fix.");
      return;
    }
    await this.app.vault.modify(file, result.markdown);
    noticeSuccess(`${result.applied.join(", ")}.`);
    await this.refreshReport();
  }
}
