"use client";
export const dynamic = "force-dynamic";

import { Component, type ReactNode, use, useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";
import {
  pickLang,
  GENDER_L,
  CURRENT_ROLE_L,
  QUALIFICATION_L,
  EXPERIENCE_RANGE_L,
  ACHIEVEMENT_SCOPE_L,
  EXPERIENCE_AREA_L,
  TARGET_GROUP_L,
  CONTRIBUTION_L,
  LANGUAGE_L,
  LANG_LEVEL_L,
  ATTACHMENT_L,
  type AppLanguageEntry,
} from "@/lib/teacher-application";

type App = {
  full_name: string; age: number; country: string; city: string; phone: string; email: string;
  gender: "MALE" | "FEMALE";
  nominating_entity: string | null; nominator_name: string | null; nominator_role: string | null;
  current_role: string; current_role_other: string | null;
  qualification: string; specialization: string; graduation_institution: string;
  experience_areas: string[]; experience_areas_other: string | null;
  years_of_experience: string;
  target_groups: string[]; target_groups_other: string | null;
  contributions: string[];
  has_achievements: boolean; achievements_scope: string | null;
  languages: AppLanguageEntry[]; languages_other: string | null;
  attachments: string[]; notes: string | null;
  submitted_at: string; reviewed_at: string | null; reviewer_notes: string | null;
};

// Same boundary pattern as the detail page â€” surfaces render errors as a
// visible message + console log instead of an empty page that swallows the
// auto-print trigger.
class PrintBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error, info: { componentStack?: string }) {
    console.error("[application print render]", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 40, maxWidth: 720, margin: "0 auto", fontFamily: "'Cairo',sans-serif" }}>
          <div style={{ background: "rgba(139,26,26,0.06)", border: "1.5px solid rgba(139,26,26,0.32)", borderRadius: 12, padding: 18, color: "#5A1818" }}>
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
              ØªØ¹Ø°Ø± ØªØ¬Ù‡ÙŠØ² Ø§Ù„Ø·Ù„Ø¨ Ù„Ù„Ø·Ø¨Ø§Ø¹Ø© Â· Cannot render this application for print
            </div>
            <code style={{ display: "block", fontSize: 12, opacity: 0.85, whiteSpace: "pre-wrap", direction: "ltr", textAlign: "left" }}>
              {String(this.state.err?.message ?? this.state.err)}
            </code>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PrintPage(props: { params: Promise<{ id: string }> }) {
  return (
    <PrintBoundary>
      <PrintPageInner {...props} />
    </PrintBoundary>
  );
}

function PrintPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const L = pickLang(lang);
  const dir = L === "ar" ? "rtl" : "ltr";

  const [app, setApp] = useState<App | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    fetch(`/api/school-admin/applications/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        // Defensive: JSON columns can deserialize as null. Coerce to []
        // so render never throws on .length / .map.
        const a = d?.teacher?.application;
        if (a) {
          a.experience_areas = Array.isArray(a.experience_areas) ? a.experience_areas : [];
          a.target_groups    = Array.isArray(a.target_groups)    ? a.target_groups    : [];
          a.contributions    = Array.isArray(a.contributions)    ? a.contributions    : [];
          a.languages        = Array.isArray(a.languages)        ? a.languages        : [];
          a.attachments      = Array.isArray(a.attachments)      ? a.attachments      : [];
        }
        setApp(a ?? null);
        setName(d?.teacher?.profile?.full_name ?? "");
      })
      .catch(() => {});
  }, [id]);

  // Auto-open print dialog once data is ready.
  useEffect(() => {
    if (!app) return;
    const id = setTimeout(() => {
      try { window.print(); } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(id);
  }, [app]);

  if (!app) {
    return <div style={{ padding: 40, textAlign: "center" }}>â€¦</div>;
  }

  const fmtDate = (s: string | null | undefined) => {
    if (!s) return "â€”";
    try { return new Date(s).toLocaleString(L === "ar" ? "ar" : "sq"); }
    catch { return s; }
  };

  const labels = L === "ar"
    ? {
        title: "Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„ØªÙ‚Ø¯ÙŠÙ… â€” Ø§Ù„Ù…Ø±Ø­Ù„Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰",
        sub: "Ù…Ù„Ù Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…ØªÙ‚Ø¯Ù…",
        ageL: "Ø§Ù„Ø¹Ù…Ø±", countryL: "Ø§Ù„Ø¯ÙˆÙ„Ø©", cityL: "Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©", phoneL: "Ø§Ù„Ø¬ÙˆØ§Ù„", emailL: "Ø§Ù„Ø¨Ø±ÙŠØ¯", genderL: "Ø§Ù„Ø¬Ù†Ø³",
        s1: "Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø®ØµÙŠØ©", s2: "Ø¬Ù‡Ø© Ø§Ù„ØªØ±Ø´ÙŠØ­", s3: "Ø§Ù„Ø¯ÙˆØ± Ø§Ù„Ø­Ø§Ù„ÙŠ", s4: "Ø§Ù„Ù…Ø¤Ù‡Ù„ Ø§Ù„Ø¹Ù„Ù…ÙŠ",
        s5: "Ù…Ø¬Ø§Ù„Ø§Øª Ø§Ù„Ø®Ø¨Ø±Ø©", s6: "Ø³Ù†ÙˆØ§Øª Ø§Ù„Ø®Ø¨Ø±Ø©", s7: "Ø§Ù„ÙØ¦Ø§Øª Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØ©",
        s8: "Ø§Ù„Ù…Ø³Ø§Ù‡Ù…Ø§Øª", s9: "Ø§Ù„Ø¥Ù†Ø¬Ø§Ø²Ø§Øª", s10: "Ø§Ù„Ù„ØºØ§Øª", s11: "Ø§Ù„Ù…Ø±ÙÙ‚Ø§Øª ÙˆØ§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª",
        s12: "Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
        nomEntity: "Ø§Ù„Ø¬Ù‡Ø©", nomName: "Ø§Ø³Ù… Ø§Ù„Ù…Ø±Ø´ÙÙ‘Ø­", nomRole: "ØµÙØªÙ‡",
        spec: "Ø§Ù„ØªØ®ØµØµ", inst: "Ø¬Ù‡Ø© Ø§Ù„ØªØ®Ø±Ø¬",
        other: "Ø£Ø®Ø±Ù‰", hasAch: "Ø­ØµÙ„ Ø¹Ù„Ù‰ Ø¥Ù†Ø¬Ø§Ø²Ø§Øª", scope: "Ø§Ù„Ù†Ø·Ø§Ù‚", yes: "Ù†Ø¹Ù…", no: "Ù„Ø§",
        notes: "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ©", submittedAt: "ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø¯ÙŠÙ…", reviewedAt: "ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©", reviewerNotes: "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹",
        teacherFor: "Ø§Ù„Ù…ØªÙ‚Ø¯Ù…",
        none: "â€”",
      }
    : {
        title: "Formulari i aplikimit â€” Faza e parÃ«",
        sub: "Dosja e mÃ«suesit aplikant",
        ageL: "Mosha", countryL: "Shteti", cityL: "Qyteti", phoneL: "Telefoni", emailL: "E-mail", genderL: "Gjinia",
        s1: "TÃ« dhÃ«nat personale", s2: "Pala rekomanduese", s3: "Roli aktual", s4: "Kualifikimi",
        s5: "Fushat e pÃ«rvojÃ«s", s6: "Vitet e pÃ«rvojÃ«s", s7: "Grupet e synuara",
        s8: "Kontributet", s9: "Arritjet", s10: "GjuhÃ«t", s11: "BashkÃ«ngjitje dhe shÃ«nime",
        s12: "TÃ« dhÃ«nat e shqyrtimit",
        nomEntity: "Institucioni", nomName: "Personi rekomandues", nomRole: "Roli i tij",
        spec: "Specializimi", inst: "Institucioni",
        other: "TjetÃ«r", hasAch: "Ka pasur arritje", scope: "Shtrirja", yes: "Po", no: "Jo",
        notes: "ShÃ«nime shtesÃ«", submittedAt: "Data e dÃ«rgimit", reviewedAt: "Data e shqyrtimit", reviewerNotes: "ShÃ«nimet e shqyrtuesit",
        teacherFor: "Aplikuesi",
        none: "â€”",
      };

  return (
    <div className="pr-page" dir={dir}>
      <header className="pr-head">
        <div>
          <h1 className="pr-title">{labels.title}</h1>
          <p className="pr-sub">{labels.sub}</p>
        </div>
        <div className="pr-name">
          <span className="pr-name-label">{labels.teacherFor}</span>
          <strong>{name || app.full_name}</strong>
        </div>
      </header>

      <Section title={labels.s1}>
        <KV label={labels.ageL} value={String(app.age)} />
        <KV label={labels.countryL} value={app.country} />
        <KV label={labels.cityL} value={app.city} />
        <KV label={labels.phoneL} value={app.phone} />
        <KV label={labels.emailL} value={app.email} />
        <KV label={labels.genderL} value={GENDER_L[app.gender as keyof typeof GENDER_L]?.[L] ?? "â€”"} />
      </Section>

      {/* Nomination section only printed for legacy applications that
          carried those fields; new applications never populate them. */}
      {(app.nominating_entity || app.nominator_name || app.nominator_role) && (
        <Section title={labels.s2}>
          <KV label={labels.nomEntity} value={app.nominating_entity || labels.none} />
          <KV label={labels.nomName} value={app.nominator_name || labels.none} />
          <KV label={labels.nomRole} value={app.nominator_role || labels.none} />
        </Section>
      )}

      <Section title={labels.s3}>
        <KV
          label=""
          value={
            (CURRENT_ROLE_L[app.current_role as keyof typeof CURRENT_ROLE_L]?.[L] ?? app.current_role) +
            (app.current_role_other ? ` â€” ${app.current_role_other}` : "")
          }
        />
      </Section>

      <Section title={labels.s4}>
        <KV label={QUALIFICATION_L[app.qualification as keyof typeof QUALIFICATION_L]?.[L] ?? app.qualification} value="" />
        <KV label={labels.spec} value={app.specialization} />
        <KV label={labels.inst} value={app.graduation_institution} />
      </Section>

      <Section title={labels.s5}>
        <p className="pr-list">{app.experience_areas.map((c) => EXPERIENCE_AREA_L[c]?.[L] ?? c).join("ØŒ ") || labels.none}</p>
        {app.experience_areas_other && <KV label={labels.other} value={app.experience_areas_other} />}
      </Section>

      <Section title={labels.s6}>
        <KV label="" value={EXPERIENCE_RANGE_L[app.years_of_experience as keyof typeof EXPERIENCE_RANGE_L]?.[L] ?? app.years_of_experience} />
      </Section>

      <Section title={labels.s7}>
        <p className="pr-list">{app.target_groups.map((c) => TARGET_GROUP_L[c]?.[L] ?? c).join("ØŒ ") || labels.none}</p>
        {app.target_groups_other && <KV label={labels.other} value={app.target_groups_other} />}
      </Section>

      <Section title={labels.s8}>
        <p className="pr-list">{app.contributions.map((c) => CONTRIBUTION_L[c]?.[L] ?? c).join("ØŒ ") || labels.none}</p>
      </Section>

      <Section title={labels.s9}>
        <KV label={labels.hasAch} value={app.has_achievements ? labels.yes : labels.no} />
        {app.has_achievements && app.achievements_scope && (
          <KV label={labels.scope} value={ACHIEVEMENT_SCOPE_L[app.achievements_scope as keyof typeof ACHIEVEMENT_SCOPE_L]?.[L] ?? app.achievements_scope} />
        )}
      </Section>

      <Section title={labels.s10}>
        {app.languages.length === 0
          ? <p className="pr-list">{labels.none}</p>
          : (
            <ul className="pr-langs">
              {app.languages.map((l) => (
                <li key={l.lang}>
                  <strong>{LANGUAGE_L[l.lang]?.[L] ?? l.lang}</strong>
                  {" â€” "}
                  {LANG_LEVEL_L[l.level]?.[L] ?? l.level}
                </li>
              ))}
            </ul>
          )
        }
        {app.languages_other && <KV label={labels.other} value={app.languages_other} />}
      </Section>

      {/* "About the candidate" â€” free-form notes (new applications) or
          legacy attachments checklist if present on older records. */}
      <Section title={L === "ar" ? "Ù†Ø¨Ø°Ø© Ø¹Ù† Ø§Ù„Ù…Ø±Ø´Ù‘Ø­" : "Rreth kandidatit"}>
        {app.notes && <KV label={labels.notes} value={app.notes} />}
        {app.attachments && app.attachments.length > 0 && (
          <KV
            label={L === "ar" ? "Ù…Ø±ÙÙ‚Ø§Øª (Ù‚Ø¯ÙŠÙ…)" : "BashkÃ«ngjitje (tÃ« vjetra)"}
            value={app.attachments.map((c) => ATTACHMENT_L[c]?.[L] ?? c).join("ØŒ ")}
          />
        )}
        {!app.notes && (!app.attachments || app.attachments.length === 0) && (
          <p className="pr-list">{labels.none}</p>
        )}
      </Section>

      <Section title={labels.s12}>
        <KV label={labels.submittedAt} value={fmtDate(app.submitted_at)} />
        <KV label={labels.reviewedAt} value={fmtDate(app.reviewed_at)} />
        {app.reviewer_notes && <KV label={labels.reviewerNotes} value={app.reviewer_notes} />}
      </Section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        html, body { background: #FFF; }
        .pr-page {
          font-family: 'Cairo', 'Tajawal', sans-serif;
          max-width: 800px; margin: 24px auto; padding: 30px;
          color: #1B1810; background: #FFF; line-height: 1.85;
        }
        .pr-head {
          display: flex; align-items: flex-start; gap: 20px;
          padding-bottom: 18px; border-bottom: 3px double #8F765B;
          margin-bottom: 22px;
        }
        .pr-head > div { flex: 1; }
        .pr-title { font-size: 22px; font-weight: 900; margin: 0 0 4px; color: #6B4F1E; }
        .pr-sub { font-size: 12.5px; color: #7A6440; margin: 0; }
        .pr-name { text-align: end; font-size: 14px; }
        .pr-name-label { display: block; font-size: 10.5px; color: #8A7B60; letter-spacing: 0.1em; text-transform: uppercase; }
        .pr-name strong { font-size: 16px; color: #1B1810; }

        .pr-section { margin-bottom: 18px; page-break-inside: avoid; }
        .pr-section-title {
          font-size: 13.5px; font-weight: 800; color: #FFF;
          background: #8F765B; padding: 6px 12px; border-radius: 6px;
          margin: 0 0 10px;
        }
        .pr-kv {
          display: flex; gap: 12px; padding: 4px 0;
          font-size: 12.5px; align-items: baseline;
        }
        .pr-kv-label {
          min-width: 130px; font-weight: 700; color: #6B4F1E;
          font-size: 11.5px; letter-spacing: 0.02em;
        }
        .pr-kv-value { color: #1B1810; font-weight: 600; white-space: pre-wrap; }
        .pr-list { font-size: 12.5px; color: #1B1810; margin: 4px 0; font-weight: 600; }
        .pr-langs { list-style: disc; padding-inline-start: 20px; margin: 4px 0; font-size: 12.5px; }

        @media print {
          @page { margin: 14mm 12mm; }
          /* Hide the admin chrome â€” only the printable page shows. */
          body * { visibility: hidden; }
          .pr-page, .pr-page * { visibility: visible; }
          .pr-page { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none; max-width: 100%; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pr-section">
      <h2 className="pr-section-title">{title}</h2>
      {children}
    </section>
  );
}
function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="pr-kv">
      {label && <span className="pr-kv-label">{label}</span>}
      <span className="pr-kv-value">{value}</span>
    </div>
  );
}

