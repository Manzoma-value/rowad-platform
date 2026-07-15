import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import SchoolSignupClient from "./SchoolSignupClient";
import SchoolDeactivatedClient from "../SchoolDeactivatedClient";
import { resolveLandingFlow } from "@/lib/landing-flow";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SchoolSignupPage({ params }: Props) {
  const { slug } = await params;

  const school = await prisma.school.findUnique({
    where: { slug },
    select: { id: true, name: true, name_alt: true, slug: true, language: true, description: true, is_active: true, features: true },
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

  if (resolveLandingFlow(school.features) === "teacher") {
    redirect(`/schools/${school.slug}/login`);
  }

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
