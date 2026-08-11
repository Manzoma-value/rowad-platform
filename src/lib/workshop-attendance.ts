import "server-only";

import { prisma } from "@/lib/prisma";
import { effectiveWorkshopSchedule, workshopDateKey, workshopDayDate } from "@/lib/workshops";

function activityDay(scheduleValue: unknown, startDate: Date | null, endDate: Date | null) {
  const today = workshopDateKey();
  const workDays = effectiveWorkshopSchedule(scheduleValue, startDate, endDate)
    .filter((day) => day.type === "WORK")
    .map((day) => day.date)
    .sort();

  if (workDays.length === 0) return today;
  if (workDays.includes(today)) return today;
  if (today <= workDays[0]) return workDays[0];
  if (today >= workDays[workDays.length - 1]) return workDays[workDays.length - 1];
  return [...workDays].reverse().find((day) => day < today) ?? workDays[0];
}

/**
 * Any meaningful workshop activity is proof of attendance. The unique
 * workshop/teacher/day key makes repeated plays and answers safely idempotent.
 */
export async function markWorkshopActivityAttendance(workshopId: string, teacherId: string) {
  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: { schedule: true, start_date: true, end_date: true },
  });
  if (!workshop) return null;

  const day = activityDay(workshop.schedule, workshop.start_date, workshop.end_date);
  const now = new Date();
  return prisma.workshopAttendance.upsert({
    where: {
      workshop_id_teacher_id_day_date: {
        workshop_id: workshopId,
        teacher_id: teacherId,
        day_date: workshopDayDate(day),
      },
    },
    create: {
      workshop_id: workshopId,
      teacher_id: teacherId,
      day_date: workshopDayDate(day),
      checked_in_at: now,
      source: "ACTIVITY",
    },
    update: {},
    select: { id: true, day_date: true, checked_in_at: true, source: true },
  });
}
