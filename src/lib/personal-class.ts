import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

type DatabaseClient = Pick<typeof prisma, "class" | "$executeRaw">;

/** Ensures an active supervisor always has at least one beneficiary group. */
export async function ensureTeacherPersonalClass(
  db: DatabaseClient,
  input: { teacherId: string; schoolId: string; fullName: string },
) {
  const current = await db.class.findFirst({
    where: { teacher_id: input.teacherId, school_id: input.schoolId },
    orderBy: { created_at: "asc" },
    select: { id: true, name: true },
  });
  if (current) return current;

  const cleanName = input.fullName.trim() || "مجموعة المشرف";
  const nameOwner = await db.class.findUnique({
    where: { school_id_name: { school_id: input.schoolId, name: cleanName } },
    select: { teacher_id: true },
  });
  const name = !nameOwner || nameOwner.teacher_id === input.teacherId
    ? cleanName
    : `${cleanName} — ${input.teacherId.slice(0, 6).toUpperCase()}`;

  // ON CONFLICT makes concurrent first visits/approvals idempotent.
  await db.$executeRaw`
    INSERT INTO "classes" ("id", "name", "created_at", "school_id", "teacher_id")
    VALUES (${randomUUID()}::uuid, ${name}, NOW(), ${input.schoolId}::uuid, ${input.teacherId}::uuid)
    ON CONFLICT ("school_id", "name") DO NOTHING
  `;

  return db.class.findFirstOrThrow({
    where: { teacher_id: input.teacherId, school_id: input.schoolId },
    orderBy: { created_at: "asc" },
    select: { id: true, name: true },
  });
}
