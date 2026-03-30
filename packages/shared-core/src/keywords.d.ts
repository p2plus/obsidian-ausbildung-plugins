import { KeywordCoverage, LearningNote } from "./types";
export declare function computeKeywordCoverage(notes: Array<{
    note: LearningNote;
    markdown: string;
}>, keywords: string[]): KeywordCoverage[];
