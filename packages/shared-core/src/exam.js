import { parseFrontmatter } from "./notes";
function parseQuestionBlock(block, index) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const promptLine = lines.find((line) => line.startsWith("FRAGE:"));
    const pointsLine = lines.find((line) => line.startsWith("PUNKTE:"));
    if (!promptLine || !pointsLine) {
        return null;
    }
    const options = lines.filter((line) => line.startsWith("- ["));
    const correctIndexes = options.reduce((accumulator, line, optionIndex) => {
        if (line.startsWith("- [x]")) {
            accumulator.push(optionIndex);
        }
        return accumulator;
    }, []);
    return {
        id: `frage-${index + 1}`,
        prompt: promptLine.replace("FRAGE:", "").trim(),
        options: options.map((line) => line.replace(/^- \[[x ]\]\s*/, "")),
        correctIndexes,
        points: Number(pointsLine.replace("PUNKTE:", "").trim()),
        type: "mc"
    };
}
export function parseExamMarkdown(markdown) {
    const fm = parseFrontmatter(markdown);
    const sections = markdown.split(/^## /m).slice(1);
    return {
        title: markdown.split(/\r?\n/).find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") ?? "Pruefung",
        pruefung: typeof fm.pruefung === "string" ? fm.pruefung : "Gesamtpruefung",
        zeitlimitMin: typeof fm.zeitlimit_min === "number" ? fm.zeitlimit_min : 60,
        punkteMax: typeof fm.punkte_max === "number" ? fm.punkte_max : undefined,
        modulId: typeof fm.modul_id === "string" ? fm.modul_id : undefined,
        questions: sections.map((section, index) => parseQuestionBlock(section, index)).filter((item) => Boolean(item))
    };
}
export function gradeAttempt(exam, answers) {
    let score = 0;
    const weakTopics = new Set();
    const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.selectedIndexes.join(",")]));
    for (const question of exam.questions) {
        const actual = answerMap.get(question.id) ?? "";
        const expected = question.correctIndexes.join(",");
        if (actual === expected) {
            score += question.points;
        }
        else if (exam.modulId) {
            weakTopics.add(exam.modulId);
        }
    }
    const maxScore = exam.questions.reduce((sum, question) => sum + question.points, 0);
    return {
        score,
        maxScore,
        percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
        weakTopics: [...weakTopics]
    };
}
//# sourceMappingURL=exam.js.map