"use client";
export const dynamic = "force-dynamic";

import { use } from "react";
import { notFound } from "next/navigation";
import CardGamePlay from "@/components/games/CardGamePlay";

export default function StudentCardGamePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = use(params);
  if (stage !== "STAGE1" && stage !== "STAGE2") return notFound();
  return <CardGamePlay stage={stage} backHref="/student/games" />;
}
