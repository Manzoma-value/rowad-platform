// Concept-progress resolver — answers "where is this student in the roadmap,
// and what do they need to do to advance?"
//
// A concept (RoadmapModule) is complete for a student when ALL of the following:
//   1. ModuleAttempt.passed = true            (admin questions answered)
//   2. Every APPROVED Lesson tied to the module has a completed LessonAttempt
//      for this student (and the lesson is in their class)
//   3. Every APPROVED Quiz tied to the module has a QuizAttempt for this
//      student (and the quiz is in their class)
//
// The student's CURRENT concept is the first incomplete module in roadmap
// order (stages → modules), gated sequentially.
import { prisma } from "@/lib/prisma";

export type ConceptProgress = {
  module_id: string;
  title: string;
  description: string | null;
  stage_id: string;
  stage_title: string;
  stage_order: number;
  module_order: number;
  // Per-requirement detail
  admin_questions_done: boolean;
  admin_total_questions: number;
  // Lessons + quizzes counts (only APPROVED, in student's class)
  lessons_total: number;
  lessons_done: number;
  quizzes_total: number;
  quizzes_done: number;
  is_complete: boolean;
};

export type StudentRoadmapState = {
  current: ConceptProgress | null;
  completed_module_ids: string[];
  upcoming_module_ids: string[];
  total_modules: number;
  completed_count: number;
};

export async function resolveStudentRoadmapState(args: {
  student_id: string;
  class_id: string | null;
  school_id: string;
}): Promise<StudentRoadmapState> {
  const { student_id, class_id, school_id } = args;

  // Pull the school's roadmap tree in order
  const roadmap = await prisma.roadmap.findUnique({
    where: { school_id },
    select: {
      stages: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          modules: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              _count: { select: { questions: true } },
            },
          },
        },
      },
    },
  });
  if (!roadmap) {
    return { current: null, completed_module_ids: [], upcoming_module_ids: [], total_modules: 0, completed_count: 0 };
  }

  const moduleIds = roadmap.stages.flatMap((s) => s.modules.map((m) => m.id));
  if (moduleIds.length === 0) {
    return { current: null, completed_module_ids: [], upcoming_module_ids: [], total_modules: 0, completed_count: 0 };
  }

  // Batch: ModuleAttempts (passed), approved Lessons + their attempts,
  // approved Quizzes + their attempts.
  const [attempts, lessons, lessonAttempts, quizzes, quizAttempts] = await Promise.all([
    prisma.moduleAttempt.findMany({
      where: { student_id, module_id: { in: moduleIds } },
      select: { module_id: true, passed: true },
    }),
    prisma.lesson.findMany({
      where: {
        module_id: { in: moduleIds },
        review_status: "APPROVED",
        is_legacy: false,
        ...(class_id ? { class_id } : { class_id: "__none__" }),
      },
      select: { id: true, module_id: true },
    }),
    prisma.lessonAttempt.findMany({
      where: { student_id, lesson: { module_id: { in: moduleIds } } },
      select: { lesson_id: true, completed_at: true },
    }),
    prisma.quiz.findMany({
      where: {
        module_id: { in: moduleIds },
        review_status: "APPROVED",
        is_legacy: false,
        ...(class_id ? { class_id } : { class_id: "__none__" }),
      },
      select: { id: true, module_id: true },
    }),
    prisma.quizAttempt.findMany({
      where: { student_id, quiz: { module_id: { in: moduleIds } } },
      select: { quiz_id: true },
    }),
  ]);

  const attemptMap = new Map(attempts.map((a) => [a.module_id, a.passed]));

  const lessonsByModule = new Map<string, string[]>();
  for (const l of lessons) {
    if (!l.module_id) continue;
    const arr = lessonsByModule.get(l.module_id) ?? [];
    arr.push(l.id);
    lessonsByModule.set(l.module_id, arr);
  }
  const completedLessonIds = new Set(
    lessonAttempts.filter((a) => a.completed_at !== null).map((a) => a.lesson_id),
  );

  const quizzesByModule = new Map<string, string[]>();
  for (const q of quizzes) {
    if (!q.module_id) continue;
    const arr = quizzesByModule.get(q.module_id) ?? [];
    arr.push(q.id);
    quizzesByModule.set(q.module_id, arr);
  }
  const attemptedQuizIds = new Set(quizAttempts.map((a) => a.quiz_id));

  function buildProgress(
    stage: { id: string; title: string; order: number },
    m: { id: string; title: string; description: string | null; order: number; _count: { questions: number } },
  ): ConceptProgress {
    const admin_total_questions = m._count.questions;
    const adminPassed = attemptMap.get(m.id) === true;
    // If the module has no questions, the admin step is trivially "done".
    const admin_questions_done = admin_total_questions === 0 ? true : adminPassed;

    const lessonIds = lessonsByModule.get(m.id) ?? [];
    const lessons_total = lessonIds.length;
    const lessons_done = lessonIds.filter((id) => completedLessonIds.has(id)).length;

    const quizIds = quizzesByModule.get(m.id) ?? [];
    const quizzes_total = quizIds.length;
    const quizzes_done = quizIds.filter((id) => attemptedQuizIds.has(id)).length;

    const is_complete =
      admin_questions_done && lessons_done === lessons_total && quizzes_done === quizzes_total;

    return {
      module_id: m.id,
      title: m.title,
      description: m.description,
      stage_id: stage.id,
      stage_title: stage.title,
      stage_order: stage.order,
      module_order: m.order,
      admin_questions_done,
      admin_total_questions,
      lessons_total,
      lessons_done,
      quizzes_total,
      quizzes_done,
      is_complete,
    };
  }

  const completed_module_ids: string[] = [];
  const upcoming_module_ids: string[] = [];
  let current: ConceptProgress | null = null;

  for (const stage of roadmap.stages) {
    for (const m of stage.modules) {
      const prog = buildProgress(stage, m);
      if (prog.is_complete) {
        completed_module_ids.push(m.id);
      } else if (!current) {
        current = prog;
      } else {
        upcoming_module_ids.push(m.id);
      }
    }
  }

  return {
    current,
    completed_module_ids,
    upcoming_module_ids,
    total_modules: moduleIds.length,
    completed_count: completed_module_ids.length,
  };
}
