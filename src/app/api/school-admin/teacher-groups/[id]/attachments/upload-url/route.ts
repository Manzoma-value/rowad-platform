import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import {
  createTeacherGroupUpload,
  discardTeacherGroupUploads,
  uploadTeacherGroupDriveChunk,
} from "@/lib/teacher-group-attachment-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type SchoolAdminWriter = NonNullable<Awaited<ReturnType<typeof requireSchoolAdminWriter>>>;

async function adminAuth(groupId: string, auth: SchoolAdminWriter) {
  const group = await prisma.teacherGroup.findFirst({
    where: { id: groupId, school_id: auth.school.id },
    select: { id: true },
  });
  return group ? { groupId, schoolId: auth.school.id, profileId: auth.profile.id } : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const schoolAuth = await requireSchoolAdminWriter();
  if (!schoolAuth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const auth = await adminAuth(id, schoolAuth);
  if (!auth) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return createTeacherGroupUpload(request, auth);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const schoolAuth = await requireSchoolAdminWriter();
  if (!schoolAuth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const auth = await adminAuth(id, schoolAuth);
  if (!auth) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return uploadTeacherGroupDriveChunk(request, auth);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const schoolAuth = await requireSchoolAdminWriter();
  if (!schoolAuth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const auth = await adminAuth(id, schoolAuth);
  if (!auth) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return discardTeacherGroupUploads(request, auth);
}
