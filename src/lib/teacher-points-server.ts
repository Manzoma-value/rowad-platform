// ─────────────────────────────────────────────────────────────────────
// Supervisor points — the measurement half.
//
// Reads live platform activity for one school and turns it into the raw
// { value, total } pairs the scoring engine in `teacher-points.ts` weights.
// Nothing is cached or denormalised: an admin who fixes a beneficiary's
// record sees the leaderboard move on the next load.
//
// Everything runs as a fixed set of aggregate queries fired in parallel —
// never one query per supervisor.
// ─────────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { effectiveWorkshopSchedule, workshopDateKey } from "@/lib/workshops";
import type { MetricKey, MetricRaw } from "@/lib/teacher-points";

export type TeacherPointsRow = {
  teacher_id: string;
  profile_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  onboarding_status: string;
  created_at: string;
  groups: { id: string; name: string }[];
  workshops: { id: string; title: string }[];
  raws: Record<MetricKey, MetricRaw>;
};

export type TeacherPointsData = {
  teachers: TeacherPointsRow[];
  groups: { id: string; name: string }[];
  workshops: { id: string; title: string }[];
};

const zero = (): MetricRaw => ({ value: 0, total: 0 });

function emptyRaws(): Record<MetricKey, MetricRaw> {
  return {
    REGISTRATION_COMPLETE: zero(),
    GROUP_MEMBERSHIP: zero(),
    WORKSHOP_ENROLLMENT: zero(),
    STUDENTS_REGISTERED: zero(),
    STUDENT_RECORDS_COMPLETE: zero(),
    WORKSHOP_REQUIREMENTS: zero(),
    MATERIAL_ENGAGEMENT: zero(),
    VIDEO_ANSWERS: zero(),
    WORKSHOP_QUIZZES: zero(),
    LESSONS_CREATED: zero(),
    QUIZZES_CREATED: zero(),
    STUDENT_ENGAGEMENT: zero(),
    TRAIT_EVALUATIONS: zero(),
    PEER_RATINGS_GIVEN: zero(),
    WORKSHOP_ATTENDANCE: zero(),
    WORKSHOP_COMPLETION: zero(),
    CONTENT_APPROVAL: zero(),
    VOTES_PARTICIPATION: zero(),
    COMMUNITY_POSTS: zero(),
    GROUP_COMMUNITY: zero(),
    LEARNING_GAMES: zero(),
  };
}

