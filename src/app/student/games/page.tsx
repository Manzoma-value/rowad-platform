"use client";
export const dynamic = "force-dynamic";

import GamesPage from "@/app/teacher/games/page";

// Student games hub uses the same UI as the teacher hub.
// Only the card-game route base differs (lives under /student).
export default function StudentGamesPage() {
  return <GamesPage cardBase="/student/games/card" />;
}
