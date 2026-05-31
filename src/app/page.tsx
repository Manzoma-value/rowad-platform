// Server component — handles metadata, defers UI to client landing.
import LandingClient from "./LandingClient";

export const dynamic = "force-static";

export const metadata = {
  title: "جيل الرواد — Generation of Pioneers",
  description:
    "An integrated qualification program that prepares conscious, capable, responsible young leaders through a structured journey of 5 levels and 25 learning modules.",
};

export default function HomePage() {
  return <LandingClient />;
}
