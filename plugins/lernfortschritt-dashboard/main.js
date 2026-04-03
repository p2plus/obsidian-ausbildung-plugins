"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LernfortschrittDashboardPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// ../../packages/shared-core/src/ai.ts
function extractJsonObject(rawText) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return rawText.slice(start, end + 1);
}
function safeJsonParseWithRepair(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const extracted = extractJsonObject(rawText);
    if (!extracted) {
      return void 0;
    }
    try {
      return JSON.parse(extracted);
    } catch {
      return void 0;
    }
  }
}

// ../../packages/shared-core/src/notes.ts
var FRONTMATTER_DELIMITER = "---";
function parseScalarValue(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map((part) => part.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}
function parseFrontmatter(markdown) {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return {};
  }
  const result = {};
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === FRONTMATTER_DELIMITER) {
      break;
    }
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    result[key] = parseScalarValue(value);
  }
  return result;
}
function deriveModuleId(path, existing) {
  if (existing) {
    return existing;
  }
  const parts = path.split("/");
  const direct = parts.find((part) => /^LF\d+/i.test(part) || /^X\d+/i.test(part));
  if (direct) {
    return direct.match(/^(LF\d+|X\d+)/i)?.[1]?.toUpperCase() ?? "UNSORTIERT";
  }
  return "UNSORTIERT";
}
function parseLearningNote(path, markdown) {
  const fm = parseFrontmatter(markdown);
  const lines = markdown.split(/\r?\n/);
  const title = lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") ?? path.split("/").pop() ?? path;
  const folder = path.split("/").slice(0, -1).join("/");
  return {
    path,
    title,
    folder,
    status: typeof fm.status === "string" ? fm.status : void 0,
    ausbildungsjahr: typeof fm.ausbildungsjahr === "string" ? fm.ausbildungsjahr : void 0,
    lernstatus: typeof fm.lernstatus === "string" ? fm.lernstatus : void 0,
    lerntyp: typeof fm.lerntyp === "string" ? fm.lerntyp : void 0,
    modul_id: deriveModuleId(path, typeof fm.modul_id === "string" ? fm.modul_id : void 0),
    pruefungsrelevanz: typeof fm.pruefungsrelevanz === "string" ? fm.pruefungsrelevanz : void 0,
    last_review: typeof fm.last_review === "string" ? fm.last_review : void 0,
    next_review: typeof fm.next_review === "string" ? fm.next_review : void 0,
    difficulty: typeof fm.difficulty === "number" ? fm.difficulty : void 0,
    score_last: typeof fm.score_last === "number" ? fm.score_last : void 0,
    score_best: typeof fm.score_best === "number" ? fm.score_best : void 0,
    time_estimate_min: typeof fm.time_estimate_min === "number" ? fm.time_estimate_min : void 0,
    badge: typeof fm.badge === "string" ? fm.badge : void 0,
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : void 0
  };
}
function updateYamlField(markdown, key, value) {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return `---
${key}: "${value}"
---

${markdown}`;
  }
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === FRONTMATTER_DELIMITER) {
      lines.splice(index, 0, `${key}: "${value}"`);
      return lines.join("\n");
    }
    if (lines[index].startsWith(`${key}:`)) {
      lines[index] = `${key}: "${value}"`;
      return lines.join("\n");
    }
  }
  return markdown;
}
function parseDateOnly(dateText) {
  return /* @__PURE__ */ new Date(`${dateText}T12:00:00`);
}

// ../../packages/shared-core/src/study-material.ts
function cleanInlineMarkdown(text) {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").trim();
}
function normalizeSentence(text) {
  return cleanInlineMarkdown(text).replace(/^[-*]\s+/, "").replace(/\s+/g, " ").trim();
}
function analyzeStudyMaterial(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headings = [];
  const definitions = [];
  const bulletFacts = [];
  const statements = [];
  let currentHeading = "";
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed === "---") {
      continue;
    }
    if (/^#{1,6}\s+/.test(trimmed)) {
      const heading = normalizeSentence(trimmed.replace(/^#{1,6}\s+/, ""));
      if (heading) {
        headings.push(heading);
        currentHeading = heading;
      }
      continue;
    }
    const normalized = normalizeSentence(trimmed);
    if (!normalized) {
      continue;
    }
    const definitionMatch = normalized.match(/^([^:]{3,80}):\s+(.{10,})$/);
    if (definitionMatch) {
      definitions.push({
        term: definitionMatch[1].trim(),
        description: definitionMatch[2].trim()
      });
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      bulletFacts.push({
        heading: currentHeading || void 0,
        text: normalized
      });
      continue;
    }
    if (normalized.length >= 35 && normalized.length <= 220 && !normalized.startsWith("status:")) {
      statements.push(normalized);
    }
  }
  const issues = [];
  if (headings.length < 2) {
    issues.push("wenig klare Abschnittsstruktur");
  }
  if (definitions.length === 0) {
    issues.push("keine expliziten Definitionen");
  }
  if (bulletFacts.length === 0) {
    issues.push("kaum stichpunktartige Fakten");
  }
  if (statements.length === 0) {
    issues.push("wenige ausformulierte Kernaussagen");
  }
  const readinessScore = Math.min(headings.length, 4) * 2 + Math.min(definitions.length, 4) * 3 + Math.min(bulletFacts.length, 6) * 2 + Math.min(statements.length, 4) * 1;
  return {
    headings,
    definitions,
    bulletFacts,
    statements,
    readinessScore,
    issues
  };
}

