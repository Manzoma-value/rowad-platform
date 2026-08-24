import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import {
  createTeacherGroupUpload,
  discardTeacherGroupUploads,
  uploadTeacherGroupDriveChunk,
} from "@/lib/teacher-group-attachment-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function memberAuth(groupId: string) {
  const auth = await requireTeacher();
  if (!auth) return null;
  const membership = await prisma.teacherGroupMember.findUnique({
    where: { group_id_teacher_id: { group_id: groupId, teacher_id: auth.teacher.id } },
    select: { group: { select: { school_id: true } } },
  });
  if (!membership || membership.group.school_id !== auth.teacher.school_id) return null;
  return { groupId, schoolId: auth.teacher.school_id, profileId: auth.profile.id };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await memberAuth(id);
  if (!auth) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return createTeacherGroupUpload(request, auth);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await memberAuth(id);
  if (!auth) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return uploadTeacherGroupDriveChunk(request, auth);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await memberAuth(id);
  if (!auth) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return discardTeacherGroupUploads(request, auth);
}
