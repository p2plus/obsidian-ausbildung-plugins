import { Plugin, PluginSettingTab, Setting } from "obsidian";
import { computeKeywordCoverage } from "@ausbildung/shared-core";
import { BasePluginSettings, DEFAULT_BASE_SETTINGS, scanVault, writePluginOutput } from "@ausbildung/plugin-kit";

interface KeywordSettings extends BasePluginSettings {
  keywords: string[];
}

const DEFAULT_SETTINGS: KeywordSettings = {
  ...DEFAULT_BASE_SETTINGS,
  keywords: ["Deckungsbeitrag", "Bilanz", "BBiG", "SWOT"]
};

class KeywordSettingsTab extends PluginSettingTab {
  plugin: KeywordTrackerPlugin;

  constructor(app: Plugin["app"], plugin: KeywordTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName("Keywords")
      .setDesc("Comma-separated IHK-relevant keywords")
      .addText((text) =>
        text.setValue(this.plugin.settings.keywords.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.keywords = value.split(",").map((entry) => entry.trim()).filter(Boolean);
            await this.plugin.saveSettings();
          })
      );
  }
}

export default class KeywordTrackerPlugin extends Plugin {
  settings!: KeywordSettings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addCommand({
      id: "generate-keyword-report",
      name: "Keywords: Abdeckungsbericht generieren",
      callback: () => void this.generateReport()
    });
    this.addSettingTab(new KeywordSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async generateReport(): Promise<void> {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    const coverage = computeKeywordCoverage(scanned, this.settings.keywords);
    const markdown = [
      "# IHK Keyword Coverage",
      "",
      ...coverage.map((entry) => `- ${entry.keyword}: ${entry.hits} Treffer${entry.hits === 0 ? " (unterrepraesentiert)" : ""}`)
    ].join("\n");
    await writePluginOutput(this.app, this.settings.dashboardFolder, "keyword-coverage.md", markdown);
  }
}
