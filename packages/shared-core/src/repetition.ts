import { SpacedRepetitionResult } from "./types";

const RATING_INTERVALS: Record<string, number> = {
  vergessen: 1,
  schwer: 2,
  mittel: 4,
  leicht: 7
};

export function calculateNextReview(currentDate: string, rating: "vergessen" | "schwer" | "mittel" | "leicht", previousIntervalDays = 0): SpacedRepetitionResult {
  const baseInterval = RATING_INTERVALS[rating];
  const intervalDays = rating === "leicht" ? Math.max(baseInterval, Math.round(previousIntervalDays * 1.8) || baseInterval) : Math.max(baseInterval, Math.round(previousIntervalDays * 1.2) || baseInterval);
  const date = new Date(`${currentDate}T12:00:00`);
  date.setDate(date.getDate() + intervalDays);
  return {
    nextReview: date.toISOString().slice(0, 10),
    intervalDays
  };
}

