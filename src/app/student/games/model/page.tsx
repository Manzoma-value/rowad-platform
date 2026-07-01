"use client";
export const dynamic = "force-dynamic";

import ModelFlow from "@/components/games/ModelFlow";

export default function StudentModelPage() {
  return <ModelFlow backHref="/student/games" />;
}