export async function collectTeacherPoints(schoolId: string): Promise<TeacherPointsData> {
  const today = workshopDateKey();

  const [
    teachers,
    workshops,
    students,
    attendanceRows,
    completionRows,
    requirementCompletionRows,
    videoViewRows,
    videoAttemptRows,
    quizAttemptRows,
    traitPairs,
    lessonRows,
    quizRows,
    ratingRows,
    groupAssessments,
    voteCount,
    voteResponseRows,
    postRows,
    groupMessageRows,
    miniGameRows,
    modelGameRows,
  ] = await Promise.all([
    prisma.teacher.findMany({
      where: { school_id: schoolId },
      select: {
        id: true,
        created_at: true,
        onboarding_status: true,
        workshop_signup_id: true,
        profile: { select: { id: true, full_name: true, email: true, avatar_url: true } },
        application: { select: { submitted_at: true } },
        group_memberships: { select: { group: { select: { id: true, name: true } } } },
        classes: { select: { id: true } },
        workshop_enrollments: {
          where: { status: "APPROVED" },
          select: { workshop_id: true },
        },
      },
    }),

    prisma.workshop.findMany({
      where: { school_id: schoolId },
      select: {
        id: true,
        title: true,
        schedule: true,
        start_date: true,
        end_date: true,
        videos: { select: { _count: { select: { questions: true } } } },
        requirements: {
          select: {
            id: true,
            quiz: { select: { _count: { select: { questions: true } } } },
          },
        },
      },
    }),

    prisma.student.findMany({
      where: { class: { school_id: schoolId } },
      select: {
        class_id: true,
        onboarding_status: true,
        _count: {
          select: { quiz_attempts: true, lesson_attempts: true, support_contacts: true },
        },
      },
    }),

    prisma.workshopAttendance.groupBy({
      by: ["teacher_id", "workshop_id"],
      where: { workshop: { school_id: schoolId } },
      _count: { _all: true },
    }),

    prisma.workshopCompletion.groupBy({
      by: ["teacher_id"],
      where: { workshop: { school_id: schoolId } },
      _count: { _all: true },
    }),

    prisma.workshopRequirementCompletion.groupBy({
      by: ["teacher_id"],
      where: { requirement: { workshop: { school_id: schoolId } } },
      _count: { _all: true },
    }),

    prisma.workshopVideoView.groupBy({
      by: ["teacher_id"],
      where: { video: { workshop: { school_id: schoolId } } },
      _count: { _all: true },
    }),

    prisma.workshopVideoAttempt.groupBy({
      by: ["teacher_id"],
      where: { video: { workshop: { school_id: schoolId } } },
      _sum: { score: true },
    }),

    prisma.workshopQuizAttempt.groupBy({
      by: ["teacher_id"],
      where: { quiz: { requirement: { workshop: { school_id: schoolId } } } },
      _sum: { score: true },
    }),

    prisma.traitAssessment.groupBy({
      by: ["teacher_id", "student_id"],
      where: { teacher: { school_id: schoolId } },
    }),

    prisma.lesson.groupBy({
      by: ["teacher_id", "review_status"],
      where: { school_id: schoolId },
      _count: { _all: true },
    }),

    prisma.quiz.groupBy({
      by: ["teacher_id", "review_status"],
      where: { school_id: schoolId },
      _count: { _all: true },
    }),

    prisma.assessmentRating.groupBy({
      by: ["rater_teacher_id"],
      where: { assessment: { school_id: schoolId } },
      _count: { _all: true },
    }),

    prisma.groupAssessment.findMany({
      where: { school_id: schoolId },
      select: {
        id: true,
        group_id: true,
        target_groups: { select: { group_id: true } },
      },
    }),

    prisma.vote.count({ where: { school_id: schoolId } }),

    prisma.voteResponse.groupBy({
      by: ["teacher_id"],
      where: { vote: { school_id: schoolId } },
      _count: { _all: true },
    }),

    prisma.post.groupBy({
      by: ["author_id"],
      where: { school_id: schoolId },
      _count: { _all: true },
    }),

    prisma.teacherGroupAnnouncement.groupBy({
      by: ["author_id"],
      where: { school_id: schoolId },
      _count: { _all: true },
    }),

    prisma.miniGameSubmission.groupBy({
      by: ["profile_id"],
      where: { school_id: schoolId },
      _count: { _all: true },
    }),

    prisma.rowadGameSubmission.groupBy({
      by: ["profile_id"],
      where: { school_id: schoolId },
      _count: { _all: true },
    }),
  ]);

  // ── Group membership → member ids, needed for the peer-rating denominator.
  const groupMembers = new Map<string, Set<string>>();
  for (const teacher of teachers) {
    for (const membership of teacher.group_memberships) {
      const set = groupMembers.get(membership.group.id) ?? new Set<string>();
      set.add(teacher.id);
      groupMembers.set(membership.group.id, set);
    }
  }

  // ── Per-workshop denominators: elapsed work days, videos, video questions,
  //    quiz questions and required steps.
  type WorkshopFacts = {
    id: string;
    title: string;
    elapsed_days: number;
    videos: number;
    video_questions: number;
    quiz_questions: number;
    requirements: number;
  };
  const workshopFacts = new Map<string, WorkshopFacts>();
  for (const workshop of workshops) {
    const schedule = effectiveWorkshopSchedule(workshop.schedule, workshop.start_date, workshop.end_date);
    workshopFacts.set(workshop.id, {
      id: workshop.id,
      title: workshop.title,
      // Days still in the future must not count against anyone.
      elapsed_days: schedule.filter((day) => day.type === "WORK" && day.date <= today).length,
      videos: workshop.videos.length,
      video_questions: workshop.videos.reduce((sum, video) => sum + video._count.questions, 0),
      quiz_questions: workshop.requirements.reduce(
        (sum, requirement) => sum + (requirement.quiz?._count.questions ?? 0),
        0,
      ),
      requirements: workshop.requirements.length,
    });
  }

  // ── Beneficiaries rolled up per group (class).
  type ClassFacts = { total: number; complete: number; engaged: number };
  const classFacts = new Map<string, ClassFacts>();
  for (const student of students) {
    if (!student.class_id) continue;
    const facts = classFacts.get(student.class_id) ?? { total: 0, complete: 0, engaged: 0 };
    facts.total += 1;
    if (student.onboarding_status === "CLASS_ASSIGNED" && student._count.support_contacts > 0) {
      facts.complete += 1;
    }
    if (student._count.quiz_attempts + student._count.lesson_attempts > 0) facts.engaged += 1;
    classFacts.set(student.class_id, facts);
  }

  // ── Simple teacher-keyed counters.
  const attendanceByTeacher = new Map<string, number>();
  for (const row of attendanceRows) {
    attendanceByTeacher.set(row.teacher_id, (attendanceByTeacher.get(row.teacher_id) ?? 0) + row._count._all);
  }
  const countBy = <T extends { teacher_id: string; _count: { _all: number } }>(rows: T[]) =>
    new Map(rows.map((row) => [row.teacher_id, row._count._all]));
  const sumBy = <T extends { teacher_id: string; _sum: { score: number | null } }>(rows: T[]) =>
    new Map(rows.map((row) => [row.teacher_id, row._sum.score ?? 0]));

  const completionByTeacher = countBy(completionRows);
  const requirementsByTeacher = countBy(requirementCompletionRows);
  const videoViewsByTeacher = countBy(videoViewRows);
  const votesByTeacher = countBy(voteResponseRows);
  const videoScoreByTeacher = sumBy(videoAttemptRows);
  const quizScoreByTeacher = sumBy(quizAttemptRows);

  const traitStudentsByTeacher = new Map<string, number>();
  for (const pair of traitPairs) {
    traitStudentsByTeacher.set(pair.teacher_id, (traitStudentsByTeacher.get(pair.teacher_id) ?? 0) + 1);
  }

  const ratingsGivenByTeacher = new Map(
    ratingRows.map((row) => [row.rater_teacher_id, row._count._all]),
  );

  type ReviewCounts = { approved: number; reviewed: number };
  const foldReview = (
    rows: { teacher_id: string; review_status: string; _count: { _all: number } }[],
  ) => {
    const map = new Map<string, ReviewCounts>();
    for (const row of rows) {
      const entry = map.get(row.teacher_id) ?? { approved: 0, reviewed: 0 };
      if (row.review_status === "APPROVED") {
        entry.approved += row._count._all;
        entry.reviewed += row._count._all;
      } else if (row.review_status === "REJECTED" || row.review_status === "PENDING_REVIEW") {
        // Anything that left DRAFT counts towards "did it pass review".
        entry.reviewed += row._count._all;
      }
      map.set(row.teacher_id, entry);
    }
    return map;
  };
  const lessonsByTeacher = foldReview(lessonRows);
  const quizzesByTeacher = foldReview(quizRows);

  const byProfile = (rows: { author_id: string; _count: { _all: number } }[]) =>
    new Map(rows.map((row) => [row.author_id, row._count._all]));
  const postsByProfile = byProfile(postRows);
  const groupMessagesByProfile = byProfile(groupMessageRows);
  const gamesByProfile = new Map<string, number>();
  for (const row of [...miniGameRows, ...modelGameRows]) {
    gamesByProfile.set(row.profile_id, (gamesByProfile.get(row.profile_id) ?? 0) + row._count._all);
  }

  // ── Peer-rating denominator: for each supervisor, how many colleagues the
  //    open measurement models actually ask them to rate. A rating only
  //    counts when rater and target share the group the model targets, so
  //    the expectation is the union of the members of their targeted groups.
  const expectedRatings = new Map<string, number>();
  for (const assessment of groupAssessments) {
    const targetGroupIds = new Set<string>(assessment.target_groups.map((link) => link.group_id));
    if (targetGroupIds.size === 0) targetGroupIds.add(assessment.group_id);
    for (const teacher of teachers) {
      const own = teacher.group_memberships
        .map((membership) => membership.group.id)
        .filter((groupId) => targetGroupIds.has(groupId));
      if (own.length === 0) continue;
      const targets = new Set<string>();
      for (const groupId of own) {
        for (const memberId of groupMembers.get(groupId) ?? []) targets.add(memberId);
      }
      expectedRatings.set(teacher.id, (expectedRatings.get(teacher.id) ?? 0) + targets.size);
    }
  }

  const rows: TeacherPointsRow[] = teachers.map((teacher) => {
    const raws = emptyRaws();

    // Which workshops is this supervisor actually part of?
    const workshopIds = new Set<string>();
    for (const enrollment of teacher.workshop_enrollments) workshopIds.add(enrollment.workshop_id);
    if (teacher.workshop_signup_id) workshopIds.add(teacher.workshop_signup_id);
    const own = [...workshopIds]
      .map((id) => workshopFacts.get(id))
      .filter((facts): facts is WorkshopFacts => Boolean(facts));

    const workDays = own.reduce((sum, facts) => sum + facts.elapsed_days, 0);
    const videoCount = own.reduce((sum, facts) => sum + facts.videos, 0);
    const videoQuestions = own.reduce((sum, facts) => sum + facts.video_questions, 0);
    const quizQuestions = own.reduce((sum, facts) => sum + facts.quiz_questions, 0);
    const requirementCount = own.reduce((sum, facts) => sum + facts.requirements, 0);

    // Beneficiaries across every group the supervisor leads.
    let studentTotal = 0;
    let studentComplete = 0;
    let studentEngaged = 0;
    for (const klass of teacher.classes) {
      const facts = classFacts.get(klass.id);
      if (!facts) continue;
      studentTotal += facts.total;
      studentComplete += facts.complete;
      studentEngaged += facts.engaged;
    }

    const lessons = lessonsByTeacher.get(teacher.id) ?? { approved: 0, reviewed: 0 };
    const quizzes = quizzesByTeacher.get(teacher.id) ?? { approved: 0, reviewed: 0 };

    // I · الالتزام والاستعداد
    raws.REGISTRATION_COMPLETE = {
      value: teacher.onboarding_status === "ACTIVE" && teacher.application?.submitted_at ? 1 : 0,
      total: 1,
    };
    raws.GROUP_MEMBERSHIP = { value: teacher.group_memberships.length > 0 ? 1 : 0, total: 1 };
    raws.WORKSHOP_ENROLLMENT = { value: workshopIds.size > 0 ? 1 : 0, total: 1 };

    // II · إدارة المجموعة واستكمال المتطلبات
    raws.STUDENTS_REGISTERED = { value: studentTotal, total: studentTotal };
    raws.STUDENT_RECORDS_COMPLETE = { value: studentComplete, total: studentTotal };
    raws.WORKSHOP_REQUIREMENTS = {
      value: Math.min(requirementsByTeacher.get(teacher.id) ?? 0, requirementCount),
      total: requirementCount,
    };

    // III · الأثر التعليمي ونقل المفهوم
    raws.MATERIAL_ENGAGEMENT = {
      value: Math.min(videoViewsByTeacher.get(teacher.id) ?? 0, videoCount),
      total: videoCount,
    };
    raws.VIDEO_ANSWERS = {
      value: Math.min(videoScoreByTeacher.get(teacher.id) ?? 0, videoQuestions),
      total: videoQuestions,
    };
    raws.WORKSHOP_QUIZZES = {
      value: Math.min(quizScoreByTeacher.get(teacher.id) ?? 0, quizQuestions),
      total: quizQuestions,
    };
    raws.LESSONS_CREATED = { value: lessons.approved, total: lessons.reviewed };
    raws.QUIZZES_CREATED = { value: quizzes.approved, total: quizzes.reviewed };
    raws.STUDENT_ENGAGEMENT = { value: studentEngaged, total: studentTotal };

    // IV · التطبيق والتشغيل
    raws.TRAIT_EVALUATIONS = {
      value: Math.min(traitStudentsByTeacher.get(teacher.id) ?? 0, studentTotal || Number.MAX_SAFE_INTEGER),
      total: studentTotal,
    };
    raws.PEER_RATINGS_GIVEN = {
      value: ratingsGivenByTeacher.get(teacher.id) ?? 0,
      total: expectedRatings.get(teacher.id) ?? 0,
    };

    // V · اللقاء الحضوري والتحقق من الأثر
    raws.WORKSHOP_ATTENDANCE = {
      value: Math.min(attendanceByTeacher.get(teacher.id) ?? 0, workDays || Number.MAX_SAFE_INTEGER),
      total: workDays,
    };
    raws.WORKSHOP_COMPLETION = {
      value: Math.min(completionByTeacher.get(teacher.id) ?? 0, workshopIds.size),
      total: workshopIds.size,
    };

    // VI · الجودة والتقييم
    raws.CONTENT_APPROVAL = {
      value: lessons.approved + quizzes.approved,
      total: lessons.reviewed + quizzes.reviewed,
    };
    raws.VOTES_PARTICIPATION = {
      value: Math.min(votesByTeacher.get(teacher.id) ?? 0, voteCount),
      total: voteCount,
    };

    // VII · المبادرة والتميز
    raws.COMMUNITY_POSTS = {
      value: postsByProfile.get(teacher.profile.id) ?? 0,
      total: postsByProfile.get(teacher.profile.id) ?? 0,
    };
    raws.GROUP_COMMUNITY = {
      value: groupMessagesByProfile.get(teacher.profile.id) ?? 0,
      total: groupMessagesByProfile.get(teacher.profile.id) ?? 0,
    };
    raws.LEARNING_GAMES = {
      value: gamesByProfile.get(teacher.profile.id) ?? 0,
      total: gamesByProfile.get(teacher.profile.id) ?? 0,
    };

    return {
      teacher_id: teacher.id,
      profile_id: teacher.profile.id,
      full_name: teacher.profile.full_name,
      email: teacher.profile.email,
      avatar_url: teacher.profile.avatar_url,
      onboarding_status: teacher.onboarding_status,
      created_at: teacher.created_at.toISOString(),
      groups: teacher.group_memberships.map((membership) => membership.group),
      workshops: own.map((facts) => ({ id: facts.id, title: facts.title })),
      raws,
    };
  });

  const groupNames = new Map<string, string>();
  for (const row of rows) {
    for (const group of row.groups) groupNames.set(group.id, group.name);
  }

  return {
    teachers: rows,
    groups: [...groupNames].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "ar")),
    workshops: workshops.map((workshop) => ({ id: workshop.id, title: workshop.title })),
  };
}
