// api/teacher/route.ts — base teacher dashboard payload + onboarding status.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await prisma.teacher.findUnique({
    where: { id: auth.teacher.id },
    select: {
      id: true,
      school_id: true,
      onboarding_status: true,
      profile: { select: { id: true, full_name: true } },
      school: {
        select: {
          id: true, name: true, name_alt: true,
          language: true, slug: true, is_active: true,
        },
      },
      classes: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          students: {
            orderBy: { profile: { full_name: "asc" } },
            select: { id: true, profile: { select: { full_name: true } } },
          },
        },
      },
      application: {
        select: {
          id: true,
          submitted_at: true,
          reviewed_at: true,
          reviewer_notes: true,
        },
      },
    },
  });

  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  if (!teacher.school?.is_active)
    return NextResponse.json({ error: "school_deactivated", school: teacher.school });

  const [lessonTotal, quizTotal, pendingLessons, pendingQuizzes, announcementTotal, memberships, communityPosts] =
    await Promise.all([
      prisma.lesson.count({ where: { teacher_id: teacher.id } }),
      prisma.quiz.count({ where: { teacher_id: teacher.id } }),
      prisma.lesson.count({ where: { teacher_id: teacher.id, review_status: "PENDING_REVIEW" } }),
      prisma.quiz.count({ where: { teacher_id: teacher.id, review_status: "PENDING_REVIEW" } }),
      prisma.announcement.count({ where: { teacher_id: teacher.id } }),
      prisma.teacherGroupMember.findMany({
        where: { teacher_id: teacher.id },
        orderBy: { joined_at: "desc" },
        select: {
          joined_at: true,
          group: {
            select: {
              id: true,
              name: true,
              description: true,
              updated_at: true,
              _count: { select: { members: true, announcements: true, assessments: true } },
            },
          },
        },
      }),
      prisma.post.findMany({
        where: { school_id: teacher.school_id, reply_to_id: null },
        orderBy: { created_at: "desc" },
        take: 5,
        select: {
          id: true,
          content: true,
          image_url: true,
          created_at: true,
          author: { select: { full_name: true, role: true, avatar_url: true } },
          _count: { select: { replies: true, reactions: true } },
        },
      }),
    ]);

  const groupIds = memberships.map((m) => m.group.id);
  const groupAnnouncements = groupIds.length
    ? await prisma.teacherGroupAnnouncement.findMany({
        where: { group_id: { in: groupIds } },
        orderBy: { created_at: "desc" },
        take: 5,
        select: {
          id: true,
          content: true,
          created_at: true,
          group: { select: { id: true, name: true } },
          author: { select: { full_name: true, role: true, avatar_url: true } },
        },
      })
    : [];

  return NextResponse.json({
    profile: teacher.profile,
    school: teacher.school,
    classes: teacher.classes,
    onboarding_status: teacher.onboarding_status,
    application: teacher.application,
    dashboard: {
      totals: {
        classes: teacher.classes.length,
        students: teacher.classes.reduce((sum, cls) => sum + cls.students.length, 0),
        groups: memberships.length,
        lessons: lessonTotal,
        quizzes: quizTotal,
        pending_review: pendingLessons + pendingQuizzes,
        announcements: announcementTotal,
      },
      groups: memberships.map((m) => ({
        id: m.group.id,
        name: m.group.name,
        description: m.group.description,
        updated_at: m.group.updated_at,
        joined_at: m.joined_at,
        member_count: m.group._count.members,
        announcement_count: m.group._count.announcements,
        assessment_count: m.group._count.assessments,
      })),
      group_announcements: groupAnnouncements,
      community_posts: communityPosts,
    },
  });
}
