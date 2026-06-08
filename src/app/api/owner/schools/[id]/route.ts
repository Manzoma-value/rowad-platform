// api/owner/schools/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { resolveFeatures } from "@/lib/features";

export const revalidate = 60;

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || profile.role !== "OWNER") return null;
  return profile;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;

  const school = await prisma.school.findUnique({
    where: { id },
    select: {
      id: true, name: true, slug: true, description: true,
      language: true, color_primary: true, color_secondary: true, color_bg: true,
      features: true, is_active: true,
      created_at: true,
      admin: { select: { id: true, full_name: true } },
      teachers: {
        select: {
          id: true,
          profile: { select: { full_name: true } },
          classes: { select: { id: true, name: true } },
        },
      },
      students: {
        select: {
          id: true,
          profile: { select: { full_name: true } },
          class: { select: { id: true, name: true } },
        },
      },
      classes: {
        select: {
          id: true, name: true,
          teacher: { select: { profile: { select: { full_name: true } } } },
          _count: { select: { students: true } },
        },
      },
    },
  });

  if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Return features as a fully-resolved map (all keys present) so the UI can
  // render every toggle without guessing defaults.
  return NextResponse.json({
    school: { ...school, features: resolveFeatures(school.features) },
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Resolve params and body in parallel
  const [{ id }, body] = await Promise.all([
    context.params,
    req.json(),
  ]);

  const updateData: Record<string, unknown> = {};
  if (body.language        !== undefined) updateData.language        = body.language;
  if (body.description     !== undefined) updateData.description     = body.description?.trim() || null;
  if (body.name            !== undefined) updateData.name            = body.name.trim();
  if (body.admin_id        !== undefined) updateData.admin_id        = body.admin_id || null;
  if (body.color_primary   !== undefined) updateData.color_primary   = body.color_primary;
  if (body.color_secondary !== undefined) updateData.color_secondary = body.color_secondary;
  if (body.color_bg        !== undefined) updateData.color_bg        = body.color_bg;
  if (body.is_active       !== undefined) updateData.is_active       = Boolean(body.is_active);

  // Features: sanitize through resolveFeatures so only known keys with boolean
  // values are persisted (stores the full resolved map — predictable shape).
  if (body.features !== undefined) {
    updateData.features = resolveFeatures(body.features);
  }

  if (body.slug !== undefined) {
    const newSlug = body.slug.trim();
    const existing = await prisma.school.findFirst({
      where: { slug: newSlug, NOT: { id } },
      select: { id: true },
    });
    if (existing)
      return NextResponse.json({ error: "هذا الرابط مستخدم بالفعل" }, { status: 400 });
    updateData.slug = newSlug;
  }

  const school = await prisma.school.update({
    where: { id },
    data: updateData,
    select: {
      id: true, name: true, slug: true, description: true,
      language: true, color_primary: true, color_secondary: true, color_bg: true,
      features: true, is_active: true,
      admin: { select: { id: true, full_name: true } },
    },
  });

  return NextResponse.json({
    school: { ...school, features: resolveFeatures(school.features) },
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;

  // Verify school exists
  const school = await prisma.school.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete all related data in the correct order (children first)
  // Prisma doesn't cascade by default for non-relation deletes.
  await prisma.$transaction(async (tx) => {
    // 1. Quiz/lesson/assessment answers & attempts (deepest children)
    await tx.quizAnswer.deleteMany({ where: { attempt: { quiz: { school_id: id } } } });
    await tx.quizAttempt.deleteMany({ where: { quiz: { school_id: id } } });
    await tx.quizOption.deleteMany({ where: { question: { quiz: { school_id: id } } } });
    await tx.quizQuestion.deleteMany({ where: { quiz: { school_id: id } } });
    await tx.quiz.deleteMany({ where: { school_id: id } });

    await tx.lessonAnswer.deleteMany({ where: { attempt: { lesson: { school_id: id } } } });
    await tx.lessonAttempt.deleteMany({ where: { lesson: { school_id: id } } });
    await tx.lessonMatchingPair.deleteMany({ where: { question: { lesson: { school_id: id } } } });
    await tx.lessonQuestionOption.deleteMany({ where: { question: { lesson: { school_id: id } } } });
    await tx.lessonQuestion.deleteMany({ where: { lesson: { school_id: id } } });
    await tx.lessonContent.deleteMany({ where: { lesson: { school_id: id } } });
    await tx.lesson.deleteMany({ where: { school_id: id } });

    await tx.assessmentAnswer.deleteMany({ where: { attempt: { assessment: { school_id: id } } } });
    await tx.assessmentAttempt.deleteMany({ where: { assessment: { school_id: id } } });
    await tx.assessmentOption.deleteMany({ where: { question: { assessment: { school_id: id } } } });
    await tx.assessmentQuestion.deleteMany({ where: { assessment: { school_id: id } } });
    await tx.assessment.deleteMany({ where: { school_id: id } });

    await tx.postReaction.deleteMany({ where: { post: { school_id: id } } });
    await tx.post.deleteMany({ where: { school_id: id } });

    await tx.announcement.deleteMany({ where: { school_id: id } });
    await tx.invite.deleteMany({ where: { school_id: id } });

    // Students & teachers (remove from classes first)
    await tx.student.deleteMany({ where: { school_id: id } });
    await tx.teacher.deleteMany({ where: { school_id: id } });
    await tx.class.deleteMany({ where: { school_id: id } });

    // Roadmap chain
    const roadmap = await tx.roadmap.findUnique({ where: { school_id: id }, select: { id: true } });
    if (roadmap) {
      await tx.moduleAnswer.deleteMany({ where: { attempt: { module: { stage: { roadmap_id: roadmap.id } } } } });
      await tx.moduleAttempt.deleteMany({ where: { module: { stage: { roadmap_id: roadmap.id } } } });
      await tx.matchingPair.deleteMany({ where: { question: { module: { stage: { roadmap_id: roadmap.id } } } } });
      await tx.roadmapQuestionOption.deleteMany({ where: { question: { module: { stage: { roadmap_id: roadmap.id } } } } });
      await tx.roadmapQuestion.deleteMany({ where: { module: { stage: { roadmap_id: roadmap.id } } } });
      await tx.moduleContent.deleteMany({ where: { module: { stage: { roadmap_id: roadmap.id } } } });
      await tx.roadmapModule.deleteMany({ where: { stage: { roadmap_id: roadmap.id } } });
      await tx.traitElement.deleteMany({ where: { trait: { stage: { roadmap_id: roadmap.id } } } });
      await tx.stageTrait.deleteMany({ where: { stage: { roadmap_id: roadmap.id } } });
      await tx.roadmapStage.deleteMany({ where: { roadmap_id: roadmap.id } });
      await tx.roadmap.delete({ where: { id: roadmap.id } });
    }

    // Finally the school
    await tx.school.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}