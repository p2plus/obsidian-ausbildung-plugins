import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from "obsidian";
import { AiGenerationRequest, AiGenerationResult, AiProvider, AiProviderConfig, LearningNote, parseLearningNote, safeJsonParseWithRepair, updateYamlField } from "@ausbildung/shared-core";

export interface BasePluginSettings {
  rootFolders: string[];
  dashboardFolder: string;
  periodicNotesFolder: string;
  useDataview: boolean;
  aiEnabled: boolean;
  aiProvider: AiProvider;
  openAiApiKey: string;
  openAiModel: string;
  openRouterApiKey: string;
  openRouterModel: string;
  customApiKey: string;
  customModel: string;
  customEndpoint: string;
  requestTimeoutMs: number;
  aiConnectionStatus: "unknown" | "ok" | "error";
  aiConnectionMessage: string;
  aiConnectionTestedAt: string;
}

export const DEFAULT_BASE_SETTINGS: BasePluginSettings = {
  rootFolders: ["000_Ausbildung_Industriekaufmann_2026", "quizzes"],
  dashboardFolder: "_plugin_outputs",
  periodicNotesFolder: "Periodic/Daily",
  useDataview: true,
  aiEnabled: false,
  aiProvider: "openai",
  openAiApiKey: "",
  openAiModel: "gpt-4.1-mini",
  openRouterApiKey: "",
  openRouterModel: "openai/gpt-4.1-mini",
  customApiKey: "",
  customModel: "gpt-4.1-mini",
  customEndpoint: "https://api.openai.com/v1/chat/completions",
  requestTimeoutMs: 45000,
  aiConnectionStatus: "unknown",
  aiConnectionMessage: "No connection test run yet.",
  aiConnectionTestedAt: ""
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

export async function openOutputFile(app: App, path: string, newLeaf = false): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    return;
  }
  const leaf = app.workspace.getLeaf(newLeaf) as WorkspaceLeaf;
  await leaf.openFile(file);
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

export function noticeError(message: string): void {
  new Notice(message, 7000);
}

