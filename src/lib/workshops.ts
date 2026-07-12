export type WorkshopDay = {
  date: string;
  type: "WORK" | "REST";
  start_time?: string;
  end_time?: string;
  label?: string;
};

export type WorkshopMaterial = {
  id: string;
  type: "FILE" | "IMAGE" | "VIDEO" | "LINK";
  title: string;
  url: string;
  path?: string;
  mime?: string;
  size?: number;
};

export const AUDIENCES = ["TEACHERS", "SUPERVISORS", "ADMINS", "PARENTS", "STUDENTS", "OTHER"] as const;

export function cleanSchedule(value: unknown): WorkshopDay[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((raw): WorkshopDay[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const date = String(item.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || seen.has(date)) return [];
    seen.add(date);
    const type = item.type === "REST" ? "REST" : "WORK";
    const time = (key: string) => /^\d{2}:\d{2}$/.test(String(item[key] ?? "")) ? String(item[key]) : undefined;
    return [{
      date,
      type,
      start_time: type === "WORK" ? time("start_time") : undefined,
      end_time: type === "WORK" ? time("end_time") : undefined,
      label: String(item.label ?? "").trim().slice(0, 120) || undefined,
    }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function workshopDates(schedule: WorkshopDay[], start?: string | null, end?: string | null) {
  if (schedule.length) return { start: schedule[0].date, end: schedule[schedule.length - 1].date };
  return { start: start || null, end: end || null };
}
