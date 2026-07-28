type ViewOnlyAccess = {
  is_view_only: boolean;
  view_only_expires_at: Date | string | null;
};

export function isReadRequest(method: string): boolean {
  const normalized = method.toUpperCase();
  return normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS";
}

export function isViewOnlySchoolAdminWrite(
  profile: { role: string | null | undefined; is_view_only: boolean },
  method: string,
): boolean {
  return (
    profile.role === "SCHOOL_ADMIN" &&
    profile.is_view_only &&
    !isReadRequest(method)
  );
}

export function isViewOnlyAccessExpired(
  profile: ViewOnlyAccess,
  now = new Date(),
): boolean {
  if (!profile.is_view_only || !profile.view_only_expires_at) return false;
  const expiresAt = new Date(profile.view_only_expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= now.getTime();
}

/**
 * Converts a platform date (Asia/Riyadh, UTC+03:00 year-round) to the final
 * millisecond of that day. The account therefore remains usable throughout
 * the date selected by the administrator.
 */
export function riyadhEndOfDay(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, 20, 59, 59, 999));
}
