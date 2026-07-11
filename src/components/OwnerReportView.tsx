"use client";

// Premium read-only viewer for an owner report. Used in two places:
//   - /school-admin/owner-reports/[id]  (the published view)
//   - /owner/reports/[id]/preview        (owner's preview before publish)
//
// Design language: warm parchment background, aged-gold rules, muted-maroon
// seal accent, hairline Islamic mandala watermark. Heritage-inspired but
// restrained — meant to feel like an institutional report, not a wedding card.
import type {
  ReportBlock,
  ReportImage,
  ReportFile,
  ReportLink,
  RLang,
} from "@/lib/owner-reports";
import { REPORT_LABELS } from "@/lib/owner-reports";

export type ReportViewData = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  report_date?: string | Date | null;
  published_at?: string | Date | null;
  introduction?: string | null;
  closing_note?: string | null;
  blocks: ReportBlock[];
  images: ReportImage[];
  attachments: ReportFile[];
  links: ReportLink[];
  school?: { name: string; name_alt?: string | null } | null;
  author?: { full_name: string } | null;
};

function fmt(d: string | Date | null | undefined, lang: RLang): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return ""; }
}

function fmtSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function OwnerReportView({
  report,
  lang,
}: {
  report: ReportViewData;
  lang: RLang;
}) {
  const T = REPORT_LABELS[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const schoolName =
    lang !== "ar" && report.school?.name_alt && report.school.name_alt.trim()
      ? report.school.name_alt : report.school?.name;

  return (
    <div className="orv" dir={dir}>
      <Watermark />

      <div className="orv-card">
        {/* Formal header band */}
        <header className="orv-head">
          <div className="orv-rule orv-rule--top" aria-hidden>
            <span className="orv-line" />
            <span className="orv-diamond" />
            <span className="orv-line" />
          </div>

          <div className="orv-eyebrow">
            <span className="orv-seal" aria-hidden>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="M9 12l2 2 4-5" />
              </svg>
            </span>
            <span className="orv-eyebrow-label">{T.formalReport}</span>
            <span className="orv-eyebrow-sep">·</span>
            <span className="orv-eyebrow-issuer">{T.issuedBy}</span>
          </div>

          <h1 className="orv-title">{report.title}</h1>
          {report.subtitle && <p className="orv-subtitle">{report.subtitle}</p>}

          <div className="orv-meta">
            {report.report_date && (
              <div className="orv-meta-row">
                <span className="orv-meta-k">{T.reportDate}</span>
                <span className="orv-meta-v">{fmt(report.report_date, lang)}</span>
              </div>
            )}
            {report.published_at && (
              <div className="orv-meta-row">
                <span className="orv-meta-k">{T.publishedOn}</span>
                <span className="orv-meta-v">{fmt(report.published_at, lang)}</span>
              </div>
            )}
            {schoolName && (
              <div className="orv-meta-row">
                <span className="orv-meta-k">{T.school}</span>
                <span className="orv-meta-v">{schoolName}</span>
              </div>
            )}
          </div>

          <div className="orv-rule" aria-hidden>
            <span className="orv-line" />
            <span className="orv-line" />
          </div>
        </header>

        {/* Description (subtitle prose) */}
        {report.description && (
          <p className="orv-description">{report.description}</p>
        )}

        {/* Executive intro */}
        {report.introduction && (
          <section className="orv-section">
            <h2 className="orv-section-h">{T.introduction}</h2>
            <div className="orv-prose">{paragraphs(report.introduction)}</div>
          </section>
        )}

        {/* Content blocks */}
        {report.blocks.map((b) => (
          <BlockView key={b.id} block={b} />
        ))}

        {/* Image gallery */}
        {report.images.length > 0 && (
          <section className="orv-section">
            <h2 className="orv-section-h">{T.images}</h2>
            <div className="orv-gallery">
              {report.images.map((img, i) => (
                <figure key={`${img.path}-${i}`} className="orv-fig">
                  <a href={img.url} target="_blank" rel="noreferrer" className="orv-fig-link">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.caption ?? ""} className="orv-img" />
                  </a>
                  {img.caption && <figcaption className="orv-fig-cap">{img.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Downloadable attachments */}
        {report.attachments.length > 0 && (
          <section className="orv-section">
            <h2 className="orv-section-h">{T.attachments}</h2>
            <div className="orv-files">
              {report.attachments.map((f, i) => (
                <a
                  key={`${f.path}-${i}`}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  download={f.name}
                  className="orv-file"
                >
                  <span className="orv-file-icon" aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </span>
                  <span className="orv-file-meta">
                    <span className="orv-file-name">{f.name}</span>
                    {f.size && <span className="orv-file-size">{fmtSize(f.size)}</span>}
                  </span>
                  <span className="orv-file-dl">{T.download}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* External links */}
        {report.links.length > 0 && (
          <section className="orv-section">
            <h2 className="orv-section-h">{T.links}</h2>
            <div className="orv-links">
              {report.links.map((l, i) => (
                <a
                  key={`${l.url}-${i}`}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="orv-link"
                >
                  <span className="orv-link-body">
                    <span className="orv-link-title">{l.title || l.url}</span>
                    {l.description && <span className="orv-link-desc">{l.description}</span>}
                  </span>
                  <span className="orv-link-open">{T.open} ↗</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Closing */}
        {report.closing_note && (
          <section className="orv-section">
            <h2 className="orv-section-h">{T.closingNote}</h2>
            <div className="orv-prose">{paragraphs(report.closing_note)}</div>
          </section>
        )}

        {/* Footer */}
        <footer className="orv-foot">
          <div className="orv-rule orv-rule--foot" aria-hidden>
            <span className="orv-line" />
            <span className="orv-diamond" />
            <span className="orv-line" />
          </div>
          <div className="orv-foot-id">
            <div className="orv-foot-issuer">{T.issuedBy}</div>
            {report.author?.full_name && (
              <div className="orv-foot-author">{report.author.full_name}</div>
            )}
          </div>
        </footer>
      </div>

      <style>{css}</style>
    </div>
  );
}

function BlockView({ block }: { block: ReportBlock }) {
  switch (block.type) {
    case "HEADING":
      return (
        <h2 className="orv-section-h orv-section-h--standalone">{block.title || ""}</h2>
      );
    case "HIGHLIGHT":
      return (
        <aside className="orv-highlight">
          {block.title && <div className="orv-highlight-h">{block.title}</div>}
          <div className="orv-highlight-body">{paragraphs(block.body ?? "")}</div>
        </aside>
      );
    case "BULLET_LIST":
      return (
        <section className="orv-section">
          {block.title && <h2 className="orv-section-h">{block.title}</h2>}
          <ul className="orv-list">
            {(block.items ?? []).filter((s) => s.trim()).map((it, i) => (
              <li key={i} className="orv-list-item">
                <span className="orv-list-dot" aria-hidden />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </section>
      );
    default:
      return (
        <section className="orv-section">
          {block.title && <h2 className="orv-section-h">{block.title}</h2>}
          <div className="orv-prose">{paragraphs(block.body ?? "")}</div>
        </section>
      );
  }
}

function paragraphs(s: string) {
  return s
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0)
    .map((p, i) => <p key={i}>{p}</p>);
}

/* ─── Mandala watermark (very low opacity, behind the card) ───────── */
function Watermark() {
  return (
    <div className="orv-watermark" aria-hidden>
      <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none">
        <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="0.4" />
        <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="0.35" strokeDasharray="2 7" />
        <circle cx="100" cy="100" r="52" stroke="currentColor" strokeWidth="0.35" strokeDasharray="4 5" />
        <circle cx="100" cy="100" r="32" stroke="currentColor" strokeWidth="0.4" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={100} y1={100}
              x2={100 + 86 * Math.sin(a)}
              y2={100 - 86 * Math.cos(a)}
              stroke="currentColor"
              strokeWidth="0.3"
              opacity="0.45"
            />
          );
        })}
      </svg>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=El+Messiri:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600&display=swap');

.orv {
  position: relative;
  min-height: 100vh;
  padding: 36px 20px 80px;
  font-family: 'Cairo', 'Tajawal', sans-serif;
  color: #32101A;
  background:
    radial-gradient(ellipse at 50% -10%, #F7F3EB 0%, transparent 55%),
    linear-gradient(160deg, #E5E0D5 0%, #E5E0D5 100%);
  overflow: hidden;
}

.orv-watermark {
  position: absolute;
  inset: 80px 0 auto 0;
  margin: 0 auto;
  width: 720px; max-width: 90%;
  pointer-events: none;
  color: #B8A082;
  opacity: 0.08;
  z-index: 0;
}

.orv-card {
  position: relative;
  z-index: 1;
  max-width: 880px;
  margin: 0 auto;
  background: linear-gradient(165deg, #FFFBF5 0%, #F7F3EB 100%);
  border: 1.5px solid #B8A082;
  border-radius: 18px;
  padding: 56px 56px 48px;
  box-shadow:
    0 14px 50px rgba(107,30,45,0.15),
    inset 0 0 0 5px #E5E0D5,
    inset 0 0 0 6.5px rgba(107,30,45,0.4);
}

/* corner ornaments */
.orv-card::before, .orv-card::after {
  content: ''; position: absolute; width: 28px; height: 28px;
  border: 1.5px solid rgba(107,30,45,0.55);
  pointer-events: none;
}
.orv-card::before { top: 18px; inset-inline-start: 18px; border-right: none; border-bottom: none; }
.orv-card::after  { bottom: 18px; inset-inline-end: 18px; border-left: none;  border-top: none; }

/* HEADER */
.orv-head { text-align: center; margin-bottom: 22px; }
.orv-rule {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin: 8px 0 14px;
}
.orv-rule--top    { margin-top: 0; }
.orv-rule--foot   { margin: 28px 0 8px; }
.orv-line {
  flex: 1; max-width: 220px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(107,30,45,0.65), transparent);
}
.orv-diamond {
  width: 6px; height: 6px; background: #B8A082; transform: rotate(45deg);
  border-radius: 1px; flex-shrink: 0;
}

.orv-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11.5px; font-weight: 800; color: #6B1E2D;
  letter-spacing: 0.18em; text-transform: uppercase;
  margin-bottom: 14px;
}
.orv-eyebrow-sep { color: #B8A082; }
.orv-eyebrow-issuer { color: #6B1E2D; }
.orv-seal {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(107,30,45,0.08);
  color: #6B1E2D;
  border: 1px solid rgba(107,30,45,0.35);
}

.orv-title {
  font-family: 'El Messiri', 'Cairo', serif;
  font-size: 34px; font-weight: 700; color: #32101A;
  margin: 0 0 10px; line-height: 1.3;
}
.orv-subtitle {
  font-size: 15px; color: #6B1E2D; font-weight: 600;
  max-width: 620px; margin: 0 auto; line-height: 1.85;
}

.orv-meta {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 22px;
  margin: 18px 0 6px; font-size: 12.5px;
}
.orv-meta-row { display: inline-flex; gap: 8px; align-items: baseline; }
.orv-meta-k {
  font-weight: 800; color: #8F765B; letter-spacing: 0.04em;
  text-transform: uppercase; font-size: 10.5px;
}
.orv-meta-v { color: #4A0E1C; font-weight: 700; }

/* DESCRIPTION */
.orv-description {
  font-size: 14.5px; color: #6B1E2D; line-height: 1.95; text-align: center;
  margin: 6px auto 18px; max-width: 660px; font-style: italic;
}

/* SECTIONS */
.orv-section { margin-top: 28px; }
.orv-section-h {
  font-family: 'El Messiri', 'Cairo', serif;
  font-size: 19px; font-weight: 700; color: #6B1E2D;
  margin: 0 0 12px; padding-inline-start: 14px;
  position: relative; line-height: 1.5;
}
.orv-section-h::before {
  content: ''; position: absolute; inset-inline-start: 0; top: 8px;
  width: 4px; height: 18px; border-radius: 2px;
  background: linear-gradient(180deg,#D9C9B0,#B8A082);
}
.orv-section-h--standalone {
  border-top: 1px solid rgba(107,30,45,0.32);
  margin-top: 36px; padding-top: 22px;
}

.orv-prose { font-size: 14.5px; color: #32101A; line-height: 1.95; }
.orv-prose p { margin: 0 0 12px; }
.orv-prose p:last-child { margin: 0; }

/* HIGHLIGHT */
.orv-highlight {
  background: linear-gradient(165deg,#EFEAE0,#D9C9B0);
  border: 1.5px solid rgba(107,30,45,0.55);
  border-radius: 14px; padding: 18px 22px;
  margin: 22px 0;
  position: relative;
}
.orv-highlight::before {
  content: ''; position: absolute; top: 12px; inset-inline-start: 12px;
  width: 6px; height: 6px; background: #6B1E2D; transform: rotate(45deg);
  border-radius: 1px;
}
.orv-highlight-h {
  font-size: 13px; font-weight: 800; color: #6B1E2D;
  letter-spacing: 0.04em; margin-bottom: 6px;
}
.orv-highlight-body { font-size: 14px; color: #6B1E2D; line-height: 1.85; }

/* LIST */
.orv-list { list-style: none; padding: 0; margin: 0; }
.orv-list-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 7px 0; font-size: 14.5px; color: #32101A; line-height: 1.8;
}
.orv-list-dot {
  flex-shrink: 0; width: 7px; height: 7px;
  background: #B8A082; transform: rotate(45deg);
  margin-top: 11px; border-radius: 1px;
}

/* GALLERY */
.orv-gallery {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr));
  gap: 14px;
}
.orv-fig { margin: 0; display: flex; flex-direction: column; gap: 6px; }
.orv-fig-link {
  display: block; overflow: hidden; border-radius: 12px;
  border: 1px solid rgba(107,30,45,0.35);
  box-shadow: 0 6px 18px rgba(107,30,45,0.10);
  background: #FFF;
}
.orv-img {
  width: 100%; height: 180px; object-fit: cover; display: block;
  transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
}
.orv-fig-link:hover .orv-img { transform: scale(1.04); }
.orv-fig-cap { font-size: 12px; color: #6B1E2D; text-align: center; font-weight: 600; }

/* ATTACHMENTS */
.orv-files { display: flex; flex-direction: column; gap: 10px; }
.orv-file {
  display: flex; align-items: center; gap: 14px;
  background: #FFFBF5;
  border: 1.5px solid rgba(107,30,45,0.32);
  border-radius: 13px; padding: 14px 18px;
  text-decoration: none; color: inherit;
  transition: all 0.18s;
}
.orv-file:hover {
  border-color: #B8A082;
  box-shadow: 0 6px 18px rgba(107,30,45,0.12);
  transform: translateY(-1px);
}
.orv-file-icon {
  flex-shrink: 0; color: #6B1E2D;
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(107,30,45,0.10);
  border: 1px solid rgba(107,30,45,0.32);
}
.orv-file-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.orv-file-name { font-weight: 800; color: #32101A; font-size: 14px; word-break: break-word; }
.orv-file-size { font-size: 12px; color: #8F765B; font-weight: 600; }
.orv-file-dl {
  font-size: 12px; font-weight: 800; color: #6B1E2D;
  background: rgba(107,30,45,0.16);
  border: 1px solid rgba(107,30,45,0.42);
  padding: 6px 12px; border-radius: 99px;
  white-space: nowrap;
}

/* LINKS */
.orv-links { display: flex; flex-direction: column; gap: 10px; }
.orv-link {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  background: #FFFBF5;
  border: 1.5px solid rgba(107,30,45,0.32);
  border-radius: 13px; padding: 14px 18px;
  text-decoration: none; color: inherit;
  transition: all 0.18s;
}
.orv-link:hover {
  border-color: #B8A082;
  box-shadow: 0 6px 18px rgba(107,30,45,0.12);
  transform: translateY(-1px);
}
.orv-link-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.orv-link-title { font-weight: 800; color: #32101A; font-size: 14px; word-break: break-word; }
.orv-link-desc  { font-size: 12.5px; color: #6B1E2D; line-height: 1.7; }
.orv-link-open  {
  font-size: 12px; font-weight: 800; color: #6B1E2D;
  white-space: nowrap;
}

/* FOOTER */
.orv-foot { margin-top: 32px; text-align: center; }
.orv-foot-id { color: #6B1E2D; }
.orv-foot-issuer { font-size: 12px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
.orv-foot-author { font-size: 13px; margin-top: 6px; color: #32101A; font-weight: 700; }

/* RESPONSIVE */
@media (max-width: 640px) {
  .orv { padding: 18px 12px 60px; }
  .orv-card { padding: 32px 22px 28px; border-radius: 14px; }
  .orv-title { font-size: 24px; }
  .orv-subtitle { font-size: 13.5px; }
  .orv-meta { gap: 8px 14px; }
  .orv-gallery { grid-template-columns: 1fr 1fr; }
  .orv-img { height: 140px; }
}
@media print {
  .orv { background: #FFF; padding: 0; }
  .orv-card { box-shadow: none; border: none; }
  .orv-watermark { display: none; }
}
`;
