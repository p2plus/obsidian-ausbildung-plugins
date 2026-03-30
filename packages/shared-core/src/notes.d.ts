import { LearningNote } from "./types";
export declare function parseFrontmatter(markdown: string): Record<string, string | number | string[]>;
export declare function deriveModuleId(path: string, existing?: string): string;
export declare function parseLearningNote(path: string, markdown: string): LearningNote;
export declare function updateYamlField(markdown: string, key: string, value: string | number): string;
