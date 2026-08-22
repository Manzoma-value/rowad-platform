import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function currentProfileId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, is_active: true },
  });
  return profile?.is_active ? profile.id : null;
}

export async function GET(request: Request) {
  const profileId = await currentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(
    50,
    Math.max(1, Number(new URL(request.url).searchParams.get("limit") ?? 15)),
  );
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipient_id: profileId },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title_ar: true,
        title_sq: true,
        title_en: true,
        body_ar: true,
        body_sq: true,
        body_en: true,
        href: true,
        read_at: true,
        created_at: true,
        actor: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
            role: true,
          },
        },
      },
    }),
    prisma.notification.count({
      where: { recipient_id: profileId, read_at: null },
    }),
  ]);

  return NextResponse.json({ notifications, unread_count: unreadCount });
}

const ReadSchema = z.object({
  ids: z.array(z.string().uuid()).max(50).optional(),
  all: z.boolean().optional(),
}).refine((value) => value.all === true || Boolean(value.ids?.length), {
  message: "ids or all required",
});

const DeleteSchema = z.object({
  ids: z.array(z.string().uuid()).max(50).optional(),
  all: z.boolean().optional(),
}).refine((value) => value.all === true || Boolean(value.ids?.length), {
  message: "ids or all required",
});

export async function PATCH(request: Request) {
  const profileId = await currentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ReadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: {
      recipient_id: profileId,
      read_at: null,
      ...(parsed.data.all ? {} : { id: { in: parsed.data.ids } }),
    },
    data: { read_at: new Date() },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const profileId = await currentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = DeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const result = await prisma.notification.deleteMany({
    where: {
      recipient_id: profileId,
      ...(parsed.data.all ? {} : { id: { in: parsed.data.ids } }),
    },
  });

  return NextResponse.json({ success: true, deleted_count: result.count });
}
