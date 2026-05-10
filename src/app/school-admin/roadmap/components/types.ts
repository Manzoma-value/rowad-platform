export type QuestionType = "MCQ" | "TF" | "WRITTEN" | "MATCHING";
export type ContentType = "TEXT" | "IMAGE" | "VIDEO";

export interface Option {
  id: string;
  text: string;
  order: number;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
  order: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  correct_answer: string | null;
  options: Option[];
  matching_pairs: MatchingPair[];
  order: number;
}

export interface ModuleContent {
  id: string;
  type: ContentType;
  order: number;
  body?: string | null;
  image_url?: string | null;
  alt_text?: string | null;
  video_url?: string | null;
  video_title?: string | null;
}

export interface Module {
  id: string;
  title: string;
  order: number;
  contents: ModuleContent[];
  questions: Question[];
  _count?: { attempts: number };
}

export interface Stage {
  id: string;
  title: string;
  order: number;
  modules: Module[];
}

export interface Roadmap {
  id: string;
  title: string;
  stages: Stage[];
}