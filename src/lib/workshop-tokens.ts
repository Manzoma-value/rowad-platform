// Helpers for generating the random tokens used by workshop QR codes.
// - signup token = a public slug that's part of the URL admins hand out
// - attendance code = a per-day one-time-ish token that teachers scan
//
// crypto.randomUUID would work but we want something URL-shortish and
// friendly to type/read for support, so we use base32-ish output.
import { randomBytes } from "node:crypto";

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoids 0/O and 1/I/L

function base32(byteLen: number): string {
  const buf = randomBytes(byteLen);
  let out = "";
  for (const b of buf) out += ALPHA[b % ALPHA.length];
  return out;
}

/** Signup token — 12 chars, ~72 bits of entropy. Enough for public URL. */
export function newSignupToken(): string {
  return base32(12);
}

/** Attendance code — 8 chars, refreshed daily. Enough for one-day use. */
export function newAttendanceCode(): string {
  return base32(8);
}
