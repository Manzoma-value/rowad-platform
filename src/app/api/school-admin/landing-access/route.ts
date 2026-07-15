import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { resolveLandingFlow, type LandingFlow } from "@/lib/landing-flow";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    flow: resolveLandingFlow(auth.school.features),
    school: { name: auth.school.name, slug: auth.school.slug },
  });
}

export async function PATCH(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { flow?: LandingFlow };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.flow !== "student" && body.flow !== "teacher") {
    return NextResponse.json({ error: "Invalid landing flow" }, { status: 400 });
  }

  const current =
    auth.school.features &&
    typeof auth.school.features === "object" &&
    !Array.isArray(auth.school.features)
      ? (auth.school.features as Prisma.JsonObject)
      : {};

  const school = await prisma.school.update({
    where: { id: auth.school.id },
    data: { features: { ...current, landing_flow: body.flow } },
    select: { features: true },
  });

  return NextResponse.json({ flow: resolveLandingFlow(school.features) });
}
