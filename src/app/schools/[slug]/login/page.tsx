import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SchoolLoginClient from "./SchoolLoginClient";
import { resolveLandingFlow } from "@/lib/landing-flow";
import SchoolDeactivatedClient from "../SchoolDeactivatedClient";

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
      is_active: true,
      features: true,
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
  return <SchoolLoginClient school={school} landingFlow={resolveLandingFlow(school.features)} />;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const school = await prisma.school.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: school ? `تسجيل الدخول — ${school.name}` : "Login" };
}
