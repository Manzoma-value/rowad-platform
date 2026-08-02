export type WorkshopVideoQuestionType = "MCQ" | "TF" | "TEXT";
export type WorkshopVideoAnswerStatus = "AUTO_GRADED" | "PENDING_REVIEW" | "GRADED";

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
  source_type: "SUPABASE" | "GOOGLE_DRIVE";
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  order: number;
  created_at: string;
  questions: WorkshopVideoQuestion[];
};

export type WorkshopVideoAnswerRecord = {
  id: string;
  question_id: string;
  answer: string;
  is_correct: boolean;
  grading_status: WorkshopVideoAnswerStatus;
  feedback: string | null;
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
  source_type: "SUPABASE" | "GOOGLE_DRIVE";
  mime_type: string | null;
  duration_seconds: number | null;
  order: number;
  questions: WorkshopVideoQuestionPublic[];
  viewed: boolean;
  watch_completed: boolean;
  attempt: WorkshopVideoAttemptSummary | null;
};

export const VIDEO_BUCKET = "workshop-videos";
export const MAX_VIDEO_FILE = 350 * 1024 * 1024;
export const MAX_QUESTIONS_PER_VIDEO = 30;

const SAFE_EXTENSIONS = new Set(["mp4", "webm", "ogg", "ogv", "mov", "m4v", "mkv"]);

const MIME_EXTENSION: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
};

/** Pick a safe storage extension from the original filename, falling back to the MIME type. */
export function videoExtension(filename: string, mime: string): string {
  const fromName = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
  if (SAFE_EXTENSIONS.has(fromName)) return fromName;
  return MIME_EXTENSION[mime] ?? "mp4";
}

export function cleanQuestionOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 8);
}

/** mm:ss for timestamps and durations shown throughout the video UI. */
export function formatVideoTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}
