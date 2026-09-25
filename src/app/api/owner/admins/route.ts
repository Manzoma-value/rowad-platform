// GET /api/owner/admins — list all school admins with their school and activation status
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get all schools with their admins (including schools with no admin yet)
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      language: true,
      admins: {
        select: {
          profile: {
            select: {
              id: true,
              full_name: true,
              email: true,
              is_active: true,
              created_at: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ schools });
}
