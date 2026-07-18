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

export function makeWorkshopDays(
  start: string,
  end: string,
  previous: WorkshopDay[] = [],
): WorkshopDay[] {
  const startKey = start.slice(0, 10);
  const endKey = end.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startKey) || !/^\d{4}-\d{2}-\d{2}$/.test(endKey) || endKey < startKey) {
    return [];
  }

  const existing = new Map(previous.map((day) => [day.date, day]));
  const days: WorkshopDay[] = [];
  const cursor = new Date(`${startKey}T12:00:00.000Z`);
  const last = new Date(`${endKey}T12:00:00.000Z`);
  while (cursor <= last && days.length < 366) {
    const date = cursor.toISOString().slice(0, 10);
    days.push(existing.get(date) ?? {
      date,
      type: "WORK",
      start_time: "09:00",
      end_time: "15:00",
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function effectiveWorkshopSchedule(
  scheduleValue: unknown,
  startDate?: Date | string | null,
  endDate?: Date | string | null,
): WorkshopDay[] {
  const schedule = cleanSchedule(scheduleValue);
  if (schedule.length > 0) return schedule;
  const start = dateKey(startDate);
  const end = dateKey(endDate) ?? start;
  return start && end ? makeWorkshopDays(start, end) : [];
}

export function workshopDateKey(
  at = new Date(),
  timeZone = "Europe/Tirane",
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function dateKey(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function isWorkshopWorkDay(
  scheduleValue: unknown,
  day: string,
  startDate?: Date | string | null,
  endDate?: Date | string | null,
): boolean {
  if (Array.isArray(scheduleValue) && scheduleValue.length > 0) {
    return scheduleValue.some((raw) => {
      if (!raw || typeof raw !== "object") return false;
      const entry = raw as { date?: unknown; type?: unknown };
      return entry.date === day && entry.type === "WORK";
    });
  }

  const start = dateKey(startDate);
  const end = dateKey(endDate);
  if (start && day < start) return false;
  if (end && day > end) return false;
  return !!(start || end);
}

export function workshopDayDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}
