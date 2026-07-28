"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";

export type GuideStep = { title: string; body: string };

const COPY = {
  ar: { how: "كيف تعمل هذه الصفحة؟", hide: "إخفاء", show: "عرض الشرح" },
  sq: { how: "Si funksionon kjo faqe?", hide: "Fshih", show: "Shfaq udhëzimin" },
} as const;

/**
 * Collapsible step-by-step explainer shown at the top of the teacher
 * authoring pages. The open/closed choice is remembered per page id so a
 * teacher who already knows the flow isn't shown it forever.
 */
export function HowItWorks({
  id,
  steps,
  lang,
  defaultOpen = true,
}: {
  id: string;
  steps: GuideStep[];
  lang: "ar" | "sq";
  defaultOpen?: boolean;
}) {
  const t = COPY[lang];
  const storageKey = `rowad:guide:${id}`;
  // Lazy initialiser rather than an effect: reading localStorage during the
  // first client render avoids a second cascading render.
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved === null ? defaultOpen : saved === "1";
    } catch {
      return defaultOpen;
    }
  });

  function toggle() {
    setOpen((current) => {
      const next = !current;
      try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  const Arrow = lang === "ar" ? ChevronLeft : ChevronRight;

  return (
    <section className="tui-guide">
      <div className="tui-guide-head">
        <h2><Lightbulb size={16} />{t.how}</h2>
        <button type="button" className="tui-guide-toggle" onClick={toggle} aria-expanded={open}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {open ? t.hide : t.show}
        </button>
      </div>
      {open && (
        <div className="tui-steps">
          {steps.map((step, index) => (
            <div className="tui-step" key={step.title}>
              <span className="tui-step-n">{index + 1}</span>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
              {index < steps.length - 1 && <Arrow className="tui-step-arrow" size={16} />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
