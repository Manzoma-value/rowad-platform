import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { preferredSchoolSlugFromHost } from "@/lib/tenant-host";

export async function GET(req: Request) {
  const scopedSlug = preferredSchoolSlugFromHost(req.headers.get("host"));
  const schools = await prisma.school.findMany({
    where: scopedSlug ? { slug: scopedSlug } : undefined,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      language: true,
      created_at: true,
      _count: { select: { students: true } },
    },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json({ schools });
}
