import { Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { generateStudyPlan, renderStudyPlanMarkdown } from "@ausbildung/shared-core";
import { BasePluginSettings, DEFAULT_BASE_SETTINGS, noticeSuccess, scanVault, writePluginOutput } from "@ausbildung/plugin-kit";

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
    this.addRibbonIcon("calendar-days", "Lernplan generieren", () => void this.generatePlan());
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
    this.addSettingTab(new LernplanSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async buildPlanMarkdown(): Promise<string> {
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
    return renderStudyPlanMarkdown(tasks);
  }

  private async generatePlan(): Promise<void> {
    const markdown = await this.buildPlanMarkdown();
    const path = await writePluginOutput(this.app, this.settings.dashboardFolder, this.settings.outputFileName, markdown);
    noticeSuccess(`Lernplan geschrieben: ${path}`);
  }

  private async writeDailyPlan(): Promise<void> {
    const markdown = await this.buildPlanMarkdown();
    const fileName = `${new Date().toISOString().slice(0, 10)}-study-plan.md`;
    const path = await writePluginOutput(this.app, this.settings.periodicNotesFolder, fileName, markdown);
    noticeSuccess(`Tagesplan geschrieben: ${path}`);
  }
}
