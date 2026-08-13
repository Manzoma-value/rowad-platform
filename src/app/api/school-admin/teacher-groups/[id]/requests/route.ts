import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  let body: { request_ids?: unknown; action?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const requestIds = Array.isArray(body.request_ids)
    ? Array.from(new Set(body.request_ids.filter((value): value is string => typeof value === "string"))).slice(0, 500)
    : [];
  const action = body.action === "approve" || body.action === "reject" ? body.action : null;
  if (!action || requestIds.length === 0) {
    return NextResponse.json({ error: "request_ids and action required" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const group = await tx.teacherGroup.findFirst({
        where: { id, school_id: auth.school.id },
        select: { id: true, max_members: true, _count: { select: { members: true } } },
      });
      if (!group) return { error: "not_found" as const };

      const requests = await tx.teacherGroupJoinRequest.findMany({
        where: { id: { in: requestIds }, group_id: id, school_id: auth.school.id, status: "PENDING" },
        select: {
          id: true,
          teacher_id: true,
          teacher: {
            select: {
              onboarding_status: true,
              group_memberships: { where: { group_id: id }, select: { group_id: true }, take: 1 },
            },
          },
        },
      });
      if (requests.length === 0) return { processed: 0, approved: 0, rejected: 0 };

      if (action === "reject") {
        const rejected = await tx.teacherGroupJoinRequest.updateMany({
          where: { id: { in: requests.map((item) => item.id) }, status: "PENDING" },
          data: { status: "REJECTED", reviewed_by: auth.profile.id, reviewed_at: new Date() },
        });
        return { processed: rejected.count, approved: 0, rejected: rejected.count };
      }

      const eligible = requests.filter((item) =>
        item.teacher.onboarding_status === "ACTIVE" && item.teacher.group_memberships.length === 0,
      );
      const stale = requests.filter((item) => !eligible.includes(item));
      const available = Math.max(0, group.max_members - group._count.members);
      if (eligible.length > available) {
        return {
          error: "capacity_insufficient" as const,
          requested: eligible.length,
          available,
          capacity: group.max_members,
        };
      }

      if (eligible.length > 0) {
        await tx.teacherGroupMember.createMany({
          data: eligible.map((item) => ({ group_id: id, teacher_id: item.teacher_id })),
          skipDuplicates: true,
        });
        await tx.teacherGroupJoinRequest.updateMany({
          where: { id: { in: eligible.map((item) => item.id) }, status: "PENDING" },
          data: { status: "APPROVED", reviewed_by: auth.profile.id, reviewed_at: new Date() },
        });
      }
      if (stale.length > 0) {
        await tx.teacherGroupJoinRequest.updateMany({
          where: { id: { in: stale.map((item) => item.id) }, status: "PENDING" },
          data: { status: "REJECTED", reviewed_by: auth.profile.id, reviewed_at: new Date() },
        });
      }
      await tx.teacherGroup.update({ where: { id }, data: { updated_at: new Date() } });
      return {
        processed: requests.length,
        approved: eligible.length,
        rejected: stale.length,
        remaining: available - eligible.length,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ("error" in result) {
      return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "requests_changed_retry" }, { status: 409 });
    }
    throw error;
  }
}
