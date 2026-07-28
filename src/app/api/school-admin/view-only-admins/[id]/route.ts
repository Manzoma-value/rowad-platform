import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { isViewOnlyAccessExpired, riyadhEndOfDay } from "@/lib/view-only-access";

const UpdateSchema = z.object({
  is_active: z.boolean().optional(),
  expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
}).refine(
  (value) => value.is_active !== undefined || value.expires_on !== undefined,
  { message: "No changes supplied" },
);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id } = await params;
  const membership = await prisma.schoolAdminMember.findFirst({
    where: {
      school_id: auth.school.id,
      profile_id: id,
      profile: { role: "SCHOOL_ADMIN", is_view_only: true },
    },
    select: {
      profile: {
        select: {
          id: true,
          is_active: true,
          is_view_only: true,
          view_only_expires_at: true,
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "View-only administrator not found" }, { status: 404 });
  }

  let expiresAt: Date | null | undefined;
  if (parsed.data.expires_on === null) {
    expiresAt = null;
  } else if (parsed.data.expires_on !== undefined) {
    expiresAt = riyadhEndOfDay(parsed.data.expires_on);
    if (!expiresAt) {
      return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
    }
  }

  const proposed = {
    is_view_only: true,
    is_active: parsed.data.is_active ?? membership.profile.is_active,
    view_only_expires_at:
      expiresAt === undefined ? membership.profile.view_only_expires_at : expiresAt,
  };

  if (proposed.is_active && isViewOnlyAccessExpired(proposed)) {
    return NextResponse.json(
      { error: "Choose today or a future date before enabling this account" },
      { status: 400 },
    );
  }

  const updated = await prisma.profile.update({
    where: { id },
    data: {
      ...(parsed.data.is_active !== undefined
        ? { is_active: parsed.data.is_active }
        : {}),
      ...(expiresAt !== undefined
        ? { view_only_expires_at: expiresAt }
        : {}),
    },
    select: {
      id: true,
      full_name: true,
      email: true,
      is_active: true,
      is_view_only: true,
      view_only_expires_at: true,
      created_at: true,
    },
  });

  return NextResponse.json({
    admin: {
      ...updated,
      access_expired: isViewOnlyAccessExpired(updated),
    },
  });
}
