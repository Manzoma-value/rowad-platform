"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  GripVertical,
  LayoutPanelTop,
} from "lucide-react";

export type WorkshopWorkspacePanel = {
  key: string;
  title: string;
  description: string;
  icon: ReactNode;
  content: ReactNode;
  meta?: string;
  defaultOpen?: boolean;
};

export type WorkshopWorkspaceCopy = {
  eyebrow: string;
  title: string;
  helper: string;
  openAll: string;
  closeAll: string;
  openCount: string;
  show: string;
  hide: string;
  dragHint: string;
  dragLabel: string;
  moveUp: string;
  moveDown: string;
};

type StoredPreferences = {
  visibility?: Record<string, boolean>;
  order?: string[];
};

function defaultVisibility(panels: WorkshopWorkspacePanel[]) {
  return Object.fromEntries(panels.map((panel) => [panel.key, panel.defaultOpen ?? false]));
}

function validOrder(value: unknown, keys: string[]) {
  if (!Array.isArray(value)) return keys;
  const saved = value.filter((key): key is string => typeof key === "string" && keys.includes(key));
  return [...new Set(saved), ...keys.filter((key) => !saved.includes(key))];
}

export function WorkshopPanelWorkspace({
  panels,
  storageKey,
  copy,
}: {
  panels: WorkshopWorkspacePanel[];
  storageKey: string;
  copy: WorkshopWorkspaceCopy;
}) {
  const instanceId = useId().replace(/:/g, "");
  const panelKeys = useMemo(() => panels.map((panel) => panel.key), [panels]);
  const panelSignature = panelKeys.join("|");
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => defaultVisibility(panels));
  const [order, setOrder] = useState<string[]>(panelKeys);
  const [loadedStorageKey, setLoadedStorageKey] = useState("");
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  useEffect(() => {
    const defaults = defaultVisibility(panels);
    let nextVisibility = defaults;
    let nextOrder = panelKeys;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredPreferences | Record<string, boolean> | null;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const savedVisibility: unknown = "visibility" in parsed ? parsed.visibility : parsed;
          if (savedVisibility && typeof savedVisibility === "object" && !Array.isArray(savedVisibility)) {
            nextVisibility = { ...defaults, ...(savedVisibility as Record<string, boolean>) };
          }
          const savedOrder: unknown = "order" in parsed ? parsed.order : undefined;
          nextOrder = validOrder(savedOrder, panelKeys);
        }
      }
    } catch {
      // The controls remain available for this visit when storage is blocked.
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setVisibility(nextVisibility);
      setOrder(nextOrder);
      setLoadedStorageKey(storageKey);
    });
    return () => { cancelled = true; };
  }, [storageKey, panelSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ visibility, order }));
    } catch {
      // The current-session controls still work when storage is unavailable.
    }
  }, [loadedStorageKey, order, storageKey, visibility]);

  const panelByKey = useMemo(
    () => new Map(panels.map((panel) => [panel.key, panel])),
    [panels],
  );
  const orderedPanels = order.map((key) => panelByKey.get(key)).filter((panel): panel is WorkshopWorkspacePanel => Boolean(panel));
  const openCount = panels.reduce((total, panel) => total + (visibility[panel.key] ? 1 : 0), 0);

  function movePanel(sourceKey: string, targetKey: string) {
    if (sourceKey === targetKey) return;
    setOrder((current) => {
      const next = current.filter((key) => key !== sourceKey);
      const targetIndex = next.indexOf(targetKey);
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, sourceKey);
      return next;
    });
  }

  function moveBy(sourceKey: string, offset: -1 | 1) {
    setOrder((current) => {
      const sourceIndex = current.indexOf(sourceKey);
      const targetIndex = sourceIndex + offset;
      if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
      return next;
    });
  }

  function setAllPanels(open: boolean) {
    setVisibility(Object.fromEntries(panelKeys.map((key) => [key, open])));
  }

  return (
    <section className="wsp-workspace">
      <header className="wsp-workspace-head">
        <div className="wsp-workspace-icon"><LayoutPanelTop size={22}/></div>
        <div className="wsp-workspace-copy">
          <span>{copy.eyebrow}</span>
          <h2>{copy.title}</h2>
          <p>{copy.helper}</p>
          <small><GripVertical size={13}/>{copy.dragHint}</small>
        </div>
        <strong>{openCount} / {panels.length} {copy.openCount}</strong>
        <div className="wsp-workspace-actions">
          <button type="button" onClick={() => setAllPanels(true)}><ChevronsDown size={15}/>{copy.openAll}</button>
          <button type="button" onClick={() => setAllPanels(false)}><ChevronsUp size={15}/>{copy.closeAll}</button>
        </div>
      </header>

      <div className="wsp-panel-stack">
        {orderedPanels.map((panel, index) => {
          const open = Boolean(visibility[panel.key]);
          const bodyId = `${instanceId}-${panel.key}-body`;
          return (
            <article
              className={`wsp-panel${open ? " is-open" : ""}${draggedKey === panel.key ? " is-dragging" : ""}${dragOverKey === panel.key ? " is-drag-over" : ""}`}
              key={panel.key}
              draggable
              onDragStart={(event) => {
                setDraggedKey(panel.key);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", panel.key);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverKey(panel.key);
              }}
              onDragLeave={() => setDragOverKey((current) => current === panel.key ? null : current)}
              onDrop={(event) => {
                event.preventDefault();
                const sourceKey = draggedKey ?? event.dataTransfer.getData("text/plain");
                if (sourceKey) movePanel(sourceKey, panel.key);
                setDraggedKey(null);
                setDragOverKey(null);
              }}
              onDragEnd={() => {
                setDraggedKey(null);
                setDragOverKey(null);
              }}
            >
              <div className="wsp-panel-head">
                <span className="wsp-drag-handle" title={copy.dragLabel}><GripVertical size={19}/></span>
                <button
                  type="button"
                  className="wsp-panel-toggle"
                  onClick={() => setVisibility((current) => ({ ...current, [panel.key]: !open }))}
                  aria-expanded={open}
                  aria-controls={bodyId}
                  title={open ? copy.hide : copy.show}
                >
                  <span className="wsp-panel-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="wsp-panel-icon">{panel.icon}</span>
                  <span className="wsp-panel-copy"><strong>{panel.title}</strong><small>{panel.description}</small></span>
                  {panel.meta && <span className="wsp-panel-meta">{panel.meta}</span>}
                  <span className="wsp-panel-action"><b>{open ? copy.hide : copy.show}</b><ChevronDown size={18}/></span>
                </button>
                <div className="wsp-order-actions">
                  <button type="button" onClick={() => moveBy(panel.key, -1)} disabled={index === 0} title={copy.moveUp} aria-label={`${copy.moveUp}: ${panel.title}`}><ArrowUp size={14}/></button>
                  <button type="button" onClick={() => moveBy(panel.key, 1)} disabled={index === orderedPanels.length - 1} title={copy.moveDown} aria-label={`${copy.moveDown}: ${panel.title}`}><ArrowDown size={14}/></button>
                </div>
              </div>
              <div id={bodyId} className="wsp-panel-body" hidden={!open}>{panel.content}</div>
            </article>
          );
        })}
      </div>

      <style>{workspaceStyles}</style>
    </section>
  );
}

