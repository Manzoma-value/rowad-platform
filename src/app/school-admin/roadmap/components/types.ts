// types.ts

export type QuestionType = "MCQ" | "TF" | "WRITTEN" | "MATCHING";
export type ContentType = "TEXT" | "IMAGE" | "VIDEO";
export type Maqsad = "DEEN" | "AQL" | "NAFS" | "NASL" | "MAL";

export interface TraitElement {
  id: string;
  text: string;
  order: number;
}

export interface StageTrait {
  id: string;
  maqsad: Maqsad;
  name: string;
  definition: string | null;
  elements: TraitElement[];
  module_main_traits?: { id: string; title: string }[];
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
  storage_path?: string | null;
}

export interface QuizOption {
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
  correct_answer?: string | null;
  order: number;
  options?: QuizOption[];
  matching_pairs?: MatchingPair[];
}

export interface Module {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  main_trait_id?: string | null;
  contents?: ModuleContent[];
  questions?: Question[];
  _count?: { attempts: number };
}

export interface Stage {
  id: string;
  title: string;
  order: number;
  modules: Module[];
  traits?: StageTrait[];
}

export interface Roadmap {
  id: string;
  title: string;
  stages: Stage[];
}