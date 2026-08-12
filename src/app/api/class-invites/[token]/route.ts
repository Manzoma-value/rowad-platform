import { NextResponse } from "next/server";
import { findValidClassInvite } from "@/lib/class-invites";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const invite = await findValidClassInvite(token);
  if (!invite) {
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
