import { LearningNote } from "./types";

function extractCandidates(markdown: string): string[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") || line.startsWith("## ") || /\*\*.+\*\*/.test(line))
    .slice(0, 5);
}

export function generateQuizFromMarkdown(note: LearningNote, markdown: string): string {
  const candidates = extractCandidates(markdown);
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
  candidates.forEach((candidate, index) => {
    lines.push(`## Frage ${index + 1}`);
    lines.push("");
    lines.push("TYPE: mc");
    lines.push("PUNKTE: 1");
    lines.push(`FRAGE: Welche Aussage passt am besten zu "${candidate.replace(/^(- |## )/, "")}"?`);
    lines.push("- [x] Diese Antwort muss fachlich aus der Notiz abgeleitet werden.");
    lines.push("- [ ] Diese Antwort ist absichtlich unpraezise.");
    lines.push("- [ ] Diese Antwort widerspricht der Notiz.");
    lines.push("");
  });
  return lines.join("\n");
}

