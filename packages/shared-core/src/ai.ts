import {
  AiGenerationRequest,
  AnalyticsInsight,
  KeywordCoverage,
  KeywordGapSuggestion,
  LearningNote,
  QuizDraftQuestion,
  ReviewPriorityExplanation
} from "./types";

function clamp(text: string, maxLength = 8000): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...` : text;
}

export function buildQuizAiRequest(note: LearningNote, markdown: string, questionCount: number, examLevel: string): AiGenerationRequest {
  return {
    systemPrompt: "You create exam-style multiple choice questions from study notes. Return strict JSON only.",
    userPrompt: clamp(
      JSON.stringify({
        task: "Generate multiple-choice questions from the note content.",
        constraints: [
          "Return JSON with a top-level 'questions' array.",
          "Each question needs question, options, correctIndex, explanation, difficulty.",
          "Use exactly 4 options per question.",
          "Only one correct answer.",
          "Make distractors plausible, not random."
        ],
        note: {
          title: note.title,
          modulId: note.modul_id,
          examLevel,
          questionCount
        },
        markdown
      })
    ),
    temperature: 0.4,
    responseFormat: "json"
  };
}

export function buildAnalyticsAiRequest(notes: LearningNote[], reportMarkdown: string): AiGenerationRequest {
  return {
    systemPrompt: "You summarize learning analytics. Return strict JSON only.",
    userPrompt: clamp(
      JSON.stringify({
        task: "Summarize the learning analytics into a short report.",
        constraints: [
          "Return JSON with summary, risks, nextActions.",
          "Keep all points grounded in the provided metrics."
        ],
        metricsMarkdown: reportMarkdown,
        notes: notes.slice(0, 40).map((note) => ({
          title: note.title,
          modulId: note.modul_id,
          lernstatus: note.lernstatus,
          scoreLast: note.score_last,
          nextReview: note.next_review,
          relevance: note.pruefungsrelevanz
        }))
      })
    ),
    temperature: 0.3,
    responseFormat: "json"
  };
}

export function buildKeywordGapAiRequest(coverage: KeywordCoverage[], sampleNotes: Array<{ path: string; markdown: string }>): AiGenerationRequest {
  return {
    systemPrompt: "You analyze topic gaps in study material. Return strict JSON only.",
    userPrompt: clamp(
      JSON.stringify({
        task: "Find likely missing or weakly covered topics based on explicit keyword coverage and note excerpts.",
        constraints: [
          "Return JSON with a top-level 'gaps' array.",
          "Each gap needs topic, whyItMatters, suggestedKeywords."
        ],
        coverage,
        samples: sampleNotes.slice(0, 10).map((entry) => ({
          path: entry.path,
          excerpt: entry.markdown.slice(0, 1200)
        }))
      })
    ),
    temperature: 0.3,
    responseFormat: "json"
  };
}

export function buildReviewPriorityAiRequest(entries: Array<{ note: LearningNote; markdown: string }>): AiGenerationRequest {
  return {
    systemPrompt: "You prioritize study reviews. Return strict JSON only.",
    userPrompt: clamp(
      JSON.stringify({
        task: "Prioritize review notes and explain why they should be reviewed now.",
        constraints: [
          "Return JSON with a top-level 'items' array.",
          "Each item needs notePath, title, priority, reason, recapPrompt."
        ],
        notes: entries.slice(0, 25).map((entry) => ({
          path: entry.note.path,
          title: entry.note.title,
          modulId: entry.note.modul_id,
          relevance: entry.note.pruefungsrelevanz,
          scoreLast: entry.note.score_last,
          nextReview: entry.note.next_review,
          content: entry.markdown.slice(0, 1500)
        }))
      })
    ),
    temperature: 0.2,
    responseFormat: "json"
  };
}

export function normalizeQuizDraftQuestions(payload: unknown): QuizDraftQuestion[] {
  const questions = (payload as { questions?: unknown[] })?.questions;
  if (!Array.isArray(questions)) {
    return [];
  }
  return questions.flatMap((item) => {
    const record = item as Record<string, unknown>;
    if (typeof record.question !== "string" || !Array.isArray(record.options) || typeof record.correctIndex !== "number") {
      return [];
    }
    const options = record.options.filter((option): option is string => typeof option === "string").slice(0, 4);
    if (options.length < 2 || record.correctIndex < 0 || record.correctIndex >= options.length) {
      return [];
    }
    return [{
      question: record.question,
      options,
      correctIndex: record.correctIndex,
      explanation: typeof record.explanation === "string" ? record.explanation : undefined,
      difficulty: typeof record.difficulty === "number" ? record.difficulty : undefined
    }];
  });
}

export function normalizeAnalyticsInsight(payload: unknown): AnalyticsInsight | null {
  const record = payload as Record<string, unknown>;
  if (typeof record?.summary !== "string") {
    return null;
  }
  return {
    summary: record.summary,
    risks: Array.isArray(record.risks) ? record.risks.filter((item): item is string => typeof item === "string") : [],
    nextActions: Array.isArray(record.nextActions) ? record.nextActions.filter((item): item is string => typeof item === "string") : []
  };
}

export function normalizeKeywordGaps(payload: unknown): KeywordGapSuggestion[] {
  const gaps = (payload as { gaps?: unknown[] })?.gaps;
  if (!Array.isArray(gaps)) {
    return [];
  }
  return gaps.flatMap((item) => {
    const record = item as Record<string, unknown>;
    if (typeof record.topic !== "string" || typeof record.whyItMatters !== "string" || !Array.isArray(record.suggestedKeywords)) {
      return [];
    }
    return [{
      topic: record.topic,
      whyItMatters: record.whyItMatters,
      suggestedKeywords: record.suggestedKeywords.filter((entry): entry is string => typeof entry === "string")
    }];
  });
}

export function normalizeReviewPriority(payload: unknown): ReviewPriorityExplanation[] {
  const items = (payload as { items?: unknown[] })?.items;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.flatMap((item) => {
    const record = item as Record<string, unknown>;
    if (
      typeof record.notePath !== "string" ||
      typeof record.title !== "string" ||
      typeof record.priority !== "number" ||
      typeof record.reason !== "string" ||
      typeof record.recapPrompt !== "string"
    ) {
      return [];
    }
    return [{
      notePath: record.notePath,
      title: record.title,
      priority: record.priority,
      reason: record.reason,
      recapPrompt: record.recapPrompt
    }];
  });
}
