import { LearningNote, PlannedTask, PlannerSettings } from "./types";
export declare function generateStudyPlan(notes: LearningNote[], settings: PlannerSettings): PlannedTask[];
export declare function renderStudyPlanMarkdown(tasks: PlannedTask[]): string;
