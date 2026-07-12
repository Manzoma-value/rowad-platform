"use client";
export const dynamic = "force-dynamic";

// Assessment models now live in their own top-level "نماذج القياس" section
// (see src/app/school-admin/assessments) instead of being nested three
// clicks deep under a specific group. This route stays alive purely so old
// bookmarks/links keep working — it just forwards to the group-filtered
// version of the new page.
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import MandalaLoader from "@/components/MandalaLoader";

export default function LegacyGroupAssessmentsRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/school-admin/assessments?group=${id}`);
  }, [id, router]);

  return <MandalaLoader />;
}
