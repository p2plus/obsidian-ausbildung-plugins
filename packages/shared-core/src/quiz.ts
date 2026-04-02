import { LearningNote } from "./types";

interface QuizSeed {
  question: string;
  answer: string;
  explanation: string;
}

function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function normalizeSentence(text: string): string {
  return cleanInlineMarkdown(text)
    .replace(/^[-*]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDefinitionSeeds(lines: string[]): QuizSeed[] {
  const seeds: QuizSeed[] = [];
  for (const rawLine of lines) {
    const line = normalizeSentence(rawLine);
    if (line.startsWith("#") || line.length < 12) {
      continue;
    }
    const match = line.match(/^([^:]{3,80}):\s+(.{10,})$/);
    if (!match) {
      continue;
    }
    const [, term, description] = match;
    seeds.push({
      question: `Welche Beschreibung passt am besten zu "${term.trim()}"?`,
      answer: description.trim(),
      explanation: `Die Notiz beschreibt "${term.trim()}" direkt mit: ${description.trim()}`
    });
  }
  return seeds;
}

function buildHeadingBulletSeeds(lines: string[]): QuizSeed[] {
  const seeds: QuizSeed[] = [];
  let currentHeading = "";
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (/^#{2,}\s+/.test(trimmed)) {
      currentHeading = normalizeSentence(trimmed.replace(/^#{2,}\s+/, ""));
      continue;
    }
    if (!currentHeading || !/^[-*]\s+/.test(trimmed)) {
      continue;
    }
    const bullet = normalizeSentence(trimmed);
    if (bullet.length < 6) {
      continue;
    }
    seeds.push({
      question: `Was nennt die Notiz unter "${currentHeading}"?`,
      answer: bullet,
      explanation: `Unter "${currentHeading}" steht in der Notiz: ${bullet}`
    });
  }
  return seeds;
}

function buildStatementSeeds(lines: string[]): QuizSeed[] {
  const seeds: QuizSeed[] = [];
  for (const rawLine of lines) {
    const line = normalizeSentence(rawLine);
    if (
      !line ||
      line.startsWith("#") ||
      line.startsWith("---") ||
      line.length < 35 ||
      line.length > 180
    ) {
      continue;
    }
    seeds.push({
      question: "Welche Aussage steht so in der Notiz?",
      answer: line,
      explanation: `Diese Kernaussage steht in der Notiz: ${line}`
    });
  }
  return seeds;
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
  const lines = markdown.split(/\r?\n/);
  const seeds = [
    ...buildDefinitionSeeds(lines),
    ...buildHeadingBulletSeeds(lines),
    ...buildStatementSeeds(lines)
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
