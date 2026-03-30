import { Modal, Plugin, Setting } from "obsidian";
import { buildKeywordGapAiRequest, computeKeywordCoverage, normalizeKeywordGaps } from "@ausbildung/shared-core";
import { BasePluginSettings, BaseSettingsTab, DEFAULT_BASE_SETTINGS, getAiProviderConfig, runAiRequest, scanVault, writePluginOutput } from "@ausbildung/plugin-kit";

interface KeywordSettings extends BasePluginSettings {
  keywords: string[];
  aliasGroups: string[];
  minHits: number;
}

const DEFAULT_SETTINGS: KeywordSettings = {
  ...DEFAULT_BASE_SETTINGS,
  keywords: ["Deckungsbeitrag", "Bilanz", "BBiG", "SWOT"],
  aliasGroups: ["Deckungsbeitrag:DB, contribution margin", "Bilanz:balance sheet"],
  minHits: 1
};

class KeywordSettingsTab extends BaseSettingsTab<KeywordSettings> {
  override display(): void {
    super.display();
    const { containerEl } = this;
    containerEl.createEl("h3", { text: "Keyword Tracking" });
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

    new Setting(containerEl)
      .setName("Alias groups")
      .setDesc("One group per line: canonical:alias1,alias2")
      .addTextArea((text) =>
        text.setValue(this.plugin.settings.aliasGroups.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.aliasGroups = value.split("\n").map((entry) => entry.trim()).filter(Boolean);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Minimum hits before warning")
      .addText((text) =>
        text.setValue(String(this.plugin.settings.minHits))
          .onChange(async (value) => {
            this.plugin.settings.minHits = Number(value) || 1;
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
    this.addCommand({
      id: "preview-keyword-report",
      name: "Keywords: Vorschau oeffnen",
      callback: () => void this.openPreview()
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
    const markdown = await this.buildReport();
    await writePluginOutput(this.app, this.settings.dashboardFolder, "keyword-coverage.md", markdown);
  }

  private async buildReport(): Promise<string> {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    const expandedKeywords = this.expandKeywords();
    const coverage = computeKeywordCoverage(scanned, expandedKeywords);
    let markdown = [
      "# IHK Keyword Coverage",
      "",
      ...coverage.map((entry) => `- ${entry.keyword}: ${entry.hits} Treffer${entry.hits < this.settings.minHits ? " (unterrepraesentiert)" : ""}`)
    ].join("\n");

    const provider = getAiProviderConfig(this.settings);
    if (provider) {
      try {
        const response = await runAiRequest(provider, buildKeywordGapAiRequest(
          coverage,
          scanned.slice(0, 12).map((entry) => ({ path: entry.note.path, markdown: entry.markdown }))
        ));
        const gaps = normalizeKeywordGaps(response.parsed);
        if (gaps.length > 0) {
          markdown += [
            "",
            "## Themenluecken",
            ...gaps.flatMap((gap) => [
              `- ${gap.topic}: ${gap.whyItMatters}`,
              `  - Vorschlaege: ${gap.suggestedKeywords.join(", ")}`
            ])
          ].join("\n");
        }
      } catch (error) {
        markdown += `\n\n## AI-Hinweis\n- Themenanalyse nicht verfuegbar: ${String(error)}`;
      }
    }

    return markdown;
  }

  private expandKeywords(): string[] {
    const expanded = new Set(this.settings.keywords);
    for (const group of this.settings.aliasGroups) {
      const [canonical, aliasesRaw] = group.split(":");
      if (canonical?.trim()) {
        expanded.add(canonical.trim());
      }
      if (aliasesRaw) {
        aliasesRaw.split(",").map((entry) => entry.trim()).filter(Boolean).forEach((entry) => expanded.add(entry));
      }
    }
    return [...expanded];
  }

  private openPreview(): void {
    new KeywordPreviewModal(this.app, this).open();
  }
}

class KeywordPreviewModal extends Modal {
  private plugin: KeywordTrackerPlugin;

  constructor(app: Plugin["app"], plugin: KeywordTrackerPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Keyword Coverage Preview" });
    const preview = contentEl.createEl("pre");
    preview.setText("Loading...");
    try {
      const markdown = await this.plugin["buildReport"]();
      preview.setText(markdown);
      const button = contentEl.createEl("button", { text: "Bericht speichern" });
      button.addEventListener("click", async () => {
        await this.plugin["generateReport"]();
        this.close();
      });
    } catch (error) {
      preview.setText(`Bericht konnte nicht erzeugt werden: ${String(error)}`);
    }
  }
}
