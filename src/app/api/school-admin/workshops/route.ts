// /api/school-admin/workshops
//   GET   — list all workshops for this school in the admin-defined order.
//   POST  — create a new workshop with a fresh signup_token.
//   PATCH — persist a complete school-scoped drag/drop order.
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { newSignupToken } from "@/lib/workshop-tokens";
import { AUDIENCES, cleanSchedule, effectiveWorkshopSchedule, workshopDates } from "@/lib/workshops";
import { notifyProfiles, schoolTeacherProfileIds } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const workshops = await prisma.workshop.findMany({
    where: { school_id: auth.school.id },
    orderBy: [{ sort_order: "asc" }, { start_date: "asc" }, { created_at: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      audience: true,
      audience_other: true,
      start_date: true,
      end_date: true,
      schedule: true,
      materials: true,
      status: true,
      is_live: true,
      sort_order: true,
      signup_token: true,
      created_at: true,
      _count: {
        select: {
          attendance: true,
        },
      },
    },
  });

  // Approved/pending enrollment counts, computed separately from the plain
  // row total above so "Registered" doesn't silently include pending or
  // rejected requests.
  const counts = await prisma.workshopEnrollment.groupBy({
    by: ["workshop_id", "status"],
    where: { workshop_id: { in: workshops.map((w) => w.id) } },
    _count: true,
  });
  const countsByWorkshop = new Map<string, { approved: number; pending: number }>();
  for (const row of counts) {
    const entry = countsByWorkshop.get(row.workshop_id) ?? { approved: 0, pending: 0 };
    if (row.status === "APPROVED") entry.approved += row._count;
    if (row.status === "PENDING" || row.status === "WAITLISTED") entry.pending += row._count;
    countsByWorkshop.set(row.workshop_id, entry);
  }

  return NextResponse.json({
    workshops: workshops.map((workshop) => {
      const { _count, ...rest } = workshop;
      const entry = countsByWorkshop.get(workshop.id) ?? { approved: 0, pending: 0 };
      return {
        ...rest,
        schedule: effectiveWorkshopSchedule(workshop.schedule, workshop.start_date, workshop.end_date),
        _count: { attendance: _count.attendance },
        approved_count: entry.approved,
        pending_count: entry.pending,
      };
    }),
  });
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { title?: string; description?: string; audience?: string[]; audience_other?: string; start_date?: string; end_date?: string; schedule?: unknown; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const schedule = cleanSchedule(body.schedule);
  const dates = workshopDates(schedule, body.start_date, body.end_date);
  const audience = Array.from(new Set((body.audience ?? []).filter((item) => AUDIENCES.includes(item as typeof AUDIENCES[number]))));
  if (!audience.length) return NextResponse.json({ error: "audience required" }, { status: 400 });
  const lastOrder = await prisma.workshop.aggregate({
    where: { school_id: auth.school.id },
    _max: { sort_order: true },
  });

  // Retry on the (extremely rare) signup_token collision.
  let workshop = null;
  for (let attempt = 0; attempt < 3 && !workshop; attempt++) {
    try {
      workshop = await prisma.workshop.create({
        data: {
          school_id: auth.school.id,
          created_by: auth.profile.id,
          title: title.slice(0, 200),
          description: body.description?.toString().trim().slice(0, 1000) || null,
          audience,
          audience_other: audience.includes("OTHER") ? body.audience_other?.trim().slice(0, 120) || null : null,
          start_date: dates.start ? new Date(`${dates.start}T00:00:00Z`) : null,
          end_date: dates.end ? new Date(`${dates.end}T00:00:00Z`) : null,
          schedule,
          notes: body.notes?.trim().slice(0, 5000) || null,
          sort_order: (lastOrder._max.sort_order ?? -1) + 1,
          signup_token: newSignupToken(),
        },
        select: { id: true, signup_token: true },
      });
    } catch { /* collision or transient error — retry with a new token */ }
  }
  if (!workshop) return NextResponse.json({ error: "Failed to create" }, { status: 500 });

  const teacherIds = await schoolTeacherProfileIds(auth.school.id);
  await notifyProfiles(teacherIds, {
    type: "WORKSHOP_NEW",
    title_ar: "ورشة جديدة متاحة",
    title_sq: "Forum i ri i disponueshëm",
    title_en: "New workshop available",
    body_ar: `أُضيفت ورشة «${title}» — يمكنك طلب الانضمام إليها الآن`,
    body_sq: `U shtua forumi “${title}” — mund të kërkosh të bashkohesh tani`,
    body_en: `“${title}” was added — you can now request to join`,
    href: `/workshops/${workshop.id}`,
    actor_id: auth.profile.id,
    event_key: `workshop-new:${workshop.id}`,
  }).catch(() => undefined);

  return NextResponse.json({ workshop }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { ordered_ids?: string[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const orderedIds = Array.isArray(body.ordered_ids)
    ? body.ordered_ids.filter((id): id is string => typeof id === "string")
    : [];
  if (!orderedIds.length || new Set(orderedIds).size !== orderedIds.length) {
    return NextResponse.json({ error: "A unique complete workshop order is required" }, { status: 400 });
  }

  const schoolWorkshops = await prisma.workshop.findMany({
    where: { school_id: auth.school.id },
    select: { id: true },
  });
  const schoolIds = new Set(schoolWorkshops.map((workshop) => workshop.id));
  if (orderedIds.length !== schoolIds.size || orderedIds.some((id) => !schoolIds.has(id))) {
    return NextResponse.json({ error: "Workshop list changed; refresh and try again" }, { status: 409 });
  }

  await prisma.$transaction(
    orderedIds.map((id, sortOrder) => prisma.workshop.update({
      where: { id },
      data: { sort_order: sortOrder },
      select: { id: true },
    })),
  );
  return NextResponse.json({ success: true });
}
