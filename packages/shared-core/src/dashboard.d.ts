import { DashboardMetrics, LearningNote } from "./types";
export declare function calculateDashboardMetrics(notes: LearningNote[], today?: Date): DashboardMetrics;
export declare function renderDashboardMarkdown(metrics: DashboardMetrics): string;
