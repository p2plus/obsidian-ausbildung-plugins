export type Lernstatus = "neu" | "gelesen" | "geuebt" | "sicher" | "beherrscht";
export type Lerntyp = "theorie" | "uebung" | "quiz" | "pruefung" | "review";
export type Pruefungsrelevanz = "niedrig" | "mittel" | "hoch" | "ihk-kritisch";
export type AiProvider =
  | "openai"
  | "openrouter"
  | "anthropic"
  | "google"
  | "zai"
  | "minimax"
  | "moonshot"
  | "custom";

export interface LearningNote {
  path: string;
  title: string;
  folder: string;
  status?: string;
  ausbildungsjahr?: string;
  lernstatus?: Lernstatus;
  lerntyp?: Lerntyp;
  modul_id?: string;
  pruefungsrelevanz?: Pruefungsrelevanz;
  last_review?: string;
  next_review?: string;
  difficulty?: number;
  score_last?: number;
  score_best?: number;
  time_estimate_min?: number;
  badge?: string;
  tags?: string[];
}

export interface StudyMaterialSignals {
  headings: string[];
  definitions: Array<{ term: string; description: string }>;
  bulletFacts: Array<{ heading?: string; text: string }>;
  statements: string[];
  readinessScore: number;
  issues: string[];
}

export interface DashboardMetrics {
  total: number;
  byStatus: Record<string, number>;
  byYear: Record<string, number>;
  weakModules: Array<{ modulId: string; averageScore: number; count: number }>;
  dueReviews: number;
}

export interface StudyActionRecommendation {
  id: "review-queue" | "quiz-current" | "simulate-current" | "plan-week" | "snapshot";
  title: string;
  reason: string;
  emphasis: "urgent" | "next" | "steady";
  cta: string;
}

export interface LearningHubState {
  metrics: DashboardMetrics;
  usableStudyNotes: number;
  weaklyStructuredNotes: number;
  weakestModule?: { modulId: string; averageScore: number; count: number };
  dueReviewTitles: string[];
  activeNote?: {
    path: string;
    title: string;
    readinessScore: number;
    issues: string[];
    lernstatus?: string;
    dueReview: boolean;
    moduleId?: string;
  };
  recommendations: StudyActionRecommendation[];
}

export interface ExamQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndexes: number[];
  points: number;
  type: "mc";
}

export interface ExamDefinition {
  title: string;
  pruefung: string;
  zeitlimitMin: number;
  punkteMax?: number;
  modulId?: string;
  questions: ExamQuestion[];
}

export interface ExamAttemptAnswer {
  questionId: string;
  selectedIndexes: number[];
}

export interface ExamAttemptResult {
  score: number;
  maxScore: number;
  percentage: number;
  weakTopics: string[];
}

export interface PlannerSettings {
  examDate: string;
  weeklyHours: number;
  holidays?: string[];
  vacationDays?: string[];
  dailyMinutes?: number;
}

export interface PlannedTask {
  date: string;
  notePath: string;
  modulId: string;
  minutes: number;
  reason: string;
}

export interface SpacedRepetitionResult {
  nextReview: string;
  intervalDays: number;
}

export interface KeywordCoverage {
  keyword: string;
  hits: number;
  coveredPaths: string[];
}

export interface AiProviderConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  endpoint?: string;
  timeoutMs?: number;
}

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  responseFormat?: "json" | "text";
}

export interface AiGenerationResult<T = unknown> {
  provider: AiProvider;
  model: string;
  rawText: string;
  parsed?: T;
}

export interface ReviewPriorityExplanation {
  notePath: string;
  title: string;
  priority: number;
  reason: string;
  recapPrompt: string;
}

export interface QuizDraftQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty?: number;
}

export interface QuizGenerationMetadata {
  sourcePath: string;
  sourceTitle: string;
  provider?: AiProvider;
  model?: string;
  generatedAt: string;
  mode: "rule-based" | "ai-enhanced";
  questionCount: number;
}

export interface AnalyticsInsight {
  summary: string;
  risks: string[];
  nextActions: string[];
}

export interface KeywordGapSuggestion {
  topic: string;
  whyItMatters: string;
  suggestedKeywords: string[];
}