// ../../packages/shared-core/src/dashboard.ts
function calculateDashboardMetrics(notes, today = /* @__PURE__ */ new Date()) {
  const byStatus = {};
  const byYear = {};
  const weakModules = /* @__PURE__ */ new Map();
  let dueReviews = 0;
  for (const note of notes) {
    const statusKey = note.lernstatus ?? note.status ?? "unbekannt";
    const yearKey = note.ausbildungsjahr ?? "ohne-jahr";
    byStatus[statusKey] = (byStatus[statusKey] ?? 0) + 1;
    byYear[yearKey] = (byYear[yearKey] ?? 0) + 1;
    if (typeof note.score_last === "number" && note.modul_id) {
      const current = weakModules.get(note.modul_id) ?? { total: 0, count: 0 };
      current.total += note.score_last;
      current.count += 1;
      weakModules.set(note.modul_id, current);
    }
    if (note.next_review && parseDateOnly(note.next_review) <= today) {
      dueReviews += 1;
    }
  }
  return {
    total: notes.length,
    byStatus,
    byYear,
    dueReviews,
    weakModules: [...weakModules.entries()].map(([modulId, value]) => ({
      modulId,
      averageScore: Math.round(value.total / value.count),
      count: value.count
    })).sort((left, right) => left.averageScore - right.averageScore).slice(0, 5)
  };
}
function renderDashboardMarkdown(metrics) {
  const lines = [
    "# Lernfortschritt Dashboard",
    "",
    `- Notizen gesamt: ${metrics.total}`,
    `- F\xE4llige Reviews: ${metrics.dueReviews}`,
    "",
    "## Status",
    ...Object.entries(metrics.byStatus).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Ausbildungsjahre",
    ...Object.entries(metrics.byYear).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Schwaechste Module",
    ...metrics.weakModules.map((item) => `- ${item.modulId}: ${item.averageScore}% aus ${item.count} Notizen`)
  ];
  return lines.join("\n");
}
function buildLearningHubState(notes, materials, activePath, today = /* @__PURE__ */ new Date()) {
  const metrics = calculateDashboardMetrics(notes, today);
  const analyses = materials.map((material) => ({
    path: material.path,
    signals: analyzeStudyMaterial(material.markdown)
  }));
  const analysisMap = new Map(analyses.map((entry) => [entry.path, entry.signals]));
  const usableStudyNotes = analyses.filter((entry) => entry.signals.readinessScore >= 4).length;
  const weaklyStructuredNotes = analyses.length - usableStudyNotes;
  const weakestModule = metrics.weakModules[0];
  const dueReviewTitles = notes.filter((note) => note.next_review && parseDateOnly(note.next_review) <= today).slice(0, 3).map((note) => note.title);
  const activeNote = activePath ? (() => {
    const note = notes.find((entry) => entry.path === activePath);
    const signals = analysisMap.get(activePath);
    if (!note || !signals) {
      return void 0;
    }
    return {
      path: note.path,
      title: note.title,
      readinessScore: signals.readinessScore,
      issues: signals.issues,
      lernstatus: note.lernstatus ?? note.status,
      dueReview: Boolean(note.next_review && parseDateOnly(note.next_review) <= today),
      moduleId: note.modul_id
    };
  })() : void 0;
  const recommendations = [];
  if (metrics.dueReviews > 0) {
    recommendations.push({
      id: "review-queue",
      title: "Faellige Wiederholungen zuerst",
      reason: `${metrics.dueReviews} Notizen sind ueberfaellig. Das ist der sauberste Einstieg fuer heute.`,
      emphasis: "urgent",
      cta: "Review Queue \xF6ffnen"
    });
  }
  if (activeNote && activeNote.readinessScore >= 4) {
    recommendations.push({
      id: "quiz-current",
      title: "Aus der aktuellen Notiz ein Quiz ziehen",
      reason: `"${activeNote.title}" ist strukturiert genug fuer brauchbare Fragen.`,
      emphasis: activeNote.dueReview ? "steady" : "next",
      cta: "Quiz zur Notiz"
    });
  }
  if (activeNote && activeNote.readinessScore >= 5) {
    recommendations.push({
      id: "simulate-current",
      title: "Die aktuelle Notiz unter Pruefungsdruck testen",
      reason: "Genug Struktur fuer einen kurzen Simulationslauf ist vorhanden.",
      emphasis: "next",
      cta: "Pruefung starten"
    });
  }
  if (weakestModule) {
    recommendations.push({
      id: "plan-week",
      title: "Lernplan an den schw\xE4chsten Bereich anpassen",
      reason: `${weakestModule.modulId} liegt aktuell bei ${weakestModule.averageScore}%. Das sollte in die naechste Woche eingeplant werden.`,
      emphasis: "steady",
      cta: "Lernplan pr\xFCfen"
    });
  }
  recommendations.push({
    id: "snapshot",
    title: "Status sichern",
    reason: "Ein Snapshot macht den Fortschritt sichtbar und haelt den Stand fest.",
    emphasis: "steady",
    cta: "Snapshot schreiben"
  });
  return {
    metrics,
    usableStudyNotes,
    weaklyStructuredNotes,
    weakestModule,
    dueReviewTitles,
    activeNote,
    recommendations: dedupeRecommendations(recommendations).slice(0, 4)
  };
}
function dedupeRecommendations(recommendations) {
  const seen = /* @__PURE__ */ new Set();
  const order = { urgent: 0, next: 1, steady: 2 };
  return recommendations.filter((entry) => {
    if (seen.has(entry.id)) {
      return false;
    }
    seen.add(entry.id);
    return true;
  }).sort((left, right) => order[left.emphasis] - order[right.emphasis]);
}

