// Server component — handles metadata, defers UI to client landing.
import LandingClient from "./LandingClient";

export const dynamic = "force-static";

export const metadata = {
  title: "منصة بناء الأهلية (الرواد)",
  description:
    "A white-label platform for owner, administrator, supervisor, and beneficiary workflows, with a dedicated experience for every organization.",
};

export default function HomePage() {
  return <LandingClient />;
}
