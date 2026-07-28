/**
 * Shared visual language for the teacher authoring surfaces (roadmap,
 * concepts, lessons, quizzes).
 *
 * Every class is prefixed `tui-` so it can be dropped into any teacher page
 * without colliding with that page's own local styles. Colours come from the
 * approved Rowad palette only (see scripts/check-theme-colors.mjs).
 */
export const teacherUI = `
.tui{font-family:'Cairo','Tajawal',sans-serif;color:#32101A}

/* ── Page header ─────────────────────────────────────────────── */
.tui-hero{position:relative;overflow:hidden;border-radius:22px;padding:clamp(20px,3.4vw,32px);margin-bottom:16px;
  background:linear-gradient(125deg,#32101A,#4A0E1C 58%,#6B1E2D);
  border:1px solid rgba(217,201,176,.26);box-shadow:0 18px 44px rgba(107,30,45,.18)}
.tui-hero:after{content:'';position:absolute;width:340px;height:340px;border-radius:50%;inset-inline-end:-130px;top:-190px;
  background:radial-gradient(circle,rgba(217,201,176,.2),transparent 68%);pointer-events:none}
.tui-hero-inner{position:relative;z-index:1;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
.tui-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#B8A082}
.tui-hero h1{margin:9px 0 8px;font-size:clamp(21px,3.2vw,31px);line-height:1.25;font-weight:900;color:#F7F3EB}
.tui-hero p{margin:0;max-width:660px;font-size:13px;line-height:1.9;color:rgba(247,243,235,.76)}
.tui-hero-side{display:flex;gap:8px;flex-wrap:wrap}

/* ── Stat pills inside the hero ──────────────────────────────── */
.tui-stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;position:relative;z-index:1}
.tui-stat{min-width:96px;border:1px solid rgba(217,201,176,.24);border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.06)}
.tui-stat b{display:block;font-size:20px;line-height:1;color:#F7F3EB}
.tui-stat span{display:block;margin-top:5px;font-size:10px;font-weight:800;color:#D9C9B0}

/* ── "How it works" guidance ─────────────────────────────────── */
.tui-guide{border:1px solid rgba(107,30,45,.24);border-radius:18px;background:#FFFBF5;
  padding:clamp(14px,2vw,20px);margin-bottom:16px;box-shadow:0 10px 26px rgba(107,30,45,.05)}
.tui-guide-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.tui-guide-head h2{margin:0;display:flex;align-items:center;gap:8px;font-size:14.5px;font-weight:900;color:#32101A}
.tui-guide-toggle{display:inline-flex;align-items:center;gap:5px;min-height:34px;border:1px solid #D9C9B0;border-radius:9px;
  background:#FFFFFF;color:#6B1E2D;padding:0 11px;font:800 11px 'Cairo',sans-serif;cursor:pointer}
.tui-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:14px}
.tui-step{position:relative;border:1px solid #E5E0D5;border-radius:14px;background:#F7F3EB;padding:13px 14px}
.tui-step-n{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;
  background:linear-gradient(140deg,#6B1E2D,#32101A);color:#D9C9B0;font-size:11px;font-weight:900;margin-bottom:8px}
.tui-step strong{display:block;font-size:12.5px;color:#32101A;margin-bottom:4px}
.tui-step p{margin:0;font-size:11.5px;line-height:1.75;color:#655B53}
.tui-step-arrow{position:absolute;inset-inline-end:-13px;top:50%;transform:translateY(-50%);color:#B8A082;z-index:1}
@media(max-width:720px){.tui-step-arrow{display:none}}

/* ── Cards ───────────────────────────────────────────────────── */
.tui-card{border:1px solid rgba(107,30,45,.2);border-radius:18px;background:#FFFBF5;
  padding:clamp(14px,2vw,20px);box-shadow:0 12px 30px rgba(107,30,45,.06)}
.tui-section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:13px}
.tui-section-head h2{margin:0 0 3px;display:flex;align-items:center;gap:8px;font-size:16px;font-weight:900;color:#32101A}
.tui-section-head p{margin:0;font-size:12px;color:#655B53;line-height:1.75;max-width:560px}

/* ── Buttons ─────────────────────────────────────────────────── */
.tui-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;border:0;border-radius:12px;
  padding:0 17px;font:900 12.5px 'Cairo',sans-serif;cursor:pointer;text-decoration:none;transition:transform .14s,box-shadow .14s}
.tui-btn:hover:not(:disabled){transform:translateY(-1px)}
.tui-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.tui-btn-primary{background:linear-gradient(140deg,#6B1E2D,#32101A);color:#F7F3EB;box-shadow:0 8px 20px rgba(107,30,45,.2)}
.tui-btn-gold{background:linear-gradient(140deg,#B8A082,#8F765B);color:#32101A}
.tui-btn-ghost{background:#FFFFFF;border:1px solid #D9C9B0;color:#6B1E2D}
.tui-btn-sm{min-height:34px;padding:0 12px;font-size:11.5px;border-radius:10px}
.tui-btn-danger{background:#FFFFFF;border:1px solid rgba(107,30,45,.3);color:#6B1E2D}
.tui-btn-danger:hover:not(:disabled){background:#6B1E2D;color:#FFFFFF}

/* ── Status chips ────────────────────────────────────────────── */
.tui-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 10px;font-size:10px;font-weight:900;white-space:nowrap}
.tui-chip-neutral{background:#EFEAE0;color:#655B53}
.tui-chip-draft{background:#EFEAE0;color:#655B53}
.tui-chip-pending{background:rgba(184,160,130,.22);color:#8F765B}
.tui-chip-approved{background:rgba(27,94,32,.14);color:#1B5E20}
.tui-chip-rejected{background:rgba(107,30,45,.12);color:#6B1E2D}
.tui-chip-legacy{background:rgba(26,26,26,.08);color:#655B53}

/* ── Progress bar ────────────────────────────────────────────── */
.tui-bar{height:7px;border-radius:999px;background:#EFEAE0;overflow:hidden}
.tui-bar>i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#6B1E2D,#B8A082);transition:width .45s ease}

/* ── Empty states ────────────────────────────────────────────── */
.tui-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;text-align:center;
  padding:34px 22px;border:1px dashed rgba(107,30,45,.42);border-radius:16px;background:rgba(107,30,45,.05)}
.tui-empty-icon{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;
  background:linear-gradient(140deg,#F7F3EB,#EFEAE0);border:1px solid #E5E0D5;color:#8F765B}
.tui-empty strong{font-size:14px;color:#32101A}
.tui-empty p{margin:0;max-width:440px;font-size:12px;line-height:1.8;color:#8C8274}

/* ── Callouts ────────────────────────────────────────────────── */
.tui-note{display:flex;gap:10px;align-items:flex-start;border-radius:13px;padding:12px 14px;font-size:12px;line-height:1.8;font-weight:700}
.tui-note-info{background:rgba(184,160,130,.14);border:1px solid rgba(184,160,130,.3);color:#4A0E1C}
.tui-note-warn{background:rgba(107,30,45,.07);border:1px solid rgba(107,30,45,.2);color:#6B1E2D}
.tui-note-ok{background:rgba(27,94,32,.09);border:1px solid rgba(27,94,32,.22);color:#1B5E20}
.tui-note svg{flex:none;margin-top:2px}

/* ── Search field ────────────────────────────────────────────── */
.tui-search{display:flex;align-items:center;gap:9px;min-height:42px;border:1px solid #D9C9B0;border-radius:12px;
  background:#FFFFFF;padding:0 13px;min-width:min(260px,100%)}
.tui-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:13px;color:#32101A}
.tui-search svg{color:#8C8274;flex:none}

@media(max-width:560px){
  .tui-hero{border-radius:18px}
  .tui-hero-side{width:100%}
  .tui-hero-side>*{flex:1}
  .tui-stat{flex:1;min-width:calc(50% - 4px)}
  .tui-section-head{flex-direction:column}
  .tui-section-head>div:last-child{width:100%;display:flex;gap:8px}
  .tui-section-head>div:last-child>*{flex:1}
  /* Without min-width:0 a flex child is never allowed to shrink below its
     min-content width, so the search box and the nowrap filter row pushed
     themselves past the viewport edge and got clipped. */
  .tui-search{min-width:0;max-width:100%;width:100%}
}
`;

export type ReviewStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export const reviewChipClass: Record<ReviewStatus, string> = {
  DRAFT: "tui-chip tui-chip-draft",
  PENDING_REVIEW: "tui-chip tui-chip-pending",
  APPROVED: "tui-chip tui-chip-approved",
  REJECTED: "tui-chip tui-chip-rejected",
};

export const reviewLabel: Record<"ar" | "sq", Record<ReviewStatus, string>> = {
  ar: {
    DRAFT: "مسودة",
    PENDING_REVIEW: "قيد المراجعة",
    APPROVED: "معتمد ومنشور",
    REJECTED: "يحتاج تعديل",
  },
  sq: {
    DRAFT: "Draft",
    PENDING_REVIEW: "Në shqyrtim",
    APPROVED: "Miratuar",
    REJECTED: "Kërkon ndryshim",
  },
};