// ../../packages/shared-core/src/doctor.ts
var VALID_LERNSTATUS = /* @__PURE__ */ new Set(["neu", "gelesen", "geuebt", "sicher", "beherrscht"]);
var VALID_LERNTYP = /* @__PURE__ */ new Set(["theorie", "uebung", "quiz", "pruefung", "review"]);
var VALID_PRUEFUNGSRELEVANZ = /* @__PURE__ */ new Set(["niedrig", "mittel", "hoch", "ihk-kritisch"]);
function runVaultDoctor(entries, today = /* @__PURE__ */ new Date()) {
  const issues = [];
  for (const entry of entries) {
    const { note, markdown } = entry;
    const frontmatter = parseFrontmatter(markdown);
    const signals = analyzeStudyMaterial(markdown);
    if (Object.keys(frontmatter).length === 0) {
      issues.push(makeIssue(note, "warning", "missing-frontmatter", "Kein Front Matter vorhanden. Die Notiz wird dadurch fuer Lern-Workflows schnell unscharf."));
    }
    if (!note.lernstatus) {
      issues.push(makeIssue(note, "warning", "missing-lernstatus", "lernstatus fehlt. Fortschritt und Wiederholung bleiben dadurch unsauber."));
    } else if (!VALID_LERNSTATUS.has(note.lernstatus)) {
      issues.push(makeIssue(note, "error", "invalid-lernstatus", `lernstatus "${note.lernstatus}" ist nicht im erwarteten Schema.`));
    }
    if (!note.lerntyp) {
      issues.push(makeIssue(note, "info", "missing-lerntyp", "lerntyp fehlt. Die Notiz ist damit weniger gut fuer Auswertungen trennbar."));
    } else if (!VALID_LERNTYP.has(note.lerntyp)) {
      issues.push(makeIssue(note, "error", "invalid-lerntyp", `lerntyp "${note.lerntyp}" ist nicht im erwarteten Schema.`));
    }
    if (!note.ausbildungsjahr) {
      issues.push(makeIssue(note, "info", "missing-ausbildungsjahr", "ausbildungsjahr fehlt. Jahresfilter und Verlauf bleiben dadurch duenn."));
    } else if (!/^\d+$/.test(note.ausbildungsjahr)) {
      issues.push(makeIssue(note, "warning", "invalid-ausbildungsjahr", `ausbildungsjahr "${note.ausbildungsjahr}" sieht nicht nach einer klaren Jahresangabe aus.`));
    }
    if (!note.pruefungsrelevanz) {
      issues.push(makeIssue(note, "info", "missing-pruefungsrelevanz", "pruefungsrelevanz fehlt. Priorisierung wird dadurch schw\xE4cher."));
    } else if (!VALID_PRUEFUNGSRELEVANZ.has(note.pruefungsrelevanz)) {
      issues.push(makeIssue(note, "error", "invalid-pruefungsrelevanz", `pruefungsrelevanz "${note.pruefungsrelevanz}" ist nicht im erwarteten Schema.`));
    }
    if (note.modul_id === "UNSORTIERT") {
      issues.push(makeIssue(note, "info", "module-unsorted", "modul_id konnte nicht sinnvoll abgeleitet werden und steht noch auf UNSORTIERT."));
    }
    if (note.score_last !== void 0 && (note.score_last < 0 || note.score_last > 100)) {
      issues.push(makeIssue(note, "error", "invalid-score", `score_last ${note.score_last} liegt ausserhalb von 0 bis 100.`));
    }
    if (note.score_best !== void 0 && (note.score_best < 0 || note.score_best > 100)) {
      issues.push(makeIssue(note, "error", "invalid-score", `score_best ${note.score_best} liegt ausserhalb von 0 bis 100.`));
    }
    if (note.time_estimate_min !== void 0 && note.time_estimate_min <= 0) {
      issues.push(makeIssue(note, "warning", "invalid-time-estimate", `time_estimate_min ${note.time_estimate_min} ist kein brauchbarer Lernwert.`));
    }
    const lastReview = note.last_review ? safeDate(note.last_review) : void 0;
    const nextReview = note.next_review ? safeDate(note.next_review) : void 0;
    if (note.last_review && !lastReview) {
      issues.push(makeIssue(note, "error", "invalid-review-date", `last_review "${note.last_review}" ist kein valides YYYY-MM-DD Datum.`));
    }
    if (note.next_review && !nextReview) {
      issues.push(makeIssue(note, "error", "invalid-review-date", `next_review "${note.next_review}" ist kein valides YYYY-MM-DD Datum.`));
    }
    if (lastReview && nextReview && nextReview < lastReview) {
      issues.push(makeIssue(note, "warning", "review-order", "next_review liegt vor last_review. Das sieht nach verdrehten Review-Daten aus."));
    }
    if (signals.readinessScore < 4) {
      const because = signals.issues.length > 0 ? signals.issues.join(", ") : "zu wenig klar strukturierte Fakten";
      issues.push(makeIssue(note, "info", "weak-structure", `Die Notiz ist fuer Quiz und Pr\xFCfung noch eher roh: ${because}.`));
    }
    if (note.next_review && nextReview && nextReview < today && !note.lernstatus) {
      issues.push(makeIssue(note, "info", "missing-lernstatus", "Die Notiz ist review-faellig, aber ohne lernstatus schwer einzuordnen."));
    }
  }
  const bySeverity = {
    error: issues.filter((entry) => entry.severity === "error").length,
    warning: issues.filter((entry) => entry.severity === "warning").length,
    info: issues.filter((entry) => entry.severity === "info").length
  };
  const byCode = {};
  for (const issue of issues) {
    byCode[issue.code] = (byCode[issue.code] ?? 0) + 1;
  }
  return {
    scannedNotes: entries.length,
    issues,
    bySeverity,
    byCode
  };
}
function renderVaultDoctorMarkdown(report) {
  const lines = [
    "# Vault Doctor",
    "",
    `- Gescannte Lernnotizen: ${report.scannedNotes}`,
    `- Fehler: ${report.bySeverity.error}`,
    `- Warnungen: ${report.bySeverity.warning}`,
    `- Hinweise: ${report.bySeverity.info}`,
    "",
    "## Haeufige Punkte",
    ...Object.entries(report.byCode).sort((left, right) => right[1] - left[1]).map(([code, count]) => `- ${code}: ${count}`),
    "",
    "## Einzelbefunde",
    ...report.issues.map((issue) => `- [${issue.severity.toUpperCase()}] [[${issue.title}]] (${issue.code})
  - ${issue.message}
  - Pfad: ${issue.path}`)
  ];
  if (report.issues.length === 0) {
    lines.push("- Keine offensichtlichen Probleme gefunden. Das Material wirkt fuer die aktuelle Plugin-Logik sauber genug.");
  }
  return lines.join("\n");
}
function safeDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = parseDateOnly(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function makeIssue(note, severity, code, message) {
  return {
    path: note.path,
    title: note.title,
    severity,
    code,
    message
  };
}

// ../../packages/plugin-kit/src/index.ts
var import_obsidian = require("obsidian");
var DEFAULT_BASE_SETTINGS = {
  rootFolders: [],
  dashboardFolder: "_plugin_outputs",
  periodicNotesFolder: "Periodic/Daily",
  useDataview: true,
  aiEnabled: false,
  aiProvider: "openai",
  openAiApiKey: "",
  openAiModel: "gpt-4.1-mini",
  openRouterApiKey: "",
  openRouterModel: "openai/gpt-4.1-mini",
  anthropicApiKey: "",
  anthropicModel: "claude-sonnet-4-6",
  googleApiKey: "",
  googleModel: "gemini-2.5-flash",
  zaiApiKey: "",
  zaiModel: "glm-4.5-air",
  minimaxApiKey: "",
  minimaxModel: "MiniMax-M1",
  moonshotApiKey: "",
  moonshotModel: "kimi-k2.5",
  customApiKey: "",
  customModel: "gpt-4.1-mini",
  customEndpoint: "https://api.openai.com/v1/chat/completions",
  requestTimeoutMs: 45e3,
  aiConnectionStatus: "unknown",
  aiConnectionMessage: "No connection test run yet.",
  aiConnectionTestedAt: ""
};
async function scanVault(app, rootFolders) {
  const normalizedRoots = rootFolders.map((entry) => entry.trim()).filter(Boolean);
  const files = app.vault.getMarkdownFiles().filter((file) => normalizedRoots.length === 0 || normalizedRoots.some((folder) => file.path.startsWith(folder)));
  const results = [];
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
async function ensureFolder(app, folderPath) {
  const parts = folderPath.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
}
async function writePluginOutput(app, folderPath, fileName, content) {
  await ensureFolder(app, folderPath);
  const path = `${folderPath}/${fileName}`;
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian.TFile) {
    await app.vault.modify(existing, content);
  } else {
    await app.vault.create(path, content);
  }
  return path;
}
async function openOutputFile(app, path, newLeaf = false) {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof import_obsidian.TFile)) {
    return;
  }
  const leaf = app.workspace.getLeaf(newLeaf);
  await leaf.openFile(file);
}
async function updateLearningStatus(app, file, status) {
  const markdown = await app.vault.cachedRead(file);
  const updated = updateYamlField(markdown, "lernstatus", status);
  await app.vault.modify(file, updated);
}
function getDataviewApi(plugin, useDataview) {
  if (!useDataview) {
    return null;
  }
  const candidate = plugin.app.plugins?.plugins?.dataview?.api;
  return candidate ?? null;
}
function noticeSuccess(message) {
  new import_obsidian.Notice(message, 4e3);
}
function noticeError(message) {
  new import_obsidian.Notice(message, 7e3);
}
function getAiProviderConfig(settings) {
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
  if (settings.aiProvider === "anthropic" && settings.anthropicApiKey.trim()) {
    return {
      provider: "anthropic",
      apiKey: settings.anthropicApiKey.trim(),
      model: settings.anthropicModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  if (settings.aiProvider === "google" && settings.googleApiKey.trim()) {
    return {
      provider: "google",
      apiKey: settings.googleApiKey.trim(),
      model: settings.googleModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  if (settings.aiProvider === "zai" && settings.zaiApiKey.trim()) {
    return {
      provider: "zai",
      apiKey: settings.zaiApiKey.trim(),
      model: settings.zaiModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  if (settings.aiProvider === "minimax" && settings.minimaxApiKey.trim()) {
    return {
      provider: "minimax",
      apiKey: settings.minimaxApiKey.trim(),
      model: settings.minimaxModel.trim(),
      timeoutMs: settings.requestTimeoutMs
    };
  }
  if (settings.aiProvider === "moonshot" && settings.moonshotApiKey.trim()) {
    return {
      provider: "moonshot",
      apiKey: settings.moonshotApiKey.trim(),
      model: settings.moonshotModel.trim(),
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
function getProviderEndpoint(config) {
  if (config.provider === "openai") {
    return "https://api.openai.com/v1/chat/completions";
  }
  if (config.provider === "openrouter") {
    return "https://openrouter.ai/api/v1/chat/completions";
  }
  if (config.provider === "anthropic") {
    return "https://api.anthropic.com/v1/chat/completions";
  }
  if (config.provider === "google") {
    return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  }
  if (config.provider === "zai") {
    return "https://api.z.ai/api/paas/v4/chat/completions";
  }
  if (config.provider === "minimax") {
    return "https://api.minimax.io/v1/chat/completions";
  }
  if (config.provider === "moonshot") {
    return "https://api.moonshot.ai/v1/chat/completions";
  }
  return config.endpoint ?? "https://api.openai.com/v1/chat/completions";
}
async function runAiRequest(config, request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 45e3);
  try {
    const body = {
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
    const headers = {
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
    const payload = await response.json();
    if (!response.ok) {
      const message = typeof payload.error === "object" && payload.error && "message" in payload.error ? String(payload.error.message) : providerErrorMessage(config.provider, response.status);
      throw new Error(message);
    }
    const content = payload.choices?.[0]?.message?.content;
    const rawText = typeof content === "string" ? content : "";
    const parsed = request.responseFormat === "json" ? safeJsonParseWithRepair(rawText) : void 0;
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
function providerErrorMessage(provider, status) {
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
function providerLabel(provider) {
  if (provider === "openai") return "OpenAI";
  if (provider === "openrouter") return "OpenRouter";
  if (provider === "anthropic") return "Anthropic";
  if (provider === "google") return "Google";
  if (provider === "zai") return "Z.AI";
  if (provider === "minimax") return "MiniMax";
  if (provider === "moonshot") return "Moonshot";
  return "Custom provider";
}
async function testAiProviderConnection(config) {
  const result = await runAiRequest(config, {
    systemPrompt: "You are a connectivity check. Return strict JSON only.",
    userPrompt: JSON.stringify({
      task: 'Return {"ok": true} and nothing else.'
    }),
    temperature: 0,
    responseFormat: "json"
  });
  if (result.parsed && typeof result.parsed === "object" && "ok" in result.parsed) {
    return `Connected to ${providerLabel(config.provider)} using ${config.model}.`;
  }
  return `Connected to ${providerLabel(config.provider)} using ${config.model}, but the response format was unusual.`;
}
var BaseSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("ausbildung-settings-tab");
    containerEl.createEl("h2", { text: this.plugin.manifest.name });
    const intro = containerEl.createDiv({ cls: "ausbildung-settings-intro" });
    intro.createDiv({ cls: "ausbildung-settings-intro__label", text: "Plugin Setup" });
    intro.createEl("p", {
      cls: "ausbildung-settings-intro__text",
      text: "These settings control where the plugin scans, where it writes output, and whether AI enrichment is active."
    });
    const scanSection = containerEl.createDiv({ cls: "ausbildung-settings-section" });
    scanSection.createEl("h3", { text: "Vault scope" });
    new import_obsidian.Setting(scanSection).setName("Root folders").setDesc("Comma-separated root folders to scan for notes. Leave empty to scan the whole vault.").addText(
      (text) => text.setValue(this.plugin.settings.rootFolders.join(", ")).onChange(async (value) => {
        this.plugin.settings.rootFolders = value.split(",").map((entry) => entry.trim()).filter(Boolean);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(scanSection).setName("Output folder").setDesc("Where generated markdown dashboards and plans should be written.").addText(
      (text) => text.setValue(this.plugin.settings.dashboardFolder).onChange(async (value) => {
        this.plugin.settings.dashboardFolder = value.trim() || "_plugin_outputs";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(scanSection).setName("Periodic notes folder").setDesc("Folder used for review queues and study journal integration.").addText(
      (text) => text.setValue(this.plugin.settings.periodicNotesFolder).onChange(async (value) => {
        this.plugin.settings.periodicNotesFolder = value.trim() || "Periodic/Daily";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(scanSection).setName("Prefer Dataview").setDesc("Use Dataview when available, but keep a safe fallback.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.useDataview).onChange(async (value) => {
        this.plugin.settings.useDataview = value;
        await this.plugin.saveSettings();
      })
    );
    const aiSection = containerEl.createDiv({ cls: "ausbildung-settings-section" });
    aiSection.createEl("h3", { text: "AI / BYOK" });
    aiSection.createDiv({
      cls: `ausbildung-settings-status ausbildung-settings-status--${this.plugin.settings.aiConnectionStatus}`,
      text: this.plugin.settings.aiConnectionStatus === "ok" ? "Connection verified" : this.plugin.settings.aiConnectionStatus === "error" ? "Connection failed" : "Connection not tested"
    });
    new import_obsidian.Setting(aiSection).setName("Enable AI features").setDesc("Use BYOK-backed AI features where the plugin supports them.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.aiEnabled).onChange(async (value) => {
        this.plugin.settings.aiEnabled = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    new import_obsidian.Setting(aiSection).setName("AI provider").setDesc("Choose the provider for AI-backed features.").addDropdown(
      (dropdown) => dropdown.addOption("openai", "OpenAI").addOption("openrouter", "OpenRouter").addOption("anthropic", "Anthropic").addOption("google", "Google").addOption("zai", "Z.AI").addOption("minimax", "MiniMax").addOption("moonshot", "Moonshot").addOption("custom", "Custom OpenAI-compatible").setValue(this.plugin.settings.aiProvider).onChange(async (value) => {
        this.plugin.settings.aiProvider = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    new import_obsidian.Setting(aiSection).setName("Request timeout").setDesc("Timeout in milliseconds for provider requests.").addText(
      (text) => text.setValue(String(this.plugin.settings.requestTimeoutMs)).onChange(async (value) => {
        this.plugin.settings.requestTimeoutMs = Number(value) || 45e3;
        await this.plugin.saveSettings();
      })
    );
    if (this.plugin.settings.aiProvider === "openai") {
      new import_obsidian.Setting(aiSection).setName("OpenAI API key").setDesc("Stored in Obsidian plugin settings.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("sk-...").setValue(this.plugin.settings.openAiApiKey).onChange(async (value) => {
          this.plugin.settings.openAiApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("OpenAI model").addText(
        (text) => text.setValue(this.plugin.settings.openAiModel).onChange(async (value) => {
          this.plugin.settings.openAiModel = value.trim() || "gpt-4.1-mini";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "openrouter") {
      new import_obsidian.Setting(aiSection).setName("OpenRouter API key").setDesc("Stored in Obsidian plugin settings.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("sk-or-...").setValue(this.plugin.settings.openRouterApiKey).onChange(async (value) => {
          this.plugin.settings.openRouterApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("OpenRouter model").addText(
        (text) => text.setValue(this.plugin.settings.openRouterModel).onChange(async (value) => {
          this.plugin.settings.openRouterModel = value.trim() || "openai/gpt-4.1-mini";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "anthropic") {
      new import_obsidian.Setting(aiSection).setName("Anthropic API key").setDesc("Uses Anthropic's OpenAI-compatible layer.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("sk-ant-...").setValue(this.plugin.settings.anthropicApiKey).onChange(async (value) => {
          this.plugin.settings.anthropicApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("Anthropic model").addText(
        (text) => text.setValue(this.plugin.settings.anthropicModel).onChange(async (value) => {
          this.plugin.settings.anthropicModel = value.trim() || "claude-sonnet-4-6";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "google") {
      new import_obsidian.Setting(aiSection).setName("Google API key").setDesc("Uses the Gemini OpenAI-compatible endpoint.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("AIza...").setValue(this.plugin.settings.googleApiKey).onChange(async (value) => {
          this.plugin.settings.googleApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("Google model").addText(
        (text) => text.setValue(this.plugin.settings.googleModel).onChange(async (value) => {
          this.plugin.settings.googleModel = value.trim() || "gemini-2.5-flash";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "zai") {
      new import_obsidian.Setting(aiSection).setName("Z.AI API key").setDesc("Uses Z.AI's OpenAI-compatible chat endpoint.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("API key").setValue(this.plugin.settings.zaiApiKey).onChange(async (value) => {
          this.plugin.settings.zaiApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("Z.AI model").addText(
        (text) => text.setValue(this.plugin.settings.zaiModel).onChange(async (value) => {
          this.plugin.settings.zaiModel = value.trim() || "glm-4.5-air";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "minimax") {
      new import_obsidian.Setting(aiSection).setName("MiniMax API key").setDesc("Uses MiniMax's OpenAI-compatible chat endpoint.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("API key").setValue(this.plugin.settings.minimaxApiKey).onChange(async (value) => {
          this.plugin.settings.minimaxApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("MiniMax model").addText(
        (text) => text.setValue(this.plugin.settings.minimaxModel).onChange(async (value) => {
          this.plugin.settings.minimaxModel = value.trim() || "MiniMax-M1";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "moonshot") {
      new import_obsidian.Setting(aiSection).setName("Moonshot API key").setDesc("Uses Moonshot's OpenAI-compatible Kimi endpoint.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("sk-...").setValue(this.plugin.settings.moonshotApiKey).onChange(async (value) => {
          this.plugin.settings.moonshotApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("Moonshot model").addText(
        (text) => text.setValue(this.plugin.settings.moonshotModel).onChange(async (value) => {
          this.plugin.settings.moonshotModel = value.trim() || "kimi-k2.5";
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "custom") {
      new import_obsidian.Setting(aiSection).setName("Custom endpoint").setDesc("OpenAI-compatible chat completions endpoint.").addText(
        (text) => text.setValue(this.plugin.settings.customEndpoint).onChange(async (value) => {
          this.plugin.settings.customEndpoint = value.trim();
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian.Setting(aiSection).setName("Custom API key").setDesc("Stored in Obsidian plugin settings.").addText((text) => {
        text.inputEl.type = "password";
        return text.setPlaceholder("API key").setValue(this.plugin.settings.customApiKey).onChange(async (value) => {
          this.plugin.settings.customApiKey = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian.Setting(aiSection).setName("Custom model").addText(
        (text) => text.setValue(this.plugin.settings.customModel).onChange(async (value) => {
          this.plugin.settings.customModel = value.trim() || "gpt-4.1-mini";
          await this.plugin.saveSettings();
        })
      );
    }
    new import_obsidian.Setting(aiSection).setName("Test AI connection").setDesc("Checks the currently selected provider, model, and key.").addButton(
      (button) => button.setButtonText("Run test").onClick(async () => {
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
          this.plugin.settings.aiConnectionTestedAt = (/* @__PURE__ */ new Date()).toISOString();
          await this.plugin.saveSettings();
          noticeSuccess(message);
          this.display();
        } catch (error) {
          this.plugin.settings.aiConnectionStatus = "error";
          this.plugin.settings.aiConnectionMessage = String(error);
          this.plugin.settings.aiConnectionTestedAt = (/* @__PURE__ */ new Date()).toISOString();
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
    const statusText = status === "ok" ? `Last test passed. ${this.plugin.settings.aiConnectionMessage}` : status === "error" ? `Last test failed. ${this.plugin.settings.aiConnectionMessage}` : this.plugin.settings.aiConnectionMessage;
    aiSection.createEl("p", {
      cls: "ausbildung-settings-status-text",
      text: this.plugin.settings.aiConnectionTestedAt ? `${statusText} (${this.plugin.settings.aiConnectionTestedAt})` : statusText
    });
  }
};

// src/main.ts
var DEFAULT_SETTINGS = {
  ...DEFAULT_BASE_SETTINGS,
  snapshotFileName: "lernfortschritt-dashboard.md",
  doctorFileName: "vault-doctor.md"
};
var LernfortschrittDashboardPlugin = class extends import_obsidian2.Plugin {
  async onload() {
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
      name: "Dashboard: Lernzentrale \xF6ffnen",
      callback: () => void this.openLiveDashboard()
    });
    this.addCommand({
      id: "run-vault-doctor",
      name: "Dashboard: Vault Doctor",
      callback: () => void this.openVaultDoctor()
    });
    this.addSettingTab(new BaseSettingsTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async generateSnapshot() {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    const metrics = calculateDashboardMetrics(scanned.map((entry) => entry.note));
    const readyCount = scanned.filter((entry) => analyzeStudyMaterial(entry.markdown).readinessScore >= 4).length;
    const dataviewApi = getDataviewApi(this, this.settings.useDataview);
    const dataviewHint = dataviewApi ? "\n\n> Dataview erkannt: Live-Abfragen koennen in dieser Snapshot-Note ergaenzt werden.\n" : "\n\n> Dataview nicht aktiv: Snapshot basiert auf sicherem Vault-Scan.\n";
    const content = `${renderDashboardMarkdown(metrics)}

## Materialqualitaet
- Gut nutzbare Lernnotizen: ${readyCount}
- Noch duenn strukturierte Notizen: ${metrics.total - readyCount}${dataviewHint}`;
    const path = await writePluginOutput(this.app, this.settings.dashboardFolder, this.settings.snapshotFileName, content);
    noticeSuccess(`Dashboard geschrieben: ${path}`);
  }
  async buildDoctorReport() {
    const scanned = await scanVault(this.app, this.settings.rootFolders);
    return runVaultDoctor(scanned.map((entry) => ({ note: entry.note, markdown: entry.markdown })));
  }
  async writeDoctorReport() {
    const report = await this.buildDoctorReport();
    const path = await writePluginOutput(
      this.app,
      this.settings.dashboardFolder,
      this.settings.doctorFileName,
      renderVaultDoctorMarkdown(report)
    );
    return path;
  }
  async markCurrent(status) {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian2.Notice("Keine aktive Notiz gefunden.");
      return;
    }
    await updateLearningStatus(this.app, file, status);
    noticeSuccess(`lernstatus auf ${status} gesetzt.`);
  }
  openLiveDashboard() {
    new LiveDashboardModal(this.app, this).open();
  }
  openVaultDoctor() {
    new VaultDoctorModal(this.app, this).open();
  }
};
var LiveDashboardModal = class extends import_obsidian2.Modal {
  constructor(app, plugin) {
    super(app);
    this.scanned = [];
    this.plugin = plugin;
  }
  async onOpen() {
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
    const closeBtn = actions.createEl("button", { text: "Schlie\xDFen" });
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
  async loadHubState() {
    this.scanned = await scanVault(this.app, this.plugin.settings.rootFolders);
    const activeFile = this.app.workspace.getActiveFile();
    this.hubState = buildLearningHubState(
      this.scanned.map((entry) => entry.note),
      this.scanned.map((entry) => ({ path: entry.note.path, markdown: entry.markdown })),
      activeFile?.path
    );
  }
  renderFilters(yearFilter) {
    Object.keys(this.hubState.metrics.byYear).forEach((year) => {
      yearFilter.createEl("option", { value: year, text: year });
    });
  }
  renderHub(recommendationsEl, currentNoteEl, yearFilter) {
    recommendationsEl.empty();
    currentNoteEl.empty();
    const filtered = this.getFilteredState(yearFilter);
    const hero = recommendationsEl.createDiv({ cls: "learning-hub__hero-card" });
    hero.createDiv({ cls: "learning-hub__eyebrow", text: "Heute sinnvoll" });
    hero.createEl("h3", { text: filtered.metrics.dueReviews > 0 ? "Erst den Review-Stau abbauen" : "Heute ist Raum fuer aktives Ueben" });
    hero.createEl("p", {
      text: filtered.metrics.dueReviews > 0 ? `Es gibt ${filtered.metrics.dueReviews} faellige Reviews. Das zuerst zu machen ist meist sinnvoller als neuer Stoff.` : "Kein grober Rueckstau sichtbar. Nutze die aktuelle Notiz fuer Quiz oder eine kurze Pruefungssimulation."
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
      chips.createSpan({ cls: "learning-hub__chip learning-hub__chip--urgent", text: "Review f\xE4llig" });
    }
    if (filtered.activeNote.issues.length > 0) {
      noteCard.createEl("p", { text: "Damit die Note wirklich lernbar wird, sollte sie noch klarer werden:" });
      const issueList = noteCard.createEl("ul", { cls: "learning-hub__issues" });
      filtered.activeNote.issues.forEach((issue) => issueList.createEl("li", { text: issue }));
    } else {
      noteCard.createEl("p", { text: "Die Notiz ist strukturiert genug fuer Quiz und kurze Pruefungsl\xE4ufe." });
    }
    const noteActions = noteCard.createDiv({ cls: "learning-hub__note-actions" });
    const quizBtn = noteActions.createEl("button", { cls: "mod-cta", text: "Quiz zur aktuellen Notiz" });
    const examBtn = noteActions.createEl("button", { text: "Pruefung simulieren" });
    quizBtn.disabled = filtered.activeNote.readinessScore < 4;
    examBtn.disabled = filtered.activeNote.readinessScore < 4;
    quizBtn.addEventListener("click", () => void this.runCommand("quiz-generator-markdown:preview-quiz-generation"));
    examBtn.addEventListener("click", () => void this.runCommand("pruefungs-simulator:simulate-current-quiz"));
  }
  renderCharts(container, yearFilter) {
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
      metrics.weakModules.slice(0, 3).forEach((module2) => {
        const item = modulesCard.createDiv({ cls: "module-item" });
        item.createSpan({ text: `${module2.modulId}: ${module2.averageScore}%` });
        this.renderMiniProgressBar(item, module2.averageScore);
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
      celebration.createEl("p", { text: "Mehr als die H\xE4lfte sitzt bereits. Jetzt lohnt sich Transfer und Pr\xFCfungssimulation." });
    }
  }
  getFilteredState(yearFilter) {
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
  getEmphasisLabel(emphasis) {
    if (emphasis === "urgent") {
      return "Jetzt";
    }
    if (emphasis === "next") {
      return "Als naechstes";
    }
    return "Nebenbei";
  }
  async handleRecommendation(id) {
    if (id === "snapshot") {
      await this.plugin.generateSnapshot();
      return;
    }
    const commandMap = {
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
  async runCommand(commandId) {
    const commandsApi = this.app.commands;
    const command = commandsApi?.findCommand(commandId);
    if (!command) {
      new import_obsidian2.Notice(`Aktion nicht verfuegbar: ${commandId}`);
      return;
    }
    this.close();
    await commandsApi.executeCommandById(commandId);
  }
  renderPieChart(container, data) {
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
      cumulative += value / total * 360;
      const legendRow = legend.createDiv({ cls: "pie-legend__item" });
      legendRow.createSpan({ cls: "pie-legend__swatch" }).style.background = colors[index % colors.length];
      legendRow.createSpan({ text: `${label}: ${value}` });
    });
  }
  renderProgressBar(container, current, total) {
    const safeTotal = total === 0 ? 1 : total;
    const bar = container.createDiv({ cls: "progress-bar" });
    const fill = bar.createDiv({ cls: "progress-fill" });
    fill.style.width = `${current / safeTotal * 100}%`;
    container.createEl("p", { text: total === 0 ? "Noch keine Notizen im Filter." : `${current}/${total} beherrscht` });
  }
  renderMiniProgressBar(container, percentage) {
    const bar = container.createDiv({ cls: "mini-progress-bar" });
    const fill = bar.createDiv({ cls: "mini-progress-fill" });
    fill.style.width = `${Math.max(0, Math.min(percentage, 100))}%`;
  }
};
var VaultDoctorModal = class extends import_obsidian2.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const shell = contentEl.createDiv({ cls: "live-dashboard-modal" });
    const header = shell.createDiv({ cls: "dashboard-header" });
    header.createEl("h2", { text: "Vault Doctor" });
    header.createEl("p", {
      text: "Kein Orakel, nur ein n\xFCchterner Blick auf Metadaten, Review-Daten und Notizstruktur."
    });
    const cards = shell.createDiv({ cls: "dashboard-charts" });
    const preview = shell.createDiv({ cls: "learning-hub__note-card" });
    const actions = shell.createDiv({ cls: "dashboard-actions" });
    const saveBtn = actions.createEl("button", { cls: "mod-cta", text: "Bericht schreiben" });
    const closeBtn = actions.createEl("button", { text: "Schlie\xDFen" });
    closeBtn.addEventListener("click", () => this.close());
    const report = await this.plugin.buildDoctorReport();
    this.renderSummary(cards, report);
    this.renderIssues(preview, report);
    saveBtn.addEventListener("click", async () => {
      const path = await this.plugin.writeDoctorReport();
      noticeSuccess(`Vault Doctor geschrieben: ${path}`);
      await openOutputFile(this.app, path, true);
      this.close();
    });
  }
  renderSummary(container, report) {
    const scanned = container.createDiv({ cls: "chart-card" });
    scanned.createEl("h3", { text: "\xDCberblick" });
    scanned.createEl("p", { text: `${report.scannedNotes} Lernnotizen gescannt` });
    const errors = container.createDiv({ cls: "chart-card" });
    errors.createEl("h3", { text: "Problemdruck" });
    errors.createEl("p", { text: `${report.bySeverity.error} Fehler, ${report.bySeverity.warning} Warnungen, ${report.bySeverity.info} Hinweise` });
    const top = container.createDiv({ cls: "chart-card" });
    top.createEl("h3", { text: "Was gerade am h\xE4ufigsten auff\xE4llt" });
    const list = top.createEl("ul", { cls: "learning-hub__issues" });
    const topCodes = Object.entries(report.byCode).sort((left, right) => right[1] - left[1]).slice(0, 5);
    if (topCodes.length === 0) {
      list.createEl("li", { text: "Nichts Auff\xE4lliges gefunden." });
      return;
    }
    topCodes.forEach(([code, count]) => list.createEl("li", { text: `${code}: ${count}` }));
  }
  renderIssues(container, report) {
    container.empty();
    container.createDiv({ cls: "learning-hub__eyebrow", text: "Einzelbefunde" });
    container.createEl("h3", { text: report.issues.length === 0 ? "Sieht sauber aus" : "Wo es gerade hakt" });
    if (report.issues.length === 0) {
      container.createEl("p", { text: "Keine offensichtlichen Br\xFCche gefunden. Das Material wirkt f\xFCr die aktuelle Plugin-Logik stabil genug." });
      return;
    }
    const list = container.createDiv({ cls: "learning-hub__doctor-list" });
    report.issues.slice(0, 20).forEach((issue) => {
      const item = list.createDiv({ cls: `learning-hub__doctor-item learning-hub__doctor-item--${issue.severity}` });
      item.createDiv({ cls: "learning-hub__card-kicker", text: `${issue.severity.toUpperCase()} \xB7 ${issue.code}` });
      item.createEl("h4", { text: issue.title });
      item.createEl("p", { text: issue.message });
      item.createEl("small", { text: issue.path });
    });
    if (report.issues.length > 20) {
      container.createEl("p", { text: `Es gibt noch ${report.issues.length - 20} weitere Befunde. Schreib den Bericht, wenn du alles als Markdown haben willst.` });
    }
  }
};
