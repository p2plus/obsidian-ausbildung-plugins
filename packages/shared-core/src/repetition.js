const RATING_INTERVALS = {
    vergessen: 1,
    schwer: 2,
    mittel: 4,
    leicht: 7
};
export function calculateNextReview(currentDate, rating, previousIntervalDays = 0) {
    const baseInterval = RATING_INTERVALS[rating];
    const intervalDays = rating === "leicht" ? Math.max(baseInterval, Math.round(previousIntervalDays * 1.8) || baseInterval) : Math.max(baseInterval, Math.round(previousIntervalDays * 1.2) || baseInterval);
    const date = new Date(`${currentDate}T12:00:00`);
    date.setDate(date.getDate() + intervalDays);
    return {
        nextReview: date.toISOString().slice(0, 10),
        intervalDays
    };
}
//# sourceMappingURL=repetition.js.map