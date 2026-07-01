"use client";
export const dynamic = "force-dynamic";

import ModelFlow from "@/components/games/ModelFlow";

export default function TeacherModelPage() {
  return <ModelFlow backHref="/teacher/games" />;
}
