"use client";
import { useLang } from "@/lib/language-context";
import type { Lang } from "@/lib/language-context";

/**
 * Modern segmented language toggle.
 *
 * Both options are ALWAYS clearly visible — no fade-out, no hiding.
 * A gold thumb slides between them as the language changes.
 */

const LABELS: Record<string, { full: string; short: string }> = {
  ar: { full: "عربي",  short: "AR" },
  sq: { full: "Shqip", short: "SQ" },
  en: { full: "EN",    short: "EN" },
};

interface Props {
  /** Use dark-on-light styling instead of the default light-on-dark sidebar style */
  dark?: boolean;
  /** The non-Arabic language to offer. Defaults to "sq". */
  secondaryLang?: string;
  /** Compact icon-only variant (good for tight headers) */
  compact?: boolean;
}

export default function LangToggle({ dark, secondaryLang = "sq", compact = false }: Props) {
  const { lang, setLang } = useLang();
  const options: Lang[] = ["ar", secondaryLang as Lang];
  const activeIndex = options.indexOf(lang) === -1 ? 0 : options.indexOf(lang);

  return (
    <div className={`ltg-wrap${dark ? " ltg-wrap--dark" : ""}${compact ? " ltg-wrap--compact" : ""}`}>
      {/* Sliding indicator */}
      <span
        className="ltg-thumb"
        style={{ transform: `translateX(${activeIndex === 0 ? "0%" : "100%"})` }}
        aria-hidden="true"
      />

      {options.map((l) => {
        const isActive = lang === l;
        const text = compact ? LABELS[l].short : LABELS[l].full;
        return (
          <button
            key={l}
            type="button"
            className={`ltg-btn${isActive ? " ltg-btn--on" : ""}`}
            onClick={() => setLang(l)}
            aria-pressed={isActive}
            aria-label={`Switch language to ${LABELS[l].full}`}
          >
            <span className="ltg-btn-text">{text}</span>
          </button>
        );
      })}

      <style>{css}</style>
    </div>
  );
}

const css = `
  @keyframes ltg-pop {
    0% { transform: scale(0.95); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  .ltg-wrap {
    /* sliding-thumb segmented control */
    position: relative;
    display: inline-grid;
    grid-template-columns: 1fr 1fr;
    align-items: stretch;
    gap: 0;
    padding: 4px;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)),
      rgba(15,17,20,0.45);
    border: 1px solid rgba(200,169,106,0.18);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.04),
      0 2px 12px rgba(0,0,0,0.18);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    overflow: hidden;
    isolation: isolate;
    width: 100%;
    max-width: 200px;
    font-family: 'Cairo', sans-serif;
    animation: ltg-pop 0.25s cubic-bezier(0.22,1,0.36,1) both;
  }

  .ltg-wrap--compact { max-width: 116px; padding: 3px; }

  /* Sliding gold thumb */
  .ltg-thumb {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc(50% - 4px);
    border-radius: 9px;
    background: linear-gradient(135deg, #E0C788 0%, #C8A96A 50%, #B89B5E 100%);
    box-shadow:
      0 2px 8px rgba(200,169,106,0.35),
      inset 0 1px 0 rgba(255,255,255,0.25),
      inset 0 -1px 0 rgba(0,0,0,0.08);
    transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 0;
    pointer-events: none;
  }
  .ltg-wrap--compact .ltg-thumb { top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); }

  /* Pill buttons */
  .ltg-btn {
    position: relative;
    z-index: 1;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px 14px;
    border-radius: 9px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1;
    color: rgba(232, 220, 188, 0.85);  /* cream — clearly readable */
    transition: color 0.22s ease, transform 0.18s ease;
    user-select: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
  }
  .ltg-wrap--compact .ltg-btn { padding: 6px 8px; font-size: 11px; min-height: 24px; }

  .ltg-btn:hover:not(.ltg-btn--on) { color: rgba(255, 248, 230, 0.95); }
  .ltg-btn:active { transform: scale(0.97); }
  .ltg-btn--on { color: #0B0B0C; }
  .ltg-btn-text { position: relative; }

  /* ────────── LIGHT VARIANT (on cream backgrounds) ────────── */
  .ltg-wrap--dark {
    /* "dark" prop = on dark sidebar — keep the styling above */
  }
  .ltg-wrap:not(.ltg-wrap--dark) {
    background:
      linear-gradient(180deg, rgba(255,255,255,0.85), rgba(247,243,233,0.7)),
      #F2EDDD;
    border-color: rgba(184, 155, 94, 0.32);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.5),
      0 2px 8px rgba(0,0,0,0.04);
  }
  .ltg-wrap:not(.ltg-wrap--dark) .ltg-btn {
    color: #6B5A38;  /* warm brown — clear on cream */
  }
  .ltg-wrap:not(.ltg-wrap--dark) .ltg-btn:hover:not(.ltg-btn--on) {
    color: #3D3320;
  }
  .ltg-wrap:not(.ltg-wrap--dark) .ltg-btn--on {
    color: #0B0B0C;
  }

  /* Subtle accessibility focus ring */
  .ltg-btn:focus-visible {
    outline: 2px solid rgba(200,169,106,0.55);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .ltg-thumb { transition: none; }
  }
`;