const workspaceStyles = `
.wsp-workspace{display:grid;gap:12px}.wsp-workspace-head{display:grid;grid-template-columns:54px minmax(0,1fr) auto auto;align-items:center;gap:14px;padding:18px;border:1px solid rgba(107,30,45,.12);border-radius:22px;background:linear-gradient(135deg,#FFFBF5,#EFEAE0);box-shadow:0 14px 34px rgba(107,30,45,.06)}
.wsp-workspace-icon{width:52px;height:52px;display:grid;place-items:center;border-radius:16px;background:linear-gradient(145deg,#4A0E1C,#6B1E2D);color:#F7F3EB;box-shadow:0 9px 20px rgba(107,30,45,.2)}.wsp-workspace-copy>span{display:block;color:#8F765B;font-size:9px;font-weight:900;letter-spacing:.08em}.wsp-workspace-copy h2{margin:3px 0 1px;color:#32101A;font-size:19px;font-weight:900}.wsp-workspace-copy p{max-width:670px;margin:0;color:#796A62;font-size:10.5px;font-weight:650;line-height:1.7}.wsp-workspace-copy small{display:flex;align-items:center;gap:4px;margin-top:6px;color:#8F765B;font-size:8px;font-weight:800}.wsp-workspace-head>strong{padding:7px 10px;border:1px solid rgba(107,30,45,.1);border-radius:999px;background:#FFF;color:#6B1E2D;font-size:9.5px;white-space:nowrap}.wsp-workspace-actions{display:flex;gap:6px}.wsp-workspace-actions button{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 10px;border:1px solid rgba(107,30,45,.13);border-radius:11px;background:#FFF;color:#6B1E2D;font:800 9.5px 'Cairo',sans-serif;cursor:pointer}.wsp-workspace-actions button:hover{border-color:#6B1E2D;background:#F7F3EB}
.wsp-panel-stack{display:grid;gap:11px}.wsp-panel{overflow:hidden;border:1px solid rgba(107,30,45,.12);border-radius:21px;background:rgba(255,251,245,.86);box-shadow:0 12px 32px rgba(107,30,45,.05);transition:opacity .18s,transform .18s,border-color .18s,box-shadow .18s}.wsp-panel.is-open{border-color:rgba(107,30,45,.2);box-shadow:0 18px 44px rgba(107,30,45,.08)}.wsp-panel.is-dragging{opacity:.48;transform:scale(.992)}.wsp-panel.is-drag-over{border-color:#6B1E2D;box-shadow:0 0 0 3px rgba(107,30,45,.1),0 18px 44px rgba(107,30,45,.08)}
.wsp-panel-head{display:grid;grid-template-columns:38px minmax(0,1fr) 36px;align-items:stretch;background:linear-gradient(135deg,rgba(255,251,245,.96),rgba(247,243,235,.9))}.wsp-drag-handle{display:grid;place-items:center;border-inline-end:1px solid rgba(107,30,45,.08);color:#8F765B;cursor:grab}.wsp-drag-handle:active{cursor:grabbing}.wsp-panel-toggle{min-width:0;min-height:82px;display:grid;grid-template-columns:34px 48px minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:14px 13px;border:0;background:transparent;color:#32101A;text-align:start;font-family:'Cairo',sans-serif;cursor:pointer}.wsp-panel-toggle:hover{background:rgba(217,201,176,.16)}.wsp-panel-index{color:#8F765B;font-size:9px;font-weight:900;font-variant-numeric:tabular-nums}.wsp-panel-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:#FFF;color:#6B1E2D;box-shadow:0 5px 15px rgba(107,30,45,.07)}.wsp-panel-copy{min-width:0}.wsp-panel-copy strong,.wsp-panel-copy small{display:block}.wsp-panel-copy strong{font-size:13px;font-weight:900}.wsp-panel-copy small{margin-top:2px;color:#796A62;font-size:9px;font-weight:650;line-height:1.65}.wsp-panel-meta{padding:5px 8px;border-radius:999px;background:#EFEAE0;color:#796A62;font-size:8.5px;font-weight:900;white-space:nowrap}.wsp-panel-action{display:flex;align-items:center;gap:6px;color:#6B1E2D}.wsp-panel-action b{font-size:9px}.wsp-panel-action svg{transition:transform .2s}.wsp-panel.is-open .wsp-panel-action svg{transform:rotate(180deg)}.wsp-order-actions{display:grid;grid-template-rows:1fr 1fr;border-inline-start:1px solid rgba(107,30,45,.08)}.wsp-order-actions button{display:grid;place-items:center;border:0;background:transparent;color:#6B1E2D;cursor:pointer}.wsp-order-actions button+button{border-top:1px solid rgba(107,30,45,.08)}.wsp-order-actions button:hover:not(:disabled){background:#EFEAE0}.wsp-order-actions button:disabled{opacity:.22;cursor:not-allowed}.wsp-panel-body{border-top:1px solid rgba(107,30,45,.09);animation:wsp-reveal .2s ease-out}.wsp-panel-body[hidden]{display:none}@keyframes wsp-reveal{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@media(max-width:850px){.wsp-workspace-head{grid-template-columns:48px minmax(0,1fr) auto}.wsp-workspace-actions{grid-column:1/-1}.wsp-workspace-actions button{flex:1}.wsp-panel-toggle{grid-template-columns:30px 43px minmax(0,1fr) auto}.wsp-panel-meta{display:none}.wsp-panel-icon{width:42px;height:42px}.wsp-panel-action b{display:none}}
@media(max-width:520px){.wsp-workspace-head{grid-template-columns:44px minmax(0,1fr);padding:14px}.wsp-workspace-icon{width:42px;height:42px;border-radius:13px}.wsp-workspace-head>strong{grid-column:1/-1;width:max-content}.wsp-workspace-actions{flex-direction:column}.wsp-panel-head{grid-template-columns:30px minmax(0,1fr) 34px}.wsp-panel-toggle{min-height:74px;grid-template-columns:38px minmax(0,1fr) auto;padding:12px 9px;gap:9px}.wsp-panel-index{display:none}.wsp-panel-icon{width:38px;height:38px;border-radius:12px}.wsp-panel-copy strong{font-size:12px}.wsp-panel-copy small{font-size:8.5px}.wsp-panel-body>*{border-radius:0!important}.wsp-drag-handle svg{width:16px}}
`;
