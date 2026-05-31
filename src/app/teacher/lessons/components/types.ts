// shared types for the teacher lesson editor
export type QuestionType = "MCQ" | "TF" | "WRITTEN" | "MATCHING";
export type ContentType = "TEXT" | "IMAGE" | "VIDEO";

export interface ClassRef {
  id: string;
  name: string;
}

export interface QuizRef {
  id: string;
  name: string;
  class_id?: string;
}

export interface LessonContent {
  id: string;
  type: ContentType;
  order: number;
  body?: string | null;
  image_url?: string | null;
  alt_text?: string | null;
  storage_path?: string | null;
  video_url?: string | null;
  video_title?: string | null;
}

export interface QuestionOption {
  id: string;
  text: string;
  order: number;
}

export interface MatchingPairRef {
  id: string;
  left: string;
  right: string;
  order: number;
}

export interface LessonQuestion {
  id: string;
  type: QuestionType;
  text: string;
  correct_answer?: string | null;
  order: number;
  options?: QuestionOption[];
  matching_pairs?: MatchingPairRef[];
}

export interface LessonFull {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  is_graded: boolean;
  linked_quiz_id: string | null;
  class_id: string;
  class: ClassRef;
  linked_quiz: { id: string; name: string } | null;
  contents: LessonContent[];
  questions: LessonQuestion[];
}

export interface LessonListItem {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  is_graded: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  class: ClassRef;
  linked_quiz: { id: string; name: string } | null;
  _count: { contents: number; questions: number; attempts: number };
}
