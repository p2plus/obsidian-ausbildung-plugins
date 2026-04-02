import { Modal, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { generateStudyPlan, renderStudyPlanMarkdown } from "@ausbildung/shared-core";
import { BasePluginSettings, DEFAULT_BASE_SETTINGS, getAiProviderConfig, noticeSuccess, openOutputFile, runAiRequest, scanVault, writePluginOutput } from "@ausbildung/plugin-kit";

interface PlannerPluginSettings extends BasePluginSettings {
  examDate: string;
  weeklyHours: number;
  holidays: string[];
  vacationDays: string[];
  outputFileName: string;
}

const DEFAULT_SETTINGS: PlannerPluginSettings = {
  ...DEFAULT_BASE_SETTINGS,
  examDate: "2026-11-15",
  weeklyHours: 6,
  holidays: [],
  vacationDays: [],
  outputFileName: "lernplan.md"
};

class LernplanSettingsTab extends PluginSettingTab {
  plugin: LernplanGeneratorPlugin;

  constructor(app: Plugin["app"], plugin: LernplanGeneratorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Lernplan Generator" });

    new Setting(containerEl)
      .setName("Exam date")
      .addText((text) =>
        text.setPlaceholder("YYYY-MM-DD")
          .setValue(this.plugin.settings.examDate)
          .onChange(async (value) => {
            this.plugin.settings.examDate = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Weekly hours")
      .addText((text) =>
        text.setValue(String(this.plugin.settings.weeklyHours))
          .onChange(async (value) => {
            this.plugin.settings.weeklyHours = Number(value) || 6;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Holidays")
      .setDesc("Comma-separated YYYY-MM-DD dates")
      .addText((text) =>
        text.setValue(this.plugin.settings.holidays.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.holidays = value.split(",").map((entry) => entry.trim()).filter(Boolean);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Vacation days")
      .setDesc("Comma-separated YYYY-MM-DD dates")
      .addText((text) =>
        text.setValue(this.plugin.settings.vacationDays.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.vacationDays = value.split(",").map((entry) => entry.trim()).filter(Boolean);
            await this.plugin.saveSettings();
          })
      );
  }
}

export default class LernplanGeneratorPlugin extends Plugin {
  settings!: PlannerPluginSettings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addRibbonIcon("calendar-days", "Lernplan Vorschau oeffnen", () => void this.openPlanPreview());
    this.addCommand({
      id: "generate-study-plan",
      name: "Lernplan: Plan generieren",
      callback: () => void this.generatePlan()
    });
    this.addCommand({
      id: "generate-study-plan-periodic",
      name: "Lernplan: Heute in Periodic Notes schreiben",
      callback: () => void this.writeDailyPlan()
    });
    this.addCommand({
      id: "preview-study-plan",
      name: "Lernplan: Interaktive Vorschau",
      callback: () => void this.openPlanPreview()
    });
    this.addSettingTab(new LernplanSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async buildPlanMarkdown(): Promise<string> {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    const tasks = generateStudyPlan(
      scanned.map((entry) => entry.note),
      {
        examDate: this.settings.examDate,
        weeklyHours: this.settings.weeklyHours,
        holidays: this.settings.holidays,
        vacationDays: this.settings.vacationDays
      }
    );
    let markdown = renderStudyPlanMarkdown(tasks);

    // Add AI suggestions if available
    const provider = getAiProviderConfig(this.settings);
    if (provider) {
      try {
        const aiResponse = await runAiRequest(provider, {
          systemPrompt: "Du bist ein Lernplan-Optimierer. Gib kurze, hilfreiche Verbesserungsvorschläge für den Lernplan.",
          userPrompt: `Analysiere diesen Lernplan und gib 2-3 konkrete Verbesserungsvorschläge:\n\n${markdown.slice(0, 2000)}`,
          temperature: 0.3
        });
        markdown += `\n\n## AI-Vorschläge\n${aiResponse.rawText}`;
      } catch (error) {
        // Ignore AI errors
      }
    }

    return markdown;
  }

  async generatePlan(): Promise<void> {
    const markdown = await this.buildPlanMarkdown();
    const path = await writePluginOutput(this.app, this.settings.dashboardFolder, this.settings.outputFileName, markdown);
    noticeSuccess(`Lernplan geschrieben: ${path}`);
    await openOutputFile(this.app, path, true);
  }

  private async writeDailyPlan(): Promise<void> {
    const markdown = await this.buildPlanMarkdown();
    const fileName = `${new Date().toISOString().slice(0, 10)}-study-plan.md`;
    const path = await writePluginOutput(this.app, this.settings.periodicNotesFolder, fileName, markdown);
    noticeSuccess(`Tagesplan geschrieben: ${path}`);
    await openOutputFile(this.app, path, true);
  }

  private openPlanPreview(): void {
    new PlanPreviewModal(this.app, this).open();
  }
}

interface StudyTask {
  date: string;
  topics: string[];
  hours: number;
  focus: string;
}

class PlanPreviewModal extends Modal {
  private plugin: LernplanGeneratorPlugin;
  private tasks: StudyTask[] = [];
  private currentMonth: Date;

  constructor(app: Plugin["app"], plugin: LernplanGeneratorPlugin) {
    super(app);
    this.plugin = plugin;
    this.currentMonth = new Date();
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    const shell = contentEl.createDiv({ cls: "plan-preview-modal" });

    // Header
    const header = shell.createDiv({ cls: "plan-header" });
    header.createEl("h2", { text: "Lernplan Vorschau" });
    const nav = header.createDiv({ cls: "plan-nav" });
    const prevBtn = nav.createEl("button", { text: "◀" });
    const monthDisplay = nav.createEl("span", { text: this.currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) });
    const nextBtn = nav.createEl("button", { text: "▶" });

    // Calendar
    const calendar = shell.createDiv({ cls: "plan-calendar" });
    this.renderCalendar(calendar);

    // Actions
    const actions = shell.createDiv({ cls: "plan-actions" });
    const generateBtn = actions.createEl("button", { cls: "mod-cta", text: "Plan generieren" });
    const closeBtn = actions.createEl("button", { text: "Schließen" });

    // Load tasks
    try {
      const markdown = await this.plugin.buildPlanMarkdown();
      this.tasks = this.parseTasks(markdown);
      this.renderCalendar(calendar);
      generateBtn.addEventListener("click", async () => {
        await this.plugin.generatePlan();
        this.close();
      });
    } catch (error) {
      calendar.setText(`Fehler: ${String(error)}`);
    }

    prevBtn.addEventListener("click", () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
      monthDisplay.setText(this.currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }));
      this.renderCalendar(calendar);
    });

    nextBtn.addEventListener("click", () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
      monthDisplay.setText(this.currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }));
      this.renderCalendar(calendar);
    });

    closeBtn.addEventListener("click", () => this.close());
  }

  private parseTasks(markdown: string): StudyTask[] {
    const lines = markdown.split('\n');
    const tasks: StudyTask[] = [];
    let currentTask: Partial<StudyTask> | null = null;
    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentTask && currentTask.date) {
          tasks.push(currentTask as StudyTask);
        }
        const dateMatch = line.match(/## (\d{4}-\d{2}-\d{2})/);
        currentTask = dateMatch ? { date: dateMatch[1], topics: [], hours: 0, focus: '' } : null;
      } else if (currentTask && line.startsWith('- ')) {
        const topicMatch = line.match(/- (.+)/);
        if (topicMatch) {
          currentTask.topics!.push(topicMatch[1]);
        }
      }
    }
    if (currentTask && currentTask.date) {
      tasks.push(currentTask as StudyTask);
    }
    return tasks;
  }

  private renderCalendar(container: HTMLElement): void {
    container.empty();
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay()); // Start from Sunday

    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const header = container.createDiv({ cls: "calendar-header" });
    weekdays.forEach(day => header.createEl("div", { text: day, cls: "calendar-day-header" }));

    const grid = container.createDiv({ cls: "calendar-grid" });
    let current = new Date(startDate);
    while (current <= lastDay || current.getDay() !== 0) {
      const dayEl = grid.createDiv({ cls: "calendar-day" });
      if (current.getMonth() === month) {
        dayEl.addClass("current-month");
        dayEl.setText(current.getDate().toString());
        const dateStr = current.toISOString().slice(0, 10);
        const task = this.tasks.find(t => t.date === dateStr);
        if (task) {
          dayEl.addClass("has-task");
          dayEl.setAttribute("title", `${task.topics.length} Themen`);
        }
      } else {
        dayEl.addClass("other-month");
      }
      current.setDate(current.getDate() + 1);
    }
  }
}
