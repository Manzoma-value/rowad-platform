"use client";

import { useState } from "react";
import type { StageTrait } from "./types";

const MAQASID_LABELS: Record<string, string> = {
  DEEN: "Ø§Ù„Ø¯ÙŠÙ†",
  AQL: "Ø§Ù„Ø¹Ù‚Ù„",
  NAFS: "Ø§Ù„Ù†ÙØ³",
  NASL: "Ø§Ù„Ù†Ø³Ù„",
  MAL: "Ø§Ù„Ù…Ø§Ù„",
};

const MAQASID_COLORS: Record<string, { color: string; bg: string }> = {
  DEEN: { color: "#7A6020", bg: "rgba(217,201,176,0.10)" },
  AQL: { color: "#4A2080", bg: "rgba(74,32,128,0.08)" },
  NAFS: { color: "#1A5C3A", bg: "rgba(26,92,58,0.09)" },
  NASL: { color: "#7A1E1E", bg: "rgba(122,30,30,0.08)" },
  MAL: { color: "#5A4A10", bg: "rgba(154,98,0,0.09)" },
};

interface Props {
  moduleId: string;
  mainTraitId: string | null | undefined;
  stageTraits: StageTrait[];
  onRefresh: () => void;
}

export function ModuleMainTraitSelector({
  moduleId,
  mainTraitId,
  stageTraits,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentTrait = stageTraits.find((t) => t.id === mainTraitId) ?? null;

  if (stageTraits.length === 0) return null;

  async function selectTrait(traitId: string | null) {
    setSaving(true);
    try {
      await fetch(`/api/school-admin/roadmap/modules/${moduleId}/main-trait`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trait_id: traitId }),
      });
      setOpen(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  const meta = currentTrait ? MAQASID_COLORS[currentTrait.maqsad] : null;

  return (
    <div className="mts-wrap">
      {/* Section label */}
      <div className="mts-label-row">
        <div className="mts-label-line" />
        <span className="mts-label-text">Ø§Ù„Ø³Ù…Ø© Ø§Ù„Ù…Ø´ØºÙ‘Ù„Ø©</span>
      </div>

      {/* Current selection or empty state */}
      {currentTrait ? (
        <div className="mts-current">
          <div className="mts-current-inner">
            <div
              className="mts-star-badge"
              style={{ background: meta?.bg, color: meta?.color }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Ø§Ù„Ø³Ù…Ø© Ø§Ù„Ù…Ø´ØºÙ‘Ù„Ø©
            </div>
            <div className="mts-current-info">
              <div className="mts-current-name">{currentTrait.name}</div>
              <div className="mts-current-maqsad">
                <span
                  className="mts-maqsad-tag"
                  style={{ background: meta?.bg, color: meta?.color }}
                >
                  {MAQASID_LABELS[currentTrait.maqsad]}
                </span>
                {currentTrait.definition && (
                  <span className="mts-current-def">
                    {currentTrait.definition}
                  </span>
                )}
              </div>
            </div>
            <div className="mts-weight-badge">50%</div>
          </div>

          <button
            className="mts-change-btn"
            onClick={() => setOpen((v) => !v)}
            disabled={saving}
          >
            {saving ? "..." : open ? "Ø¥Ù„ØºØ§Ø¡" : "ØªØºÙŠÙŠØ±"}
          </button>
        </div>
      ) : (
        <button
          className="mts-empty-trigger"
          onClick={() => setOpen((v) => !v)}
          disabled={saving}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø³Ù…Ø© Ø§Ù„Ù…Ø´ØºÙ‘Ù„Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³ØªÙˆÙ‰
        </button>
      )}

      {/* Trait picker dropdown */}
      {open && (
        <div className="mts-picker">
          <div className="mts-picker-hint">
            Ø§Ø®ØªØ± Ø§Ù„Ø³Ù…Ø© Ø§Ù„ØªÙŠ ÙŠÙØ±ÙƒÙ‘Ø² Ø¹Ù„ÙŠÙ‡Ø§ Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³ØªÙˆÙ‰ â€” Ø³ØªØ­Ù…Ù„ ÙˆØ²Ù† 50%
          </div>

          <div className="mts-picker-list">
            {stageTraits.map((trait) => {
              const isSelected = trait.id === mainTraitId;
              const m = MAQASID_COLORS[trait.maqsad];
              return (
                <button
                  key={trait.id}
                  className={`mts-option ${isSelected ? "selected" : ""}`}
                  onClick={() => selectTrait(isSelected ? null : trait.id)}
                  disabled={saving}
                >
                  <div className="mts-option-left">
                    <span
                      className="mts-option-maqsad"
                      style={{ background: m.bg, color: m.color }}
                    >
                      {MAQASID_LABELS[trait.maqsad]}
                    </span>
                    <div className="mts-option-info">
                      <span className="mts-option-name">{trait.name}</span>
                      {trait.definition && (
                        <span className="mts-option-def">
                          {trait.definition}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mts-option-right">
                    {isSelected ? (
                      <span className="mts-option-check">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        50%
                      </span>
                    ) : (
                      <span className="mts-option-weight">12.5%</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {currentTrait && (
            <button
              className="mts-unset-btn"
              onClick={() => selectTrait(null)}
              disabled={saving}
            >
              Ø¥Ù„ØºØ§Ø¡ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø³Ù…Ø© Ø§Ù„Ù…Ø´ØºÙ‘Ù„Ø©
            </button>
          )}
        </div>
      )}

      <style>{mtsCSS}</style>
    </div>
  );
}

const mtsCSS = `
.mts-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mts-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mts-label-line {
  width: 3px; height: 16px;
  background: linear-gradient(180deg, #D9C9B0 0%, #B8A082 100%);
  border-radius: 2px;
  flex-shrink: 0;
}
.mts-label-text {
  font-size: 11px;
  font-weight: 800;
  color: #B8A082;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Current trait display */
.mts-current {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mts-current-inner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(217,201,176,0.05);
  border: 1px solid rgba(217,201,176,0.18);
  border-radius: 10px;
  padding: 12px 14px;
}
.mts-star-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 4px 9px;
  border-radius: 6px;
  flex-shrink: 0;
  white-space: nowrap;
}
.mts-current-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.mts-current-name {
  font-size: 14px;
  font-weight: 800;
  color: var(--ink);
}
.mts-current-maqsad {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.mts-maqsad-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 5px;
}
.mts-current-def {
  font-size: 11px;
  color: var(--ink3);
  line-height: 1.4;
}
.mts-weight-badge {
  font-size: 16px;
  font-weight: 900;
  color: #D9C9B0;
  flex-shrink: 0;
  letter-spacing: -0.5px;
}

.mts-change-btn {
  align-self: flex-end;
  background: none;
  border: 1px solid var(--border2);
  border-radius: 7px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  font-family: 'Tajawal', sans-serif;
  color: var(--ink3);
  cursor: pointer;
  transition: all 0.15s;
}
.mts-change-btn:hover { border-color: var(--gold); color: #7A6020; }
.mts-change-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Empty trigger */
.mts-empty-trigger {
  width: 100%;
  border: 2px dashed rgba(217,201,176,0.25);
  border-radius: 9px;
  background: rgba(217,201,176,0.04);
  color: rgba(154,120,30,0.7);
  font-size: 12.5px;
  font-weight: 700;
  font-family: 'Tajawal', sans-serif;
  padding: 11px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s;
}
.mts-empty-trigger:hover {
  border-color: rgba(217,201,176,0.5);
  background: rgba(217,201,176,0.08);
  color: #7A6020;
}
.mts-empty-trigger:disabled { opacity: 0.5; cursor: not-allowed; }

/* Picker dropdown */
.mts-picker {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 28px rgba(0,0,0,0.1);
  animation: slideUp 0.18s ease;
}
.mts-picker-hint {
  padding: 10px 14px;
  font-size: 11px;
  color: var(--ink3);
  background: var(--surface2);
  border-bottom: 1px solid var(--border);
  direction: rtl;
}
.mts-picker-list {
  display: flex;
  flex-direction: column;
}
.mts-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  border: none;
  background: none;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  border-bottom: 1px solid var(--border);
  transition: background 0.13s;
  text-align: right;
  direction: rtl;
}
.mts-option:last-child { border-bottom: none; }
.mts-option:hover { background: var(--surface2); }
.mts-option.selected { background: rgba(217,201,176,0.06); }
.mts-option:disabled { opacity: 0.5; cursor: not-allowed; }

.mts-option-left {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1;
  min-width: 0;
}
.mts-option-maqsad {
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 5px;
  flex-shrink: 0;
}
.mts-option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.mts-option-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}
.mts-option-def {
  font-size: 11px;
  color: var(--ink3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mts-option-right { flex-shrink: 0; }
.mts-option-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 800;
  color: #7A6020;
  background: rgba(217,201,176,0.12);
  border-radius: 6px;
  padding: 3px 9px;
}
.mts-option-weight {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink4);
}

.mts-unset-btn {
  width: 100%;
  background: var(--surface2);
  border: none;
  border-top: 1px solid var(--border);
  padding: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink3);
  font-family: 'Tajawal', sans-serif;
  cursor: pointer;
  transition: all 0.13s;
}
.mts-unset-btn:hover { color: var(--red); background: var(--red-l); }
`;

