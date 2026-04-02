import { StudyMaterialSignals } from "./types";

function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function normalizeSentence(text: string): string {
  return cleanInlineMarkdown(text)
    .replace(/^[-*]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function analyzeStudyMaterial(markdown: string): StudyMaterialSignals {
  const lines = markdown.split(/\r?\n/);
  const headings: string[] = [];
  const definitions: Array<{ term: string; description: string }> = [];
  const bulletFacts: Array<{ heading?: string; text: string }> = [];
  const statements: string[] = [];
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
        heading: currentHeading || undefined,
        text: normalized
      });
      continue;
    }

    if (normalized.length >= 35 && normalized.length <= 220 && !normalized.startsWith("status:")) {
      statements.push(normalized);
    }
  }

  const issues: string[] = [];
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

  const readinessScore = (
    Math.min(headings.length, 4) * 2 +
    Math.min(definitions.length, 4) * 3 +
    Math.min(bulletFacts.length, 6) * 2 +
    Math.min(statements.length, 4) * 1
  );

  return {
    headings,
    definitions,
    bulletFacts,
    statements,
    readinessScore,
    issues
  };
}
