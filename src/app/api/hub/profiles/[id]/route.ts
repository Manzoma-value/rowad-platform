import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { profileSchoolId } from "@/lib/hub-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerSchoolId = await profileSchoolId(user.id);
  if (!callerSchoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const profile = await prisma.profile.findUnique({
    where: { id },
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      avatar_url: true,
      teacher: {
        select: {
          id: true,
          school_id: true,
          classes: {
            where: { school_id: callerSchoolId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          },
          group_memberships: {
            where: { group: { school_id: callerSchoolId } },
            select: {
              group: { select: { id: true, name: true } },
            },
            orderBy: { joined_at: "desc" },
          },
        },
      },
      student: {
        select: {
          school_id: true,
          class: { select: { id: true, name: true } },
        },
      },
      school_admin_memberships: {
        where: { school_id: callerSchoolId },
        select: { id: true },
      },
    },
  });

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const belongsToCallerSchool =
    profile.teacher?.school_id === callerSchoolId ||
    profile.student?.school_id === callerSchoolId ||
    profile.school_admin_memberships.length > 0;

  if (!belongsToCallerSchool) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      avatar_url: profile.avatar_url,
      class: profile.student?.class ?? null,
      classes: profile.teacher?.classes ?? [],
      groups: profile.teacher?.group_memberships.map((m) => m.group) ?? [],
    },
  });
}
