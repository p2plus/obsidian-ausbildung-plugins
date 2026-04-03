import { DashboardMetrics, LearningHubState, LearningNote, StudyActionRecommendation } from "./types";
import { parseDateOnly } from "./notes";
import { analyzeStudyMaterial } from "./study-material";

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

export function buildLearningHubState(
  notes: LearningNote[],
  materials: Array<{ path: string; markdown: string }>,
  activePath?: string,
  today = new Date()
): LearningHubState {
  const metrics = calculateDashboardMetrics(notes, today);
  const analyses = materials.map((material) => ({
    path: material.path,
    signals: analyzeStudyMaterial(material.markdown)
  }));
  const analysisMap = new Map(analyses.map((entry) => [entry.path, entry.signals]));
  const usableStudyNotes = analyses.filter((entry) => entry.signals.readinessScore >= 4).length;
  const weaklyStructuredNotes = analyses.length - usableStudyNotes;
  const weakestModule = metrics.weakModules[0];
  const dueReviewTitles = notes
    .filter((note) => note.next_review && parseDateOnly(note.next_review) <= today)
    .slice(0, 3)
    .map((note) => note.title);

  const activeNote = activePath
    ? (() => {
        const note = notes.find((entry) => entry.path === activePath);
        const signals = analysisMap.get(activePath);
        if (!note || !signals) {
          return undefined;
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
      })()
    : undefined;

  const recommendations: StudyActionRecommendation[] = [];

  if (metrics.dueReviews > 0) {
    recommendations.push({
      id: "review-queue",
      title: "Faellige Wiederholungen zuerst",
      reason: `${metrics.dueReviews} Notizen sind ueberfaellig. Das ist der sauberste Einstieg fuer heute.`,
      emphasis: "urgent",
      cta: "Review Queue öffnen"
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
      title: "Lernplan an den schwächsten Bereich anpassen",
      reason: `${weakestModule.modulId} liegt aktuell bei ${weakestModule.averageScore}%. Das sollte in die naechste Woche eingeplant werden.`,
      emphasis: "steady",
      cta: "Lernplan prüfen"
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

function dedupeRecommendations(recommendations: StudyActionRecommendation[]): StudyActionRecommendation[] {
  const seen = new Set<string>();
  const order = { urgent: 0, next: 1, steady: 2 };
  return recommendations
    .filter((entry) => {
      if (seen.has(entry.id)) {
        return false;
      }
      seen.add(entry.id);
      return true;
    })
    .sort((left, right) => order[left.emphasis] - order[right.emphasis]);
}
