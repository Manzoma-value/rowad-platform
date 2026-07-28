"use client";
// TEMPORARY harness — verifies ModelFlow draft save/restore, timeout
// handling, and the school-admin in-progress section against mocked API
// responses. Deleted before commit.
import { useState } from "react";
import ModelFlow from "../../components/games/ModelFlow";
import GameScoresPage from "../school-admin/game-scores/page";

const LEVELS = [1, 2, 3, 4, 5].map((n) => ({ order: n, name_ar: `مستوى ${n}`, name_sq: `Niveli ${n}` }));
const MAQSADS = ["DEEN", "NAFS", "AQL", "NASL", "MAL"];
const CARDS = Array.from({ length: 25 }, (_, i) => ({
  id: `c${i}`,
  name_ar: `مفهوم ${i}`,
  name_sq: `Koncepti ${i}`,
}));

// Server draft store, keyed by stage, simulated in-memory so the harness can
// verify save -> exit -> restore across a real component remount.
const draftStore: Record<string, unknown[]> = { STAGE1: [], STAGE2: [] };
let saveCallCount = 0;
let hangNextLoad = false;

export default function Harness() {
  const [view, setView] = useState<"model" | "admin">("model");
  const [mountKey, setMountKey] = useState(0);
  const [patched, setPatched] = useState(false);

  if (!patched) {
    const original = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

      if (url.includes("/api/teacher/model/my-score")) {
        return json({ best_stage1: 0, best_stage2: 0, best_combined: 0, plays_stage1: 0, plays_stage2: 0, total: 25, max_combined: 50 });
      }
      if (url.includes("/api/teacher/model/leaderboard")) return json({ top: [] });

      if (url.includes("/api/teacher/model/draft")) {
        const stageMatch = /stage=([A-Z0-9]+)/.exec(url);
        const stage = stageMatch?.[1] ?? "STAGE1";
        if (init?.method === "DELETE") { draftStore[stage] = []; return json({ ok: true }); }
        if (init?.method === "POST") {
          saveCallCount++;
          const body = JSON.parse((init.body as string) ?? "{}");
          draftStore[body.stage] = body.placements;
          (window as unknown as { __saveCallCount: number }).__saveCallCount = saveCallCount;
          return json({ ok: true });
        }
        return json({ placements: draftStore[stage] ?? [] });
      }

      if (url.includes("/api/teacher/model?stage=")) {
        if (hangNextLoad) { hangNextLoad = false; await new Promise((r) => setTimeout(r, 15000)); }
        const stage = url.includes("STAGE2") ? "STAGE2" : "STAGE1";
        return json({ stage, title_ar: "النموذج", title_sq: "Modeli", levels: LEVELS, cards: CARDS });
      }

      if (url.includes("/api/teacher/model/submit")) {
        return json({ score: 20, total: 25 });
      }
      if (url.includes("/api/school-admin/game-scores")) {
        return json({
          overview: { total_plays: 5, unique_players: 2, games: [{ key: "MODEL_STAGE1", plays: 5, unique_players: 2 }] },
          modelRows: [],
          miniRows: [],
          inProgressRows: [
            { profile_id: "p1", full_name: "معلم تجريبي", email: "t@test.com", role: "TEACHER", stage: "STAGE1", placed_count: 12, total: 25, updated_at: new Date().toISOString() },
          ],
        });
      }
      return original(input, init);
    };
    setPatched(true);
  }

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#EFEAE0" }}>
      <div style={{ display: "flex", gap: 8, padding: 12, background: "#222" }}>
        <button id="v-model" onClick={() => setView("model")} style={{ color: "#fff" }}>model</button>
        <button id="v-admin" onClick={() => setView("admin")} style={{ color: "#fff" }}>admin</button>
        <button id="remount" onClick={() => setMountKey((k) => k + 1)} style={{ color: "#fff" }}>remount (simulate revisit)</button>
        <button id="set-hang" onClick={() => { hangNextLoad = true; }} style={{ color: "#fff" }}>arm-hang-next-load</button>
        <span style={{ color: "#fff" }} id="save-count">saves: {saveCallCount}</span>
      </div>
      {view === "model"
        ? <div key={mountKey} style={{ padding: 16 }}><ModelFlow backHref="/model-harness" /></div>
        : <div style={{ padding: 16 }}><GameScoresPage /></div>}
    </div>
  );
}
