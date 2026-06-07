import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SchoolLoginClient from "./SchoolLoginClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SchoolLoginPage({ params }: Props) {
  const { slug } = await params;
  const school = await prisma.school.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      name_alt: true,
      language: true,
      slug: true,
      description: true,
    },
  });
  if (!school) notFound();
  return <SchoolLoginClient school={school} />;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const school = await prisma.school.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: school ? `تسجيل الدخول — ${school.name}` : "Login" };
}
