import { parseDateOnly, removeYamlField, updateYamlField, parseFrontmatter } from "./notes";
import { LearningNote, VaultDoctorFixResult, VaultDoctorIssue, VaultDoctorReport } from "./types";
import { analyzeStudyMaterial } from "./study-material";

const VALID_LERNSTATUS = new Set(["neu", "gelesen", "geuebt", "sicher", "beherrscht"]);
const VALID_LERNTYP = new Set(["theorie", "uebung", "quiz", "pruefung", "review"]);
const VALID_PRUEFUNGSRELEVANZ = new Set(["niedrig", "mittel", "hoch", "ihk-kritisch"]);

export function runVaultDoctor(entries: Array<{ note: LearningNote; markdown: string }>, today = new Date()): VaultDoctorReport {
  const issues: VaultDoctorIssue[] = [];

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
      issues.push(makeIssue(note, "info", "missing-pruefungsrelevanz", "pruefungsrelevanz fehlt. Priorisierung wird dadurch schwächer."));
    } else if (!VALID_PRUEFUNGSRELEVANZ.has(note.pruefungsrelevanz)) {
      issues.push(makeIssue(note, "error", "invalid-pruefungsrelevanz", `pruefungsrelevanz "${note.pruefungsrelevanz}" ist nicht im erwarteten Schema.`));
    }

    if (note.modul_id === "UNSORTIERT") {
      issues.push(makeIssue(note, "info", "module-unsorted", "modul_id konnte nicht sinnvoll abgeleitet werden und steht noch auf UNSORTIERT."));
    }

    if (note.score_last !== undefined && (note.score_last < 0 || note.score_last > 100)) {
      issues.push(makeIssue(note, "error", "invalid-score", `score_last ${note.score_last} liegt ausserhalb von 0 bis 100.`));
    }
    if (note.score_best !== undefined && (note.score_best < 0 || note.score_best > 100)) {
      issues.push(makeIssue(note, "error", "invalid-score", `score_best ${note.score_best} liegt ausserhalb von 0 bis 100.`));
    }

    if (note.time_estimate_min !== undefined && note.time_estimate_min <= 0) {
      issues.push(makeIssue(note, "warning", "invalid-time-estimate", `time_estimate_min ${note.time_estimate_min} ist kein brauchbarer Lernwert.`));
    }

    const lastReview = note.last_review ? safeDate(note.last_review) : undefined;
    const nextReview = note.next_review ? safeDate(note.next_review) : undefined;
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
      issues.push(makeIssue(note, "info", "weak-structure", `Die Notiz ist fuer Quiz und Prüfung noch eher roh: ${because}.`));
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
  const byCode: Record<string, number> = {};
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

export function renderVaultDoctorMarkdown(report: VaultDoctorReport): string {
  const lines = [
    "# Vault Doctor",
    "",
    `- Gescannte Lernnotizen: ${report.scannedNotes}`,
    `- Fehler: ${report.bySeverity.error}`,
    `- Warnungen: ${report.bySeverity.warning}`,
    `- Hinweise: ${report.bySeverity.info}`,
    "",
    "## Haeufige Punkte",
    ...Object.entries(report.byCode)
      .sort((left, right) => right[1] - left[1])
      .map(([code, count]) => `- ${code}: ${count}`),
    "",
    "## Einzelbefunde",
    ...report.issues.map((issue) => `- [${issue.severity.toUpperCase()}] [[${issue.title}]] (${issue.code})\n  - ${issue.message}\n  - Pfad: ${issue.path}`)
  ];

  if (report.issues.length === 0) {
    lines.push("- Keine offensichtlichen Probleme gefunden. Das Material wirkt fuer die aktuelle Plugin-Logik sauber genug.");
  }

  return lines.join("\n");
}

export function applyVaultDoctorFixes(note: LearningNote, markdown: string, today = new Date()): VaultDoctorFixResult {
  let updated = markdown;
  const applied: string[] = [];
  const frontmatter = parseFrontmatter(markdown);

  if (Object.keys(frontmatter).length === 0 || !note.lernstatus || !VALID_LERNSTATUS.has(note.lernstatus)) {
    updated = updateYamlField(updated, "lernstatus", "neu");
    applied.push("lernstatus auf neu gesetzt");
  }

  if (!note.lerntyp || !VALID_LERNTYP.has(note.lerntyp)) {
    updated = updateYamlField(updated, "lerntyp", inferLerntyp(note));
    applied.push("lerntyp normalisiert");
  }

  if (!note.pruefungsrelevanz || !VALID_PRUEFUNGSRELEVANZ.has(note.pruefungsrelevanz)) {
    updated = updateYamlField(updated, "pruefungsrelevanz", "mittel");
    applied.push("pruefungsrelevanz auf mittel gesetzt");
  }

  if (note.score_last !== undefined && (note.score_last < 0 || note.score_last > 100)) {
    updated = updateYamlField(updated, "score_last", clampScore(note.score_last));
    applied.push("score_last auf 0-100 begrenzt");
  }

  if (note.score_best !== undefined && (note.score_best < 0 || note.score_best > 100)) {
    updated = updateYamlField(updated, "score_best", clampScore(note.score_best));
    applied.push("score_best auf 0-100 begrenzt");
  }

  if (note.time_estimate_min !== undefined && note.time_estimate_min <= 0) {
    updated = removeYamlField(updated, "time_estimate_min");
    applied.push("time_estimate_min entfernt");
  }

  const lastReview = note.last_review ? safeDate(note.last_review) : undefined;
  const nextReview = note.next_review ? safeDate(note.next_review) : undefined;
  if (note.last_review && !lastReview) {
    updated = removeYamlField(updated, "last_review");
    applied.push("ungueltiges last_review entfernt");
  }
  if (note.next_review && !nextReview) {
    updated = removeYamlField(updated, "next_review");
    applied.push("ungueltiges next_review entfernt");
  }
  if (lastReview && nextReview && nextReview < lastReview) {
    updated = updateYamlField(updated, "next_review", note.last_review!);
    applied.push("next_review auf last_review angehoben");
  }

  if (note.next_review && nextReview && nextReview < today && !note.last_review) {
    updated = updateYamlField(updated, "last_review", today.toISOString().slice(0, 10));
    applied.push("fehlendes last_review auf heute gesetzt");
  }

  return { markdown: updated, applied };
}

function safeDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = parseDateOnly(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function makeIssue(note: LearningNote, severity: VaultDoctorIssue["severity"], code: VaultDoctorIssue["code"], message: string): VaultDoctorIssue {
  return {
    path: note.path,
    title: note.title,
    severity,
    code,
    message
  };
}

function inferLerntyp(note: LearningNote): string {
  const haystack = `${note.path} ${note.title}`.toLowerCase();
  if (haystack.includes("quiz")) {
    return "quiz";
  }
  if (haystack.includes("pruefung") || haystack.includes("exam")) {
    return "pruefung";
  }
  if (haystack.includes("uebung") || haystack.includes("exercise")) {
    return "uebung";
  }
  if (haystack.includes("review")) {
    return "review";
  }
  return "theorie";
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
