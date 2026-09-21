import { NextResponse } from "next/server";
import { findValidClassInvite } from "@/lib/class-invites";
import { isSchoolSlugAllowedOnHost } from "@/lib/tenant-host";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const invite = await findValidClassInvite(token);
  if (!invite) {
    return NextResponse.json({ error: "invite_unavailable" }, { status: 410 });
  }
  if (!isSchoolSlugAllowedOnHost(req.headers.get("host"), invite.school.slug)) {
    return NextResponse.json({ error: "invite_unavailable" }, { status: 410 });
  }

  return NextResponse.json({
    invite: {
      group_name: invite.class.name,
      supervisor_name: invite.teacher.profile.full_name,
      platform_name: invite.school.name,
      platform_name_alt: invite.school.name_alt,
      platform_slug: invite.school.slug,
      language: invite.school.language,
    },
  });
}
