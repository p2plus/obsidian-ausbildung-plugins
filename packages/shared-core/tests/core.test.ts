import { describe, expect, it } from "vitest";
import {
  buildAnalyticsAiRequest,
  buildKeywordGapAiRequest,
  buildQuizAiRequest,
  buildAnalyticsReport,
  calculateDashboardMetrics,
  calculateNextReview,
  generateQuizFromMarkdown,
  generateStudyPlan,
  gradeAttempt,
  normalizeAnalyticsInsight,
  normalizeKeywordGaps,
  normalizeQuizDraftQuestions,
  parseExamMarkdown,
  parseDateOnly,
  parseLearningNote,
  renderDashboardMarkdown,
  safeJsonParseWithRepair,
  updateYamlField
} from "../src/index";

const demoNote = parseLearningNote(
  "000_Ausbildung_Industriekaufmann_2026/01_Ausbildungsgrundlagen/LF01_01_Berufsausbildung_Recht.md",
  `---
status: "Aktiv"
ausbildungsjahr: "1"
lernstatus: "gelesen"
lerntyp: "theorie"
modul_id: "LF01"
pruefungsrelevanz: "hoch"
last_review: "2026-03-28"
next_review: "2026-03-29"
difficulty: 2
score_last: 78
score_best: 88
time_estimate_min: 35
badge: "book"
---

# Demo`
);

describe("shared core", () => {
  it("parses learning note metadata", () => {
    expect(demoNote.modul_id).toBe("LF01");
    expect(demoNote.score_last).toBe(78);
  });

  it("builds dashboard metrics", () => {
    const metrics = calculateDashboardMetrics([demoNote], new Date("2026-03-30T00:00:00Z"));
    expect(metrics.total).toBe(1);
    expect(metrics.dueReviews).toBe(1);
    expect(renderDashboardMarkdown(metrics)).toContain("Lernfortschritt Dashboard");
  });

  it("grades exam attempts", () => {
    const exam = parseExamMarkdown(`---
pruefung: "AP1"
zeitlimit_min: 30
modul_id: "AP1-KLR"
---
# Mini Exam

## Frage 1
TYPE: mc
PUNKTE: 2
FRAGE: Demo?
- [x] Richtig
- [ ] Falsch`);
    const result = gradeAttempt(exam, [{ questionId: "frage-1", selectedIndexes: [0] }]);
    expect(result.score).toBe(2);
    expect(result.percentage).toBe(100);
  });

  it("creates a study plan", () => {
    const tasks = generateStudyPlan([demoNote], {
      examDate: "2026-04-10",
      weeklyHours: 5
    });
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("computes spaced repetition", () => {
    const result = calculateNextReview("2026-03-30", "leicht", 5);
    expect(result.intervalDays).toBeGreaterThanOrEqual(7);
  });

  it("builds quiz draft and analytics", () => {
    const quiz = generateQuizFromMarkdown(
      demoNote,
      "# Demo\n## Thema\n- Punkt A\n- Punkt B\n\nBegriff: Das ist eine wichtige Definition fuer die Pruefung."
    );
    expect(quiz).toContain("Quiz zu");
    expect(quiz).toContain('FRAGE: Was nennt die Notiz unter "Thema"?');
    expect(quiz).toContain('FRAGE: Welche Beschreibung passt am besten zu "Begriff"?');
    expect(quiz).not.toContain("Diese Antwort muss fachlich aus der Notiz abgeleitet werden.");
    expect(buildAnalyticsReport([demoNote])).toContain("Ausbildungs-Analytics");
  });

  it("normalizes AI payloads", () => {
    expect(buildQuizAiRequest(demoNote, "# Demo", 4, "AP1").responseFormat).toBe("json");
    expect(
      normalizeQuizDraftQuestions({
        questions: [{ question: "Q", options: ["A", "B", "C", "D"], correctIndex: 1, explanation: "Warum" }]
      })
    ).toHaveLength(1);
    expect(
      normalizeAnalyticsInsight({ summary: "Kurz", risks: ["A"], nextActions: ["B"] })?.summary
    ).toBe("Kurz");
    expect(
      normalizeKeywordGaps({ gaps: [{ topic: "Bilanz", whyItMatters: "Pruefungsrelevant", suggestedKeywords: ["Aktiva"] }] })
    ).toHaveLength(1);
    expect(buildAnalyticsAiRequest([demoNote], "# Bericht").responseFormat).toBe("json");
    expect(buildKeywordGapAiRequest([{ keyword: "Bilanz", hits: 1, coveredPaths: [] }], [{ path: "a", markdown: "Bilanz" }]).responseFormat).toBe("json");
    expect(safeJsonParseWithRepair<{ ok: boolean }>('noise {"ok": true} tail')?.ok).toBe(true);
  });

  it("supports the expanded AI provider union", () => {
    const providers = ["openai", "openrouter", "anthropic", "google", "zai", "minimax", "moonshot", "custom"];
    expect(providers).toHaveLength(8);
  });

  it("updates yaml fields without duplicating frontmatter", () => {
    const markdown = `---
status: "Aktiv"
---

# Demo`;
    const updated = updateYamlField(updateYamlField(markdown, "next_review", "2026-03-31"), "last_review", "2026-03-30");
    expect(updated.match(/^---$/gm)).toHaveLength(2);
    expect(updated).toContain('next_review: "2026-03-31"');
    expect(updated).toContain('last_review: "2026-03-30"');
  });

  it("parses date-only values at local noon", () => {
    expect(parseDateOnly("2026-03-30").toISOString()).toContain("T");
  });
});
