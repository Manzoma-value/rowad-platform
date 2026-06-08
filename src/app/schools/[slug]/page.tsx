import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SchoolLandingClient from "./SchoolLandingClient";
import SchoolDeactivatedClient from "./SchoolDeactivatedClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SchoolLandingPage({ params }: Props) {
  const { slug } = await params;

  const school = await prisma.school.findUnique({
    where: { slug },
    include: {
      admins: { select: { profile: { select: { full_name: true } } } },
      _count: { select: { teachers: true, students: true, classes: true } },
    },
  });

  if (!school) notFound();

  if (!school.is_active) {
    return (
      <SchoolDeactivatedClient
        schoolName={school.name}
        schoolNameAlt={school.name_alt ?? null}
        schoolLang={school.language ?? "ar"}
      />
    );
  }

  return (
    <SchoolLandingClient
      school={{
        id: school.id,
        name: school.name,
        name_alt: school.name_alt ?? null,
        slug: school.slug,
        description: school.description ?? null,
        language: school.language ?? "ar",
        admin_name: school.admins[0]?.profile?.full_name ?? null,
        student_count: school._count.students,
        teacher_count: school._count.teachers,
        class_count: school._count.classes,
      }}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const school = await prisma.school.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  if (!school) return { title: "School Not Found" };
  return { title: school.name, description: school.description ?? school.name };
}
