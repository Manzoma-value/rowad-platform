import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSchoolSlugAllowedOnHost } from "@/lib/tenant-host";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  if (!isSchoolSlugAllowedOnHost(req.headers.get("host"), slug)) {
    return NextResponse.json({ error: "Platform not found" }, { status: 404 });
  }

  const school = await prisma.school.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      language: true,
      created_at: true,
      admins: { select: { profile: { select: { full_name: true } } } },
      _count: { select: { teachers: true, students: true, classes: true } },
    },
  });

  if (!school) {
    return NextResponse.json({ error: "Platform not found" }, { status: 404 });
  }

  return NextResponse.json({ school });
}
