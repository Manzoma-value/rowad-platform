import { prisma } from "@/lib/prisma";

export type JourneyRequirementStatus = {
  id: string;
  type: "VIDEO" | "QUIZ" | "MESSAGE" | "READING";
  title: string;
  description: string | null;
  order: number;
  is_required: boolean;
  min_length: number;
  completed: boolean;
  progress: number;
  quiz?: {
    id: string;
    title: string;
    description: string | null;
    passing_score: number;
    question_count: number;
    attempt: { score: number; total: number; completed_at: Date | null; passed_at: Date | null } | null;
  };
};

export type WorkshopJourney = {
  completed: boolean;
  percent: number;
  requirements: JourneyRequirementStatus[];
};

export async function workshopAccess(workshopId: string, schoolId: string, teacherId: string) {
  const workshop = await prisma.workshop.findFirst({
    where: { id: workshopId, school_id: schoolId },
    select: {
      id: true,
      enrollments: { where: { teacher_id: teacherId, status: "APPROVED" }, select: { id: true }, take: 1 },
      signed_up_teachers: { where: { id: teacherId }, select: { id: true }, take: 1 },
      attendance: { where: { teacher_id: teacherId }, select: { id: true }, take: 1 },
    },
  });
  if (!workshop) return null;
  return { workshop, hasAccess: workshop.enrollments.length > 0 || workshop.signed_up_teachers.length > 0 || workshop.attendance.length > 0 };
}

export async function getWorkshopJourney(workshopId: string, teacherId: string): Promise<WorkshopJourney> {
  const [requirements, videos, messages] = await Promise.all([
    prisma.workshopRequirement.findMany({
      where: { workshop_id: workshopId },
      orderBy: { order: "asc" },
      include: {
        quiz: {
          include: {
            _count: { select: { questions: true } },
            attempts: { where: { teacher_id: teacherId }, select: { score: true, total: true, completed_at: true, passed_at: true, _count: { select: { answers: true } } }, take: 1 },
          },
        },
        completions: { where: { teacher_id: teacherId }, select: { completed_at: true }, take: 1 },
      },
    }),
    prisma.workshopVideo.findMany({
      where: { workshop_id: workshopId },
      select: {
        id: true,
        questions: { select: { id: true } },
        views: { where: { teacher_id: teacherId }, select: { completed_at: true }, take: 1 },
        attempts: { where: { teacher_id: teacherId }, select: { completed_at: true }, take: 1 },
      },
    }),
    prisma.workshopMessage.findMany({ where: { workshop_id: workshopId, author_id: teacherId }, select: { body: true }, take: 200 }),
  ]);

  const hasVideos = videos.length > 0;
  const hasVideoRequirement = requirements.some((item) => item.type === "VIDEO");
  const effective = hasVideos && !hasVideoRequirement
    ? [{ id: "video-content", type: "VIDEO" as const, title: "Complete all workshop videos", description: "Watch every video and answer every question.", order: -1, is_required: true, min_length: 1, quiz: null, completions: [] }, ...requirements]
    : requirements;

  const videoDone = videos.length === 0 ? true : videos.every((video) =>
    !!video.views[0]?.completed_at && (video.questions.length === 0 || !!video.attempts[0]?.completed_at),
  );
  const rows: JourneyRequirementStatus[] = effective.map((item) => {
    const base = { id: item.id, type: item.type, title: item.title, description: item.description, order: item.order, is_required: item.is_required, min_length: item.min_length };
    if (item.type === "VIDEO") return { ...base, completed: videoDone, progress: videos.length === 0 ? 100 : Math.round((videos.filter((video) => !!video.views[0]?.completed_at && (video.questions.length === 0 || !!video.attempts[0]?.completed_at)).length / videos.length) * 100) };
    if (item.type === "MESSAGE") {
      const done = !!item.completions[0] || messages.some((message) => message.body.trim().length >= item.min_length);
      return { ...base, completed: done, progress: done ? 100 : 0 };
    }
    if (item.type === "READING") {
      const done = !!item.completions[0];
      return { ...base, completed: done, progress: done ? 100 : 0 };
    }
    const attempt = item.quiz?.attempts[0] ?? null;
    const done = !!attempt?.passed_at;
    const progress = item.quiz?._count.questions ? Math.round(((attempt?._count.answers ?? 0) / item.quiz._count.questions) * 100) : 0;
    return {
      ...base,
      completed: done,
      progress: done ? 100 : Math.min(95, progress),
      quiz: item.quiz ? { id: item.quiz.id, title: item.quiz.title, description: item.quiz.description, passing_score: item.quiz.passing_score, question_count: item.quiz._count.questions, attempt: attempt ? { score: attempt.score, total: attempt.total, completed_at: attempt.completed_at, passed_at: attempt.passed_at } : null } : undefined,
    };
  });
  const required = rows.filter((row) => row.is_required);
  const completed = required.length > 0 && required.every((row) => row.completed);
  const percent = required.length ? Math.round(required.reduce((sum, row) => sum + row.progress, 0) / required.length) : 0;
  if (completed) {
    await prisma.workshopCompletion.upsert({ where: { workshop_id_teacher_id: { workshop_id: workshopId, teacher_id: teacherId } }, create: { workshop_id: workshopId, teacher_id: teacherId }, update: {} }).catch(() => undefined);
  } else {
    await prisma.workshopCompletion.deleteMany({ where: { workshop_id: workshopId, teacher_id: teacherId } }).catch(() => undefined);
  }
  return { completed, percent, requirements: rows };
}

export async function canReadWorkshop(workshopId: string, schoolId: string, teacherId: string) {
  const access = await workshopAccess(workshopId, schoolId, teacherId);
  return access?.hasAccess ? access : null;
}
