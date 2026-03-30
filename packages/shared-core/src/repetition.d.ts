import { SpacedRepetitionResult } from "./types";
export declare function calculateNextReview(currentDate: string, rating: "vergessen" | "schwer" | "mittel" | "leicht", previousIntervalDays?: number): SpacedRepetitionResult;
