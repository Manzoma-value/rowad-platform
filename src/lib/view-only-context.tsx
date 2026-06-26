"use client";

// Lets any school-admin page check whether the current session is a
// read-only demo account (e.g. the investor account).
//   - When true, mutating UI controls should be hidden or disabled.
//   - Servers also refuse writes via requireSchoolAdminWriter(), so this
//     is defence-in-depth rather than the only gate.
import { createContext, useContext, ReactNode } from "react";

const Ctx = createContext<boolean>(false);

export function ViewOnlyProvider({
  value, children,
}: { value: boolean; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Returns true when the current admin session is view-only (read-only demo). */
export function useViewOnly(): boolean {
  return useContext(Ctx);
}
