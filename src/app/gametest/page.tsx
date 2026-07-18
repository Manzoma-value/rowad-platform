"use client";
// TEMPORARY manual-test harness for the games page — deleted after verifying.
import { LanguageProvider } from "@/lib/language-context";
import GamesPage from "@/app/teacher/games/page";

export default function GameTest() {
  return (
    <LanguageProvider>
      <GamesPage />
    </LanguageProvider>
  );
}
