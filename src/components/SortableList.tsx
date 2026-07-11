"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

/**
 * SortableList — pointer-events-based drag-drop reordering.
 *
 * Why a custom component instead of `dnd-kit`?
 *   - dnd-kit adds ~70kb gzipped — overkill for this use-case.
 *   - HTML5 drag-and-drop is jerky and doesn't work well on touch.
 *   - Pointer events give us a unified mouse/touch/pen path and let us
 *     drive the drag visually with `transform: translate3d()`.
 *
 * Smoothness recipe:
 *   - The dragged item lifts via `transform: translateY + scale + shadow`
 *     (composited; never repaints).
 *   - Non-dragged items slide via `transition: transform 220ms ease`
 *     applied to their wrapper — neighbours visibly make room for the
 *     dragged item.
 *   - We compute new positions on `pointermove` from the cursor's Y vs
 *     each row's middle, then commit the new order on `pointerup`.
 *
 * RTL-safe (drag is purely vertical, no inline-axis math).
 */

export interface SortableItem {
  /** Stable unique key used for both React keys and order tracking. */
  id: string;
}

interface Props<T extends SortableItem> {
  items: T[];
  /**
   * Called after the user releases the pointer if the order actually changed.
   * Receives the new array in its committed order.
   * Should persist to the server; we don't roll back on failure — that's
   * the caller's responsibility (e.g. toast + refetch).
   */
  onReorder: (next: T[]) => void;
  /**
   * Renders a single row. We control the wrapper (drag transforms, hover
   * styles, etc.) — the caller just renders the contents.
   *
   * The `dragHandleProps` object must be spread on the element that should
   * initiate the drag. Spreading on the row wrapper makes the whole row
   * draggable, which is convenient on mobile but can interfere with inline
   * controls. Best practice: attach to a dedicated grip handle.
   */
  renderItem: (item: T, info: {
    index: number;
    isDragging: boolean;
    dragHandleProps: {
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
      style: React.CSSProperties;
    };
  }) => ReactNode;
  /** CSS gap between rows (default 8). */
  gap?: number;
  /** Extra class on the container. */
  className?: string;
}

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  gap = 8,
  className,
}: Props<T>) {
  // The visible order during a drag. We keep this in state so neighbours can
  // animate into their new positions while the pointer is still down.
  const [order, setOrder] = useState<T[]>(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0); // px from the row's natural Y

  // Refs to each row wrapper — used to measure positions during pointermove.
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  // Snapshot of state captured at pointerdown — pure values, no React reads.
  const dragRef = useRef<{
    startY: number;
    startIndex: number;
    rowHeight: number;
    pointerId: number;
  } | null>(null);

  // Keep `order` in sync when the parent's `items` change (e.g. after refetch).
  // We skip this if a drag is in progress to avoid yanking the row out from
  // under the user.
  useEffect(() => {
    if (dragId == null) setOrder(items);
  }, [items, dragId]);

  const idsKey = useMemo(() => order.map((i) => i.id).join("|"), [order]);

  const handlePointerDown = useCallback(
    (id: string) => (e: ReactPointerEvent<HTMLElement>) => {
      // Only respond to primary button / single touch / pen.
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const rowEl = rowRefs.current.get(id);
      if (!rowEl) return;
      const startIndex = order.findIndex((it) => it.id === id);
      if (startIndex < 0) return;

      const rect = rowEl.getBoundingClientRect();
      dragRef.current = {
        startY: e.clientY,
        startIndex,
        rowHeight: rect.height + gap,
        pointerId: e.pointerId,
      };
      setDragId(id);
      setDragOffset(0);

      // Capture so we keep receiving move events even if the cursor leaves.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* some browsers throw if capture is already taken — safe to ignore */
      }
      // Prevent text selection while dragging.
      document.body.style.userSelect = "none";
    },
    [order, gap],
  );

  // Global pointermove + pointerup listeners — installed only while dragging.
  useEffect(() => {
    if (!dragId || !dragRef.current) return;

    const handleMove = (e: PointerEvent) => {
      if (!dragRef.current || e.pointerId !== dragRef.current.pointerId) return;
      const { startY, startIndex, rowHeight } = dragRef.current;
      const dy = e.clientY - startY;
      setDragOffset(dy);

      // How many row-heights have we crossed?
      const shift = Math.round(dy / rowHeight);
      const targetIndex = clamp(startIndex + shift, 0, order.length - 1);

      // If we'd land on a new position, reorder the visible array.
      // We keep dragRef.startIndex pinned — the offset always references
      // the original starting Y so the lifted row stays under the cursor.
      const currentIndex = order.findIndex((it) => it.id === dragId);
      if (currentIndex !== targetIndex && targetIndex >= 0) {
        setOrder((prev) => moveItem(prev, currentIndex, targetIndex));
      }
    };

    const handleUp = (e: PointerEvent) => {
      if (!dragRef.current || e.pointerId !== dragRef.current.pointerId) return;
      const originalIds = items.map((i) => i.id).join("|");
      const newIds = order.map((i) => i.id).join("|");
      if (originalIds !== newIds) onReorder(order);

      dragRef.current = null;
      setDragId(null);
      setDragOffset(0);
      document.body.style.userSelect = "";
    };

    const handleCancel = () => {
      // Pointer lost (browser issued cancel) — snap back to caller's items.
      dragRef.current = null;
      setDragId(null);
      setDragOffset(0);
      setOrder(items);
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerup", handleUp, { passive: true });
    window.addEventListener("pointercancel", handleCancel, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  // We intentionally exclude items/onReorder so the listener uses fresh order
  // via closure — re-attaching on every order change would skip pointermove frames.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId, idsKey]);

  return (
    <div
      className={`sl-root${className ? " " + className : ""}`}
      style={{ display: "flex", flexDirection: "column", gap, position: "relative" }}
    >
      {order.map((item, index) => {
        const isDragging = item.id === dragId;
        return (
          <div
            key={item.id}
            ref={(el) => { rowRefs.current.set(item.id, el); }}
            className={`sl-row${isDragging ? " sl-row--dragging" : ""}`}
            style={{
              transform: isDragging ? `translateY(${dragOffset}px) scale(1.02)` : "translateY(0) scale(1)",
              transition: isDragging
                ? "none"
                : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease",
              zIndex: isDragging ? 100 : 1,
              willChange: isDragging ? "transform" : "auto",
              boxShadow: isDragging
                ? "0 14px 38px rgba(11, 11, 12, 0.18), 0 4px 10px rgba(184, 160, 130, 0.12)"
                : "none",
              borderRadius: "inherit",
              opacity: isDragging ? 0.97 : 1,
            }}
          >
            {renderItem(item, {
              index,
              isDragging,
              dragHandleProps: {
                onPointerDown: handlePointerDown(item.id),
                style: { touchAction: "none", cursor: isDragging ? "grabbing" : "grab" },
              },
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ────────── helpers ────────── */

function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [removed] = copy.splice(from, 1);
  copy.splice(to, 0, removed);
  return copy;
}
