export function buildAnalyticsReport(notes) {
    const totalMinutes = notes.reduce((sum, note) => sum + (note.time_estimate_min ?? 0), 0);
    const solvedExercises = notes.filter((note) => note.lerntyp === "uebung" || note.lerntyp === "quiz").length;
    const mastered = notes.filter((note) => note.lernstatus === "beherrscht").length;
    return [
        "# Ausbildungs-Analytics",
        "",
        `- Notizen: ${notes.length}`,
        `- Geplante Lernzeit: ${totalMinutes} Minuten`,
        `- Uebungen und Quizze: ${solvedExercises}`,
        `- Beherrschte Inhalte: ${mastered}`
    ].join("\n");
}
//# sourceMappingURL=analytics.js.map