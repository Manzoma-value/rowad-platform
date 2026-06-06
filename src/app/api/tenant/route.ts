// api/tenant/route.ts
//
// Returns the CURRENT user's school configuration — identity, branding
// colors, and resolved feature flags. Works for any tenant-scoped role
// (student / teacher / school-admin). The owner is NOT tenant-scoped and
// doesn't use this endpoint.
//
// This is the single source of truth the client TenantProvider reads.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { resolveFeatures } from "@/lib/features";

export const revalidate = 0; // always fresh — feature flags must reflect changes promptly

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve the user's school via whichever role record they have.
  // A user is exactly one of: student / teacher / school-admin.
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      role: true,
      student: { select: { school_id: true } },
      teacher: { select: { school_id: true } },
      managed_school: { select: { id: true } }, // school where this profile is the admin
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const schoolId =
    profile.managed_school?.id ??
    profile.teacher?.school_id ??
    profile.student?.school_id ??
    null;

  if (!schoolId) {
    // Owner, or a user not yet attached to a school. No tenant to return.
    return NextResponse.json({ tenant: null });
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      name_alt: true,
      slug: true,
      language: true,
      color_bg: true,
      color_primary: true,
      color_secondary: true,
      features: true,
    },
  });

  if (!school) {
    return NextResponse.json({ tenant: null });
  }

  return NextResponse.json({
    tenant: {
      id: school.id,
      name: school.name,
      name_alt: school.name_alt,
      slug: school.slug,
      language: school.language,
      colors: {
        bg: school.color_bg,
        primary: school.color_primary,
        secondary: school.color_secondary,
      },
      features: resolveFeatures(school.features),
    },
  });
}
