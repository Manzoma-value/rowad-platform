export type WorkshopVideoQuestionType = "MCQ" | "TF";

export type WorkshopVideoOption = {
  id: string;
  text: string;
  order: number;
};

// Admin-authoring shape — includes the correct answer.
export type WorkshopVideoQuestion = {
  id: string;
  type: WorkshopVideoQuestionType;
  text: string;
  correct_answer: string;
  timestamp_seconds: number;
  order: number;
  options: WorkshopVideoOption[];
};

// Teacher-facing shape — never leaks the correct answer to the player.
export type WorkshopVideoQuestionPublic = Omit<WorkshopVideoQuestion, "correct_answer">;

export type WorkshopVideo = {
  id: string;
  title: string;
  url: string;
  mime_type: string | null;
  size_bytes: number | null;
  order: number;
  created_at: string;
  questions: WorkshopVideoQuestion[];
};

export type WorkshopVideoAnswerRecord = {
  question_id: string;
  answer: string;
  is_correct: boolean;
};

export type WorkshopVideoAttemptSummary = {
  score: number;
  total: number;
  completed_at: string | null;
  answers: WorkshopVideoAnswerRecord[];
};

// Shape returned by /api/teacher/workshops/[id]/videos — one video plus the
// signed-in teacher's own progress on it.
export type TeacherWorkshopVideo = {
  id: string;
  title: string;
  url: string;
  mime_type: string | null;
  order: number;
  questions: WorkshopVideoQuestionPublic[];
  viewed: boolean;
  watch_completed: boolean;
  attempt: WorkshopVideoAttemptSummary | null;
};

export const MAX_VIDEO_FILE = 350 * 1024 * 1024;
export const MAX_QUESTIONS_PER_VIDEO = 30;

export function cleanQuestionOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 8);
}
