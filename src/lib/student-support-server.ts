import { prisma } from "@/lib/prisma";
import {
  EDITABLE_STUDENT_SUPPORT_ROLES,
  supportRoleKey,
  type StudentSupportCircle,
  type StudentSupportPerson,
  type StudentSupportRole,
} from "@/lib/student-support";

type SupportContactSource = StudentSupportPerson & { id: string; role: StudentSupportRole };
type SupportCircleSource = {
  class: {
    name: string;
    teacher: {
      profile: { full_name: string; email: string | null };
      application: { phone: string } | null;
    } | null;
  } | null;
  support_contacts: SupportContactSource[];
};

export function shapeStudentSupportCircle(student: SupportCircleSource): StudentSupportCircle {
  const supervisor = student.class?.teacher
    ? {
        full_name: student.class.teacher.profile.full_name,
        email: student.class.teacher.profile.email,
        phone: student.class.teacher.application?.phone ?? null,
        relationship: student.class.name,
        notes: null,
      }
    : null;
  const circle: StudentSupportCircle = {
    supervisor,
    guardian: null,
    religious_reference: null,
    sponsor: null,
  };
  for (const contact of student.support_contacts) {
    circle[supportRoleKey(contact.role)] = {
      id: contact.id,
      full_name: contact.full_name,
      phone: contact.phone,
      email: contact.email,
      relationship: contact.relationship,
      notes: contact.notes,
    };
  }
  return circle;
}

function optionalText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max) || null;
}

export type StudentSupportMutation = {
  role: StudentSupportRole;
  clear: boolean;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  notes: string | null;
};

export function parseStudentSupportMutation(value: unknown): { data?: StudentSupportMutation; error?: string } {
  if (!value || typeof value !== "object") return { error: "Invalid body" };
  const body = value as Record<string, unknown>;
  const role = body.role as StudentSupportRole;
  if (!EDITABLE_STUDENT_SUPPORT_ROLES.includes(role)) return { error: "Invalid support role" };
  const clear = body.clear === true;
  const fullName = optionalText(body.full_name, 160);
  const email = optionalText(body.email, 254);
  if (!clear && !fullName) return { error: "Full name is required" };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Invalid email" };
  return {
    data: {
      role,
      clear,
      full_name: fullName,
      phone: optionalText(body.phone, 60),
      email,
      relationship: optionalText(body.relationship, 120),
      notes: optionalText(body.notes, 1000),
    },
  };
}

export async function saveStudentSupportContact(studentId: string, mutation: StudentSupportMutation) {
  if (mutation.clear) {
    await prisma.studentSupportContact.deleteMany({ where: { student_id: studentId, role: mutation.role } });
    return null;
  }
  return prisma.studentSupportContact.upsert({
    where: { student_id_role: { student_id: studentId, role: mutation.role } },
    create: {
      student_id: studentId,
      role: mutation.role,
      full_name: mutation.full_name!,
      phone: mutation.phone,
      email: mutation.email,
      relationship: mutation.relationship,
      notes: mutation.notes,
    },
    update: {
      full_name: mutation.full_name!,
      phone: mutation.phone,
      email: mutation.email,
      relationship: mutation.relationship,
      notes: mutation.notes,
    },
    select: { id: true, full_name: true, phone: true, email: true, relationship: true, notes: true },
  });
}
