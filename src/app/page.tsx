// Server component — handles metadata, defers UI to client landing.
import LandingClient from "./LandingClient";

export const dynamic = "force-static";

export const metadata = {
  title: "منصة رواد — Rowad Platform",
  description:
    "A white-label school operating platform for owner, admin, supervisor, and beneficiary workflows, with isolated data for each school.",
};

export default function HomePage() {
  return <LandingClient />;
}
