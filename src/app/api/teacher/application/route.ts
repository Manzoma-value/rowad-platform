// api/teacher/application
//   GET  → returns the teacher's application (if any) + onboarding status
//   POST → creates the application and flips the teacher to UNDER_REVIEW.
//          Identity fields come from the profile created during QR signup.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import {
  APP_GENDERS,
  APP_CURRENT_ROLES,
  APP_QUALIFICATIONS,
  APP_EXPERIENCE_RANGES,
  APP_ACHIEVEMENT_SCOPES,
  APP_EXPERIENCE_AREAS,
  APP_TARGET_GROUPS,
  APP_CONTRIBUTIONS,
  APP_LANGUAGES,
  APP_LANG_LEVELS,
} from "@/lib/teacher-application";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const app = await prisma.teacherApplication.findUnique({
    where: { teacher_id: auth.teacher.id },
  });

  let draft: unknown = null;
  let draftUpdatedAt: Date | null = null;
  try {
    const savedDraft = await prisma.teacher.findUnique({
      where: { id: auth.teacher.id },
      select: { application_draft: true, application_draft_updated_at: true },
    });
    draft = savedDraft?.application_draft ?? null;
    draftUpdatedAt = savedDraft?.application_draft_updated_at ?? null;
  } catch {
    // Draft storage is optional during the migration rollout.
  }

  return NextResponse.json({
    onboarding_status: auth.teacher.onboarding_status,
    application: app,
    draft,
    draft_updated_at: draftUpdatedAt,
  });
}

function pickEnum<T extends readonly string[]>(
  raw: unknown,
  allowed: T,
): T[number] | null {
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw)
    ? (raw as T[number])
    : null;
}

function pickEnumArray<T extends readonly string[]>(
  raw: unknown,
  allowed: T,
): T[number][] {
  if (!Array.isArray(raw)) return [];
  const set = new Set<string>(allowed);
  return Array.from(
    new Set(raw.filter((v): v is string => typeof v === "string" && set.has(v))),
  ) as T[number][];
}

function pickString(raw: unknown, min = 1, max = 500): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (t.length < min || t.length > max) return null;
  return t;
}

function optionalString(raw: unknown, max = 500): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.length > max) return t.slice(0, max);
  return t;
}

const DRAFT_TEXT_LIMITS: Record<string, number> = {
  age: 3, country: 100, city: 100, phone: 40, gender: 10,
  current_role: 40, current_role_other: 200, qualification: 40,
  specialization: 200, graduation_institution: 200,
  experience_areas_other: 200, years_of_experience: 40,
  target_groups_other: 200, achievements_scope: 40,
  languages_other: 200, notes: 2000,
};

function draftText(raw: unknown, max: number) {
  return typeof raw === "string" ? raw.slice(0, max) : "";
}

function draftCodes(raw: unknown, allowed: readonly string[]) {
  if (!Array.isArray(raw)) return [];
  const allowedSet = new Set(allowed);
  return Array.from(new Set(raw.filter((value): value is string => typeof value === "string" && allowedSet.has(value))));
}

function sanitizeDraft(body: Record<string, unknown>) {
  const draft: Record<string, unknown> = {};
  for (const [field, max] of Object.entries(DRAFT_TEXT_LIMITS)) draft[field] = draftText(body[field], max);
  draft.experience_areas = draftCodes(body.experience_areas, APP_EXPERIENCE_AREAS);
  draft.target_groups = draftCodes(body.target_groups, APP_TARGET_GROUPS);
  draft.contributions = draftCodes(body.contributions, APP_CONTRIBUTIONS);
  draft.has_achievements = body.has_achievements === true;
  const languages = Array.isArray(body.languages) ? body.languages : [];
  const allowedLanguages = new Set<string>(APP_LANGUAGES);
  const allowedLevels = new Set<string>(APP_LANG_LEVELS);
  draft.languages = languages
    .filter((entry): entry is { lang: string; level: string } => !!entry && typeof entry === "object" && "lang" in entry && "level" in entry && typeof (entry as { lang?: unknown }).lang === "string" && typeof (entry as { level?: unknown }).level === "string")
    .filter((entry) => allowedLanguages.has(entry.lang) && allowedLevels.has(entry.level))
    .slice(0, 20);
  return draft;
}

