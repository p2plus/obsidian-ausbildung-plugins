import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";
import { LearningNote, parseLearningNote, updateYamlField } from "@ausbildung/shared-core";

export interface BasePluginSettings {
  rootFolders: string[];
  dashboardFolder: string;
  periodicNotesFolder: string;
  useDataview: boolean;
}

export const DEFAULT_BASE_SETTINGS: BasePluginSettings = {
  rootFolders: ["000_Ausbildung_Industriekaufmann_2026", "quizzes"],
  dashboardFolder: "_plugin_outputs",
  periodicNotesFolder: "Periodic/Daily",
  useDataview: true
};

export async function scanVault(app: App, rootFolders: string[]): Promise<Array<{ note: LearningNote; file: TFile; markdown: string }>> {
  const files = app.vault.getMarkdownFiles().filter((file) => rootFolders.some((folder) => file.path.startsWith(folder)));
  const results: Array<{ note: LearningNote; file: TFile; markdown: string }> = [];
  for (const file of files) {
    const markdown = await app.vault.cachedRead(file);
    results.push({
      note: parseLearningNote(file.path, markdown),
      file,
      markdown
    });
  }
  return results;
}

export async function ensureFolder(app: App, folderPath: string): Promise<void> {
  const parts = folderPath.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
}

export async function writePluginOutput(app: App, folderPath: string, fileName: string, content: string): Promise<string> {
  await ensureFolder(app, folderPath);
  const path = `${folderPath}/${fileName}`;
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    await app.vault.modify(existing, content);
  } else {
    await app.vault.create(path, content);
  }
  return path;
}

export async function updateLearningStatus(app: App, file: TFile, status: string): Promise<void> {
  const markdown = await app.vault.cachedRead(file);
  const updated = updateYamlField(markdown, "lernstatus", status);
  await app.vault.modify(file, updated);
}

export function getDataviewApi(plugin: Plugin, useDataview: boolean): unknown | null {
  if (!useDataview) {
    return null;
  }
  const candidate = (plugin.app as App & { plugins?: { plugins?: Record<string, { api?: unknown }> } }).plugins?.plugins?.dataview?.api;
  return candidate ?? null;
}

export function noticeSuccess(message: string): void {
  new Notice(message, 4000);
}

export class BaseSettingsTab<T extends BasePluginSettings> extends PluginSettingTab {
  plugin: Plugin & { settings: T; saveSettings: () => Promise<void> };

  constructor(app: App, plugin: Plugin & { settings: T; saveSettings: () => Promise<void> }) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: this.plugin.manifest.name });

    new Setting(containerEl)
      .setName("Root folders")
      .setDesc("Comma-separated root folders to scan for notes.")
      .addText((text) =>
        text.setValue(this.plugin.settings.rootFolders.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.rootFolders = value.split(",").map((entry) => entry.trim()).filter(Boolean);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Output folder")
      .setDesc("Where generated markdown dashboards and plans should be written.")
      .addText((text) =>
        text.setValue(this.plugin.settings.dashboardFolder)
          .onChange(async (value) => {
            this.plugin.settings.dashboardFolder = value.trim() || "_plugin_outputs";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Periodic notes folder")
      .setDesc("Folder used for review queues and study journal integration.")
      .addText((text) =>
        text.setValue(this.plugin.settings.periodicNotesFolder)
          .onChange(async (value) => {
            this.plugin.settings.periodicNotesFolder = value.trim() || "Periodic/Daily";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Prefer Dataview")
      .setDesc("Use Dataview when available, but keep a safe fallback.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.useDataview)
          .onChange(async (value) => {
            this.plugin.settings.useDataview = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

