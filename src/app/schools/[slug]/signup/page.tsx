import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SchoolSignupClient from "./SchoolSignupClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SchoolSignupPage({ params }: Props) {
  const { slug } = await params;

  const school = await prisma.school.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, language: true, description: true },
  });

  if (!school) notFound();

  return <SchoolSignupClient school={school} />;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const school = await prisma.school.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!school) return { title: "School Not Found" };
  return { title: `إنشاء حساب — ${school.name}` };
}