export async function PATCH(req: Request) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (auth.teacher.onboarding_status !== "PENDING_APPLICATION") {
    return NextResponse.json({ error: "application_already_submitted" }, { status: 409 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const updated = await prisma.teacher.update({
      where: { id: auth.teacher.id },
      data: { application_draft: sanitizeDraft(body), application_draft_updated_at: new Date() },
      select: { application_draft_updated_at: true },
    });
    return NextResponse.json({ saved: true, draft_updated_at: updated.application_draft_updated_at });
  } catch (error) {
    // The form keeps its browser backup during a phased database rollout.
    // Do not let an unavailable optional draft column break the application.
    console.warn("[teacher-application] draft storage unavailable", error);
    return NextResponse.json({ saved: false, draft_updated_at: null });
  }
}

export async function POST(req: Request) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { teacher } = auth;

  if (teacher.onboarding_status !== "PENDING_APPLICATION") {
    return NextResponse.json(
      { error: "application_already_submitted" },
      { status: 409 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Required scalars
  const country = pickString(body.country, 2, 100);
  const city = pickString(body.city, 1, 100);
  const phone = pickString(body.phone, 4, 40);
  const full_name = pickString(auth.profile.full_name, 2, 200);
  const email = pickString(auth.profile.email, 4, 200);
  const specialization = pickString(body.specialization, 2, 200);
  const graduation_institution = pickString(body.graduation_institution, 2, 200);
  const age = typeof body.age === "number" && body.age >= 16 && body.age <= 120
    ? Math.floor(body.age)
    : null;
  const gender = pickEnum(body.gender, APP_GENDERS);
  const current_role = pickEnum(body.current_role, APP_CURRENT_ROLES);
  const qualification = pickEnum(body.qualification, APP_QUALIFICATIONS);
  const years_of_experience = pickEnum(body.years_of_experience, APP_EXPERIENCE_RANGES);

  const required = {
    country, city, phone, age, gender,
    current_role, qualification, specialization, graduation_institution,
    years_of_experience,
  };
  for (const [k, v] of Object.entries(required)) {
    if (v == null) {
      return NextResponse.json(
        { error: "missing_field", field: k },
        { status: 400 },
      );
    }
  }
  if (!full_name || !email) {
    return NextResponse.json({ error: "missing_profile_identity" }, { status: 400 });
  }

  const experience_areas = pickEnumArray(body.experience_areas, APP_EXPERIENCE_AREAS);
  const target_groups = pickEnumArray(body.target_groups, APP_TARGET_GROUPS);
  const contributions = pickEnumArray(body.contributions, APP_CONTRIBUTIONS);

  const has_achievements = body.has_achievements === true;
  const achievements_scope = has_achievements
    ? pickEnum(body.achievements_scope, APP_ACHIEVEMENT_SCOPES)
    : null;

  // Languages — JSON array of { lang, level }
  const langSet = new Set<string>(APP_LANGUAGES);
  const lvlSet = new Set<string>(APP_LANG_LEVELS);
  const languages = Array.isArray(body.languages)
    ? body.languages
        .filter(
          (e): e is { lang: string; level: string } =>
            !!e &&
            typeof e === "object" &&
            "lang" in e &&
            "level" in e &&
            typeof (e as Record<string, unknown>).lang === "string" &&
            typeof (e as Record<string, unknown>).level === "string" &&
            langSet.has((e as Record<string, string>).lang) &&
            lvlSet.has((e as Record<string, string>).level),
        )
        .map((e) => ({ lang: e.lang, level: e.level }))
    : [];
  if (languages.some((entry) => entry.lang === "other") && !optionalString(body.languages_other, 200)) {
    return NextResponse.json(
      { error: "missing_field", field: "languages_other" },
      { status: 400 },
    );
  }

  const qrEnrollment = await prisma.workshopEnrollment.findFirst({
    where: {
      teacher_id: teacher.id,
      source: "QR",
      workshop: { school_id: teacher.school_id },
    },
    orderBy: { enrolled_at: "desc" },
    select: { workshop: { select: { id: true, title: true } } },
  });
  const autoApproved = !!qrEnrollment;
  const nextStatus = autoApproved ? "ACTIVE" : "UNDER_REVIEW";

  await prisma.$transaction(async (tx) => {
    await tx.teacherApplication.deleteMany({
      where: { teacher_id: teacher.id },
    });
    await tx.teacherApplication.create({
      data: {
        teacher_id: teacher.id,
        school_id: teacher.school_id,
        full_name,
        age: age!,
        country: country!,
        city: city!,
        phone: phone!,
        email,
        gender: gender!,
        // Nomination fields were removed from the form; DB columns kept for
        // historical applications, written as NULL for new ones.
        nominating_entity: null,
        nominator_name: null,
        nominator_role: null,
        current_role: current_role!,
        current_role_other: optionalString(body.current_role_other, 200),
        qualification: qualification!,
        specialization: specialization!,
        graduation_institution: graduation_institution!,
        experience_areas,
        experience_areas_other: optionalString(body.experience_areas_other, 200),
        years_of_experience: years_of_experience!,
        target_groups,
        target_groups_other: optionalString(body.target_groups_other, 200),
        contributions,
        has_achievements,
        achievements_scope,
        languages,
        languages_other: optionalString(body.languages_other, 200),
        // Attachments checklist removed; column kept but always empty for
        // new applications. The free-form "tell us about yourself" lives
        // in `notes`.
        attachments: [],
        notes: optionalString(body.notes, 2000),
        reviewed_at: autoApproved ? new Date() : null,
        reviewer_notes: autoApproved
          ? `Auto-approved through workshop QR: ${qrEnrollment!.workshop.title}`
          : null,
      },
    });

    await tx.teacher.update({
      where: { id: teacher.id },
      data: { onboarding_status: nextStatus },
    });
  }, { timeout: 30000, maxWait: 10000 });

  return NextResponse.json({
    success: true,
    status: nextStatus,
    workshop_id: qrEnrollment?.workshop.id ?? null,
  });
}
