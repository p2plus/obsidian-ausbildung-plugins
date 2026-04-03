import { LearningNote } from "./types";

const FRONTMATTER_DELIMITER = "---";

function parseScalarValue(raw: string): string | number | string[] {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((part) => part.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

export function parseFrontmatter(markdown: string): Record<string, string | number | string[]> {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return {};
  }
  const result: Record<string, string | number | string[]> = {};
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

export function deriveModuleId(path: string, existing?: string): string {
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

export function parseLearningNote(path: string, markdown: string): LearningNote {
  const fm = parseFrontmatter(markdown);
  const lines = markdown.split(/\r?\n/);
  const title = lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") ?? path.split("/").pop() ?? path;
  const folder = path.split("/").slice(0, -1).join("/");
  return {
    path,
    title,
    folder,
    status: typeof fm.status === "string" ? fm.status : undefined,
    ausbildungsjahr: typeof fm.ausbildungsjahr === "string" ? fm.ausbildungsjahr : undefined,
    lernstatus: typeof fm.lernstatus === "string" ? (fm.lernstatus as LearningNote["lernstatus"]) : undefined,
    lerntyp: typeof fm.lerntyp === "string" ? (fm.lerntyp as LearningNote["lerntyp"]) : undefined,
    modul_id: deriveModuleId(path, typeof fm.modul_id === "string" ? fm.modul_id : undefined),
    pruefungsrelevanz: typeof fm.pruefungsrelevanz === "string" ? (fm.pruefungsrelevanz as LearningNote["pruefungsrelevanz"]) : undefined,
    last_review: typeof fm.last_review === "string" ? fm.last_review : undefined,
    next_review: typeof fm.next_review === "string" ? fm.next_review : undefined,
    difficulty: typeof fm.difficulty === "number" ? fm.difficulty : undefined,
    score_last: typeof fm.score_last === "number" ? fm.score_last : undefined,
    score_best: typeof fm.score_best === "number" ? fm.score_best : undefined,
    time_estimate_min: typeof fm.time_estimate_min === "number" ? fm.time_estimate_min : undefined,
    badge: typeof fm.badge === "string" ? fm.badge : undefined,
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : undefined
  };
}

export function updateYamlField(markdown: string, key: string, value: string | number): string {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return `---\n${key}: "${value}"\n---\n\n${markdown}`;
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

export function removeYamlField(markdown: string, key: string): string {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return markdown;
  }
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === FRONTMATTER_DELIMITER) {
      break;
    }
    if (lines[index].startsWith(`${key}:`)) {
      lines.splice(index, 1);
      break;
    }
  }
  return lines.join("\n");
}

export function parseDateOnly(dateText: string): Date {
  return new Date(`${dateText}T12:00:00`);
}
