export type StudentSupportRole = "GUARDIAN" | "RELIGIOUS_REFERENCE" | "SPONSOR";

export type StudentSupportPerson = {
  id?: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  notes: string | null;
};

export type StudentSupportCircle = {
  supervisor: StudentSupportPerson | null;
  guardian: StudentSupportPerson | null;
  religious_reference: StudentSupportPerson | null;
  sponsor: StudentSupportPerson | null;
};

export const EDITABLE_STUDENT_SUPPORT_ROLES: StudentSupportRole[] = [
  "GUARDIAN",
  "RELIGIOUS_REFERENCE",
  "SPONSOR",
];

export function supportRoleKey(role: StudentSupportRole) {
  return role === "GUARDIAN" ? "guardian" : role === "RELIGIOUS_REFERENCE" ? "religious_reference" : "sponsor";
}