export function getAiProviderConfig(settings: BasePluginSettings): AiProviderConfig | null {
  if (!settings.aiEnabled) {
    return null;
  }

  if (settings.aiProvider === "openai" && settings.openAiApiKey.trim()) {
    return {
      provider: "openai",
      apiKey: settings.openAiApiKey.trim(),
      model: settings.openAiModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }

  if (settings.aiProvider === "openrouter" && settings.openRouterApiKey.trim()) {
    return {
      provider: "openrouter",
      apiKey: settings.openRouterApiKey.trim(),
      model: settings.openRouterModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }

  if (settings.aiProvider === "custom" && settings.customApiKey.trim() && settings.customEndpoint.trim()) {
    return {
      provider: "custom",
      apiKey: settings.customApiKey.trim(),
      model: settings.customModel.trim(),
      endpoint: settings.customEndpoint.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }

  return null;
}

function getProviderEndpoint(config: AiProviderConfig): string {
  if (config.provider === "openai") {
    return "https://api.openai.com/v1/chat/completions";
  }
  if (config.provider === "openrouter") {
    return "https://openrouter.ai/api/v1/chat/completions";
  }
  return config.endpoint ?? "https://api.openai.com/v1/chat/completions";
}

export async function runAiRequest<T = unknown>(config: AiProviderConfig, request: AiGenerationRequest): Promise<AiGenerationResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 45000);
  try {
    const body: Record<string, unknown> = {
      model: config.model,
      temperature: request.temperature ?? 0.2,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt }
      ]
    };
    if (request.responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    };
    if (config.provider === "openrouter") {
      headers["HTTP-Referer"] = "https://github.com/p2plus/obsidian-ausbildung-plugins";
      headers["X-Title"] = "Obsidian Ausbildung Plugins";
    }

    const response = await fetch(getProviderEndpoint(config), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const payload = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      const message =
        typeof payload.error === "object" && payload.error && "message" in payload.error
          ? String((payload.error as Record<string, unknown>).message)
          : providerErrorMessage(config.provider, response.status);
      throw new Error(message);
    }
    const content = (
      (payload.choices as Array<Record<string, unknown>> | undefined)?.[0]?.message as Record<string, unknown> | undefined
    )?.content;
    const rawText = typeof content === "string" ? content : "";
    const parsed = request.responseFormat === "json" ? safeJsonParseWithRepair<T>(rawText) : undefined;
    return {
      provider: config.provider,
      model: config.model,
      rawText,
      parsed
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function safeJsonParse<T>(rawText: string): T | undefined {
  try {
    return JSON.parse(rawText) as T;
  } catch {
    return undefined;
  }
}

function providerErrorMessage(provider: AiProvider, status: number): string {
  if (status === 401) {
    return `${providerLabel(provider)} rejected the API key.`;
  }
  if (status === 403) {
    return `${providerLabel(provider)} refused the request. Check account access or model permissions.`;
  }
  if (status === 404) {
    return `${providerLabel(provider)} endpoint or model was not found.`;
  }
  if (status === 429) {
    return `${providerLabel(provider)} rate limit reached.`;
  }
  if (status >= 500) {
    return `${providerLabel(provider)} returned a server error (${status}).`;
  }
  return `${providerLabel(provider)} request failed with HTTP ${status}.`;
}

function providerLabel(provider: AiProvider): string {
  if (provider === "openai") return "OpenAI";
  if (provider === "openrouter") return "OpenRouter";
  return "Custom provider";
}

export async function testAiProviderConnection(config: AiProviderConfig): Promise<string> {
  const result = await runAiRequest<{ ok?: boolean }>(config, {
    systemPrompt: "You are a connectivity check. Return strict JSON only.",
    userPrompt: JSON.stringify({
      task: "Return {\"ok\": true} and nothing else."
    }),
    temperature: 0,
    responseFormat: "json"
  });
  if (result.parsed && typeof result.parsed === "object" && "ok" in result.parsed) {
    return `Connected to ${providerLabel(config.provider)} using ${config.model}.`;
  }
  return `Connected to ${providerLabel(config.provider)} using ${config.model}, but the response format was unusual.`;
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

    containerEl.createEl("h3", { text: "AI / BYOK" });

    new Setting(containerEl)
      .setName("Enable AI features")
      .setDesc("Use BYOK-backed AI features where the plugin supports them.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.aiEnabled)
          .onChange(async (value) => {
            this.plugin.settings.aiEnabled = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName("AI provider")
      .setDesc("Choose the provider for AI-backed features.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("openai", "OpenAI")
          .addOption("openrouter", "OpenRouter")
          .addOption("custom", "Custom OpenAI-compatible")
          .setValue(this.plugin.settings.aiProvider)
          .onChange(async (value) => {
            this.plugin.settings.aiProvider = value as AiProvider;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName("Request timeout")
      .setDesc("Timeout in milliseconds for provider requests.")
      .addText((text) =>
        text.setValue(String(this.plugin.settings.requestTimeoutMs))
          .onChange(async (value) => {
            this.plugin.settings.requestTimeoutMs = Number(value) || 45000;
            await this.plugin.saveSettings();
          })
      );

    if (this.plugin.settings.aiProvider === "openai") {
      new Setting(containerEl)
        .setName("OpenAI API key")
        .setDesc("Stored in Obsidian plugin settings.")
        .addText((text) => {
          text.inputEl.type = "password";
          return text
            .setPlaceholder("sk-...")
            .setValue(this.plugin.settings.openAiApiKey)
            .onChange(async (value) => {
              this.plugin.settings.openAiApiKey = value;
              await this.plugin.saveSettings();
            });
        });
      new Setting(containerEl)
        .setName("OpenAI model")
        .addText((text) =>
          text.setValue(this.plugin.settings.openAiModel)
            .onChange(async (value) => {
              this.plugin.settings.openAiModel = value.trim() || "gpt-4.1-mini";
              await this.plugin.saveSettings();
            })
        );
    }

    if (this.plugin.settings.aiProvider === "openrouter") {
      new Setting(containerEl)
        .setName("OpenRouter API key")
        .setDesc("Stored in Obsidian plugin settings.")
        .addText((text) => {
          text.inputEl.type = "password";
          return text
            .setPlaceholder("sk-or-...")
            .setValue(this.plugin.settings.openRouterApiKey)
            .onChange(async (value) => {
              this.plugin.settings.openRouterApiKey = value;
              await this.plugin.saveSettings();
            });
        });
      new Setting(containerEl)
        .setName("OpenRouter model")
        .addText((text) =>
          text.setValue(this.plugin.settings.openRouterModel)
            .onChange(async (value) => {
              this.plugin.settings.openRouterModel = value.trim() || "openai/gpt-4.1-mini";
              await this.plugin.saveSettings();
            })
        );
    }

    if (this.plugin.settings.aiProvider === "custom") {
      new Setting(containerEl)
        .setName("Custom endpoint")
        .setDesc("OpenAI-compatible chat completions endpoint.")
        .addText((text) =>
          text.setValue(this.plugin.settings.customEndpoint)
            .onChange(async (value) => {
              this.plugin.settings.customEndpoint = value.trim();
              await this.plugin.saveSettings();
            })
        );
      new Setting(containerEl)
        .setName("Custom API key")
        .setDesc("Stored in Obsidian plugin settings.")
        .addText((text) => {
          text.inputEl.type = "password";
          return text
            .setPlaceholder("API key")
            .setValue(this.plugin.settings.customApiKey)
            .onChange(async (value) => {
              this.plugin.settings.customApiKey = value;
              await this.plugin.saveSettings();
            });
        });
      new Setting(containerEl)
        .setName("Custom model")
        .addText((text) =>
          text.setValue(this.plugin.settings.customModel)
            .onChange(async (value) => {
              this.plugin.settings.customModel = value.trim() || "gpt-4.1-mini";
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Test AI connection")
      .setDesc("Checks the currently selected provider, model, and key.")
      .addButton((button) =>
        button.setButtonText("Run test")
          .onClick(async () => {
            const config = getAiProviderConfig(this.plugin.settings);
            if (!config) {
              noticeError("AI is disabled or the selected provider is missing required credentials.");
              return;
            }
            button.setDisabled(true);
            button.setButtonText("Testing...");
            try {
              const message = await testAiProviderConnection(config);
              this.plugin.settings.aiConnectionStatus = "ok";
              this.plugin.settings.aiConnectionMessage = message;
              this.plugin.settings.aiConnectionTestedAt = new Date().toISOString();
              await this.plugin.saveSettings();
              noticeSuccess(message);
              this.display();
            } catch (error) {
              this.plugin.settings.aiConnectionStatus = "error";
              this.plugin.settings.aiConnectionMessage = String(error);
              this.plugin.settings.aiConnectionTestedAt = new Date().toISOString();
              await this.plugin.saveSettings();
              noticeError(`AI connection test failed: ${String(error)}`);
              this.display();
            } finally {
              button.setDisabled(false);
              button.setButtonText("Run test");
            }
          })
      );

    const status = this.plugin.settings.aiConnectionStatus;
    const statusText =
      status === "ok"
        ? `Last test passed. ${this.plugin.settings.aiConnectionMessage}`
        : status === "error"
          ? `Last test failed. ${this.plugin.settings.aiConnectionMessage}`
          : this.plugin.settings.aiConnectionMessage;
    containerEl.createEl("p", {
      text: this.plugin.settings.aiConnectionTestedAt
        ? `${statusText} (${this.plugin.settings.aiConnectionTestedAt})`
        : statusText
    });
  }
}
