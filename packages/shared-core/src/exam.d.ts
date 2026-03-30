import { ExamAttemptAnswer, ExamAttemptResult, ExamDefinition } from "./types";
export declare function parseExamMarkdown(markdown: string): ExamDefinition;
export declare function gradeAttempt(exam: ExamDefinition, answers: ExamAttemptAnswer[]): ExamAttemptResult;
