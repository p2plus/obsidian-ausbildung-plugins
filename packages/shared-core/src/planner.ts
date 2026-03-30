import { LearningNote, PlannedTask, PlannerSettings } from "./types";

function isBlocked(date: string, settings: PlannerSettings): boolean {
  const blocked = new Set([...(settings.holidays ?? []), ...(settings.vacationDays ?? [])]);
  return blocked.has(date);
}

function rankNote(note: LearningNote): number {
  const relevanceScore = {
    "ihk-kritisch": 4,
    hoch: 3,
    mittel: 2,
    niedrig: 1
  }[note.pruefungsrelevanz ?? "niedrig"] ?? 0;
  const performancePenalty = typeof note.score_last === "number" ? Math.max(0, 100 - note.score_last) / 20 : 1;
  const reviewBoost = note.next_review ? 2 : 0;
  return relevanceScore + performancePenalty + reviewBoost;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function generateStudyPlan(notes: LearningNote[], settings: PlannerSettings): PlannedTask[] {
  const examDate = new Date(`${settings.examDate}T12:00:00`);
  const today = new Date();
  const queue = [...notes]
    .filter((note) => Boolean(note.modul_id))
    .sort((left, right) => rankNote(right) - rankNote(left));

  const tasks: PlannedTask[] = [];
  let pointer = new Date(today);
  const dailyMinutes = settings.dailyMinutes ?? Math.max(30, Math.floor((settings.weeklyHours * 60) / 5));
  let queueIndex = 0;

  while (pointer <= examDate && queue.length > 0) {
    const iso = toIsoDate(pointer);
    if (pointer.getDay() !== 0 && !isBlocked(iso, settings)) {
      const note = queue[queueIndex % queue.length];
      tasks.push({
        date: iso,
        notePath: note.path,
        modulId: note.modul_id ?? "UNSORTIERT",
        minutes: note.time_estimate_min ?? dailyMinutes,
        reason: note.next_review && note.next_review <= iso ? "Faellige Wiederholung" : "Pruefungsorientierte Priorisierung"
      });
      queueIndex += 1;
    }
    pointer.setDate(pointer.getDate() + 1);
  }

  return tasks;
}

export function renderStudyPlanMarkdown(tasks: PlannedTask[]): string {
  const lines = ["# Lernplan", ""];
  for (const task of tasks) {
    lines.push(`- ${task.date}: ${task.modulId} (${task.minutes} min) - ${task.reason}`);
  }
  return lines.join("\n");
}

