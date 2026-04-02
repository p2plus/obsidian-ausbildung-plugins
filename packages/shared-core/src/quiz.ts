import { LearningNote } from "./types";
import { analyzeStudyMaterial } from "./study-material";

interface QuizSeed {
  question: string;
  answer: string;
  explanation: string;
}

function uniqueSeeds(seeds: QuizSeed[], maxCount = 5): QuizSeed[] {
  const seen = new Set<string>();
  const result: QuizSeed[] = [];
  for (const seed of seeds) {
    const key = `${seed.question}::${seed.answer}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(seed);
    if (result.length >= maxCount) {
      break;
    }
  }
  return result;
}

function extractSeeds(markdown: string): QuizSeed[] {
  const signals = analyzeStudyMaterial(markdown);
  const seeds = [
    ...signals.definitions.map((entry) => ({
      question: `Welche Beschreibung passt am besten zu "${entry.term}"?`,
      answer: entry.description,
      explanation: `Die Notiz beschreibt "${entry.term}" direkt mit: ${entry.description}`
    })),
    ...signals.bulletFacts
      .filter((entry) => entry.heading)
      .map((entry) => ({
        question: `Was nennt die Notiz unter "${entry.heading}"?`,
        answer: entry.text,
        explanation: `Unter "${entry.heading}" steht in der Notiz: ${entry.text}`
      })),
    ...signals.statements.map((entry) => ({
      question: "Welche Aussage steht so in der Notiz?",
      answer: entry,
      explanation: `Diese Kernaussage steht in der Notiz: ${entry}`
    }))
  ];
  return uniqueSeeds(seeds);
}

function distractorsFor(seed: QuizSeed, answerPool: string[]): string[] {
  const distractors = answerPool
    .filter((entry) => entry !== seed.answer)
    .filter((entry) => entry.length > 0)
    .slice(0, 2);

  const genericFallbacks = [
    "Das wird in der Notiz so nicht beschrieben.",
    "Die Notiz stuft das nur als Randaspekt ein.",
    "Dazu enthaelt die Notiz keine passende Aussage."
  ];

  for (const fallback of genericFallbacks) {
    if (distractors.length >= 3) {
      break;
    }
    if (fallback !== seed.answer && !distractors.includes(fallback)) {
      distractors.push(fallback);
    }
  }

  return distractors.slice(0, 3);
}

function renderQuestionBlock(seed: QuizSeed, index: number, answerPool: string[]): string[] {
  const options = [seed.answer, ...distractorsFor(seed, answerPool)];
  return [
    `## Frage ${index + 1}`,
    "",
    "TYPE: mc",
    "PUNKTE: 1",
    `FRAGE: ${seed.question}`,
    `- [x] ${options[0]}`,
    `- [ ] ${options[1] ?? "Keine passende Aussage."}`,
    `- [ ] ${options[2] ?? "Das wird anders beschrieben."}`,
    `- [ ] ${options[3] ?? "Diese Aussage passt nicht zum Thema."}`,
    "",
    `ERKLAERUNG: ${seed.explanation}`,
    ""
  ];
}

export function generateQuizFromMarkdown(note: LearningNote, markdown: string): string {
  const seeds = extractSeeds(markdown);
  const answerPool = seeds.map((seed) => seed.answer);
  const lines = [
    "---",
    'status: "Entwurf"',
    'lerntyp: "quiz"',
    `modul_id: "${note.modul_id ?? "UNSORTIERT"}"`,
    `pruefungsrelevanz: "${note.pruefungsrelevanz ?? "mittel"}"`,
    "---",
    "",
    `# Quiz zu ${note.title}`,
    ""
  ];
  if (seeds.length === 0) {
    lines.push("## Frage 1");
    lines.push("");
    lines.push("TYPE: mc");
    lines.push("PUNKTE: 1");
    lines.push(`FRAGE: Welche Kernaussage laesst sich aus "${note.title}" ableiten?`);
    lines.push("- [x] Die Notiz muss erst noch strukturierter ausgearbeitet werden, damit daraus gute Fragen entstehen.");
    lines.push("- [ ] Die Notiz ist bereits vollstaendig als Pruefung ausgewertet.");
    lines.push("- [ ] Die Notiz enthaelt gar kein relevantes Lernmaterial.");
    lines.push("- [ ] Die Notiz darf nicht fuer Quizfragen verwendet werden.");
    lines.push("");
    lines.push("ERKLAERUNG: Fuer gute lokale Fragen braucht die Notiz mindestens uebersichtliche Fakten, Listen, Definitionen oder klare Kernaussagen.");
    return lines.join("\n");
  }

  seeds.forEach((seed, index) => {
    lines.push(...renderQuestionBlock(seed, index, answerPool));
  });
  return lines.join("\n");
}
