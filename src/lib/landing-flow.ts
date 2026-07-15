export type LandingFlow = "student" | "teacher";

export const DEFAULT_LANDING_FLOW: LandingFlow = "student";

export function resolveLandingFlow(features: unknown): LandingFlow {
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    return DEFAULT_LANDING_FLOW;
  }

  return (features as Record<string, unknown>).landing_flow === "teacher"
    ? "teacher"
    : DEFAULT_LANDING_FLOW;
}
