"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RowadStage } from "@prisma/client";
import type { Placement } from "./RowadBoard";
import { fetchJson } from "@/lib/fetch-with-timeout";

const DRAFT_URL = "/api/teacher/model/draft";
const SAVE_DEBOUNCE_MS = 1200;

/**
 * Persists a player's in-progress card-game board so navigating away mid-game
 * (back button, connectivity blip, phone lock, browser crash) never means
 * starting over. Autosaves ~1.2s after each change, and force-flushes via
 * `navigator.sendBeacon` when the tab is hidden/closed or the hook unmounts
 * (sendBeacon survives page teardown; a normal fetch does not).
 *
 * Deliberately imperative rather than reactive: call `loadFor(stage)` at the
 * exact moment the caller starts loading that stage's board (it already has
 * a load function for the board data itself — this just piggybacks on it),
 * and `reset()` when leaving the play screen. There is no internal
 * "watch `stage` and auto-reload" effect, since the caller always already
 * knows the right moment better than an effect inferring it from a prop.
 */
export function useModelDraft() {
  const [initialPlacements, setInitialPlacements] = useState<Placement[]>([]);
  const [restored, setRestored] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  const stageRef = useRef<RowadStage | null>(null);
  const latestRef = useRef<Placement[]>([]);
  const dirtyRef = useRef(false); // true once there's something worth saving/flushing
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadIdRef = useRef(0); // guards against a superseded load clobbering newer state

  const saveNow = useCallback((s: RowadStage, placements: Placement[]) => {
    void fetch(DRAFT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: s, placements }),
      keepalive: true,
    }).catch(() => { /* draft autosave is best-effort — never interrupts gameplay */ });
  }, []);

  const flushBeacon = useCallback(() => {
    const s = stageRef.current;
    if (!s || !dirtyRef.current) return;
    try {
      const body = JSON.stringify({ stage: s, placements: latestRef.current });
      navigator.sendBeacon?.(DRAFT_URL, new Blob([body], { type: "application/json" }));
    } catch { /* best-effort */ }
  }, []);

  /** Called on every placement change — cheap, just updates the ref used by
   *  the exit-flush and (re)starts the debounced network save. */
  const handleChange = useCallback((placements: Placement[]) => {
    latestRef.current = placements;
    dirtyRef.current = true;
    const s = stageRef.current;
    if (!s) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNow(s, placements), SAVE_DEBOUNCE_MS);
  }, [saveNow]);

  /** Save immediately, bypassing the debounce — call this from an explicit
   *  "leave the game" action so the last few seconds are never lost. */
  const flushNow = useCallback(() => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    const s = stageRef.current;
    if (s && dirtyRef.current) saveNow(s, latestRef.current);
  }, [saveNow]);

  /** Call after a real, graded submit — the attempt is now permanently
   *  recorded, so the draft would otherwise linger and re-restore stale data
   *  next time this stage is opened. */
  const clearDraft = useCallback((s: RowadStage) => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    dirtyRef.current = false;
    latestRef.current = [];
    void fetch(`${DRAFT_URL}?stage=${s}`, { method: "DELETE" }).catch(() => null);
  }, []);

  /** Call exactly when the caller starts loading a stage's board — restores
   *  any autosaved draft for it. Safe to call again before the previous load
   *  finishes; only the most recent call's result is applied. */
  const loadFor = useCallback((s: RowadStage) => {
    const loadId = ++loadIdRef.current;
    stageRef.current = s;
    dirtyRef.current = false;
    latestRef.current = [];
    setRestored(false);
    setDraftLoading(true);
    return fetchJson<{ placements: Placement[] }>(`${DRAFT_URL}?stage=${s}`, { timeoutMs: 6000, retries: 0 })
      .then((data) => {
        if (loadIdRef.current !== loadId) return; // superseded by a newer load
        const placements = Array.isArray(data.placements) ? data.placements : [];
        setInitialPlacements(placements);
        latestRef.current = placements;
        dirtyRef.current = placements.length > 0;
        setRestored(placements.length > 0);
      })
      .catch(() => { if (loadIdRef.current === loadId) setInitialPlacements([]); })
      .finally(() => { if (loadIdRef.current === loadId) setDraftLoading(false); });
  }, []);

  /** Call when leaving the play screen entirely (e.g. back to the landing
   *  screen) so stale state isn't briefly visible next time a board mounts. */
  const reset = useCallback(() => {
    loadIdRef.current++; // invalidate any in-flight load
    stageRef.current = null;
    dirtyRef.current = false;
    latestRef.current = [];
    setInitialPlacements([]);
    setRestored(false);
    setDraftLoading(false);
  }, []);

  // Belt-and-suspenders flush: tab backgrounded/closed, or this hook unmounts
  // (e.g. the whole game component is torn down by client-side navigation).
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "hidden") flushBeacon(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      flushBeacon();
    };
  }, [flushBeacon]);

  return { initialPlacements, restored, draftLoading, handleChange, flushNow, clearDraft, loadFor, reset };
}
