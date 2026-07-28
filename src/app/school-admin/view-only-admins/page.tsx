import { redirect } from "next/navigation";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import ViewOnlyAdminsClient from "./ViewOnlyAdminsClient";

export const dynamic = "force-dynamic";

export default async function ViewOnlyAdminsPage() {
  const auth = await requireSchoolAdminWriter();
  if (!auth) redirect("/school-admin");
  return <ViewOnlyAdminsClient />;
}
