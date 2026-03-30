import { KeywordCoverage, LearningNote } from "./types";

export function computeKeywordCoverage(notes: Array<{ note: LearningNote; markdown: string }>, keywords: string[]): KeywordCoverage[] {
  return keywords.map((keyword) => {
    const matches = notes.filter(({ markdown }) => markdown.toLowerCase().includes(keyword.toLowerCase()));
    return {
      keyword,
      hits: matches.length,
      coveredPaths: matches.map(({ note }) => note.path)
    };
  });
}

