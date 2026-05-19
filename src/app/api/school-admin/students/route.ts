// src/app/api/school-admin/students/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

function scoreToPct(score: number, total: number): number {
  if (total <= 0) return 0;
  if (score > total) return Math.min(100, Math.round(score));
  return Math.round((score / total) * 100);
}

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Fetch students + roadmap in parallel
  const [students, roadmap] = await Promise.all([
    prisma.student.findMany({
      where: { school_id: auth.school.id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        onboarding_status: true,
        created_at: true,
        profile: { select: { full_name: true, avatar_url: true } },
        class: { select: { id: true, name: true } },
        moduleAttempts: {
          orderBy: { created_at: "desc" },
          select: {
            score: true,
            total: true,
            passed: true,
            created_at: true,
            module: {
              select: {
                id: true,
                title: true,
                order: true,
                stage: { select: { id: true, title: true, order: true } },
              },
            },
          },
        },
      },
    }),

    prisma.roadmap.findUnique({
      where: { school_id: auth.school.id },
      select: {
        stages: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            modules: {
              orderBy: { order: "asc" },
              select: { id: true, title: true, order: true },
            },
          },
        },
      },
    }),
  ]);

  // Pre-compute roadmap lookups once — not per student
  const totalModules = roadmap?.stages.reduce((sum, s) => sum + s.modules.length, 0) ?? 0;

  // stageModuleSet: stageId → Set of moduleIds in that stage
  const stageModuleSet = new Map<string, Set<string>>();
  // moduleToStage: moduleId → stageId (for O(1) stage lookup per attempt)
  const moduleToStage = new Map<string, string>();

  if (roadmap) {
    for (const stage of roadmap.stages) {
      const moduleIds = new Set(stage.modules.map(m => m.id));
      stageModuleSet.set(stage.id, moduleIds);
      for (const m of stage.modules) {
        moduleToStage.set(m.id, stage.id);
      }
    }
  }

  const shaped = students.map((s) => {
    const attempts = s.moduleAttempts;

    // Deduplicate: keep only the best attempt per module
    // (student may retry — we want the most recent which is already ordered by created_at desc)
    const seenModules = new Set<string>();
    const uniqueAttempts = attempts.filter(a => {
      if (seenModules.has(a.module.id)) return false;
      seenModules.add(a.module.id);
      return true;
    });

    // All completed modules (in this system, completing = attempting)
    const completedModuleIds = new Set(uniqueAttempts.map(a => a.module.id));

    // Average score across unique attempts
    const avgScore = uniqueAttempts.length > 0
      ? Math.round(uniqueAttempts.reduce((sum, a) => sum + scoreToPct(a.score, a.total), 0) / uniqueAttempts.length)
      : null;

    // Progress %
    const progressPct = totalModules > 0
      ? Math.round((completedModuleIds.size / totalModules) * 100)
      : 0;

    // Current position: first stage with uncompleted modules
    let currentStage: { id: string; title: string; order: number } | null = null;
    let currentModule: { id: string; title: string } | null = null;

    if (roadmap) {
      for (const stage of roadmap.stages) {
        const nextModule = stage.modules.find(m => !completedModuleIds.has(m.id));
        if (nextModule) {
          currentStage = { id: stage.id, title: stage.title, order: stage.order };
          currentModule = { id: nextModule.id, title: nextModule.title };
          break;
        }
      }
    }

    // Stage progress: count completed modules per stage using the roadmap as source of truth
    const stageProgress = roadmap?.stages.map(stage => {
      const completed = stage.modules.filter(m => completedModuleIds.has(m.id)).length;
      return {
        title: stage.title,
        passed: completed,
        total: stage.modules.length,
      };
    }) ?? [];

    // Recent attempts (last 5 unique)
    const recentAttempts = uniqueAttempts.slice(0, 5).map(a => ({
      module_title: a.module.title,
      stage_title: a.module.stage.title,
      score_pct: scoreToPct(a.score, a.total),
      passed: a.passed,
      date: a.created_at,
    }));

    return {
      id: s.id,
      onboarding_status: s.onboarding_status,
      created_at: s.created_at,
      profile: s.profile,
      class: s.class,
      attempts_count: uniqueAttempts.length,
      passed_count: completedModuleIds.size,
      total_modules: totalModules,
      avg_score: avgScore,
      progress_pct: progressPct,
      current_stage: currentStage,
      current_module: currentModule,
      stage_progress: stageProgress,
      recent_attempts: recentAttempts,
    };
  });

  return NextResponse.json({ students: shaped, total_modules: totalModules });
}