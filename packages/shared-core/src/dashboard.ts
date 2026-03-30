import { DashboardMetrics, LearningNote } from "./types";
import { parseDateOnly } from "./notes";

export function calculateDashboardMetrics(notes: LearningNote[], today = new Date()): DashboardMetrics {
  const byStatus: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  const weakModules = new Map<string, { total: number; count: number }>();
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
    weakModules: [...weakModules.entries()]
      .map(([modulId, value]) => ({
        modulId,
        averageScore: Math.round(value.total / value.count),
        count: value.count
      }))
      .sort((left, right) => left.averageScore - right.averageScore)
      .slice(0, 5)
  };
}

export function renderDashboardMarkdown(metrics: DashboardMetrics): string {
  const lines = [
    "# Lernfortschritt Dashboard",
    "",
    `- Notizen gesamt: ${metrics.total}`,
    `- Fällige Reviews: ${metrics.dueReviews}`,
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
