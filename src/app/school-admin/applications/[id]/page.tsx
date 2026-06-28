"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useViewOnly } from "@/lib/view-only-context";
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
import MandalaLoader from "@/components/MandalaLoader";

const UI = {
  ar: {
    back: "← العودة للقائمة",
    print: "تصدير PDF",
    approve: "موافقة",
    reject: "رفض",
    underReview: "قيد المراجعة",
    active: "مفعّل",
    rejected: "مرفوض",
    confirmApprove: "هل أنت متأكد من الموافقة على هذا الطلب؟",
    confirmReject: "هل أنت متأكد من رفض هذا الطلب؟",
    notes: "ملاحظات (اختيارية، تظهر للمعلم)",
    saving: "جاري الحفظ…",
    saveError: "تعذر حفظ القرار",
    sectionPersonal: "البيانات الشخصية",
    sectionNomination: "جهة الترشيح",
    sectionRole: "الدور الحالي",
    sectionQual: "المؤهل العلمي",
    sectionExp: "مجالات الخبرة وسنواتها",
    sectionGroups: "الفئات",
    sectionContrib: "المساهمات",
    sectionAch: "الإنجازات",
    sectionLang: "اللغات",
    sectionAtt: "المرفقات",
    sectionRev: "المراجعة",
    none: "—",
    decision: "قرار المراجعة",
    submittedAt: "تاريخ التقديم",
    reviewedAt: "تاريخ المراجعة",
    submitting: "جاري الإرسال…",
  },
  sq: {
    back: "← Kthehu te lista",
    print: "Eksporto PDF",
    approve: "Mirato",
    reject: "Refuzo",
    underReview: "Në shqyrtim",
    active: "Aktiv",
    rejected: "I refuzuar",
    confirmApprove: "Je i sigurt që do ta miratosh këtë aplikim?",
    confirmReject: "Je i sigurt që do ta refuzosh këtë aplikim?",
    notes: "Shënime (opsionale, i shfaqen mësuesit)",
    saving: "Po ruhet…",
    saveError: "Vendimi nuk u ruajt",
    sectionPersonal: "Të dhënat personale",
    sectionNomination: "Pala rekomanduese",
    sectionRole: "Roli aktual",
    sectionQual: "Kualifikimi",
    sectionExp: "Fushat dhe vitet e përvojës",
    sectionGroups: "Grupet",
    sectionContrib: "Kontributet",
    sectionAch: "Arritjet",
    sectionLang: "Gjuhët",
    sectionAtt: "Bashkëngjitjet",
    sectionRev: "Shqyrtimi",
    none: "—",
    decision: "Vendimi i shqyrtimit",
    submittedAt: "Data e dërgimit",
    reviewedAt: "Data e shqyrtimit",
    submitting: "Po dërgohet…",
  },
} as const;

type App = {
  id: string;
  full_name: string;
  age: number;
  country: string;
  city: string;
  phone: string;
  email: string;
  gender: "MALE" | "FEMALE";
  nominating_entity: string | null;
  nominator_name: string | null;
  nominator_role: string | null;
  current_role: string;
  current_role_other: string | null;
  qualification: string;
  specialization: string;
  graduation_institution: string;
  experience_areas: string[];
  experience_areas_other: string | null;
  years_of_experience: string;
  target_groups: string[];
  target_groups_other: string | null;
  contributions: string[];
  has_achievements: boolean;
  achievements_scope: string | null;
  languages: AppLanguageEntry[];
  languages_other: string | null;
  attachments: string[];
  notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
};

type Teacher = {
  id: string;
  onboarding_status: "PENDING_APPLICATION" | "UNDER_REVIEW" | "ACTIVE" | "REJECTED";
  profile: { full_name: string; email: string | null };
  application: App | null;
};

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { lang } = useLang();
  const viewOnly = useViewOnly();
  const L = pickLang(lang);
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/school-admin/applications/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        // Defensive: JSON columns can deserialize as null. Coerce every
        // array-shaped field so the render never throws on `.length`/`.map`.
        const t = d?.teacher;
        if (t?.application) {
          const a = t.application;
          a.experience_areas = Array.isArray(a.experience_areas) ? a.experience_areas : [];
          a.target_groups    = Array.isArray(a.target_groups)    ? a.target_groups    : [];
          a.contributions    = Array.isArray(a.contributions)    ? a.contributions    : [];
          a.languages        = Array.isArray(a.languages)        ? a.languages        : [];
          a.attachments      = Array.isArray(a.attachments)      ? a.attachments      : [];
        }
        setTeacher(t ?? null);
      })
      .catch(() => setTeacher(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function decide(action: "approve" | "reject") {
    const confirmMsg = action === "approve" ? T.confirmApprove : T.confirmReject;
    if (!window.confirm(confirmMsg)) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch(`/api/school-admin/applications/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: notes || undefined }),
      });
      if (!r.ok) {
        setError(T.saveError);
        setSaving(false);
        return;
      }
      router.push("/school-admin/applications");
    } catch {
      setError(T.saveError);
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}><MandalaLoader /></div>;
  }
  if (!teacher || !teacher.application) {
    return <div style={{ padding: 40, textAlign: "center", color: "#7A1E1E", fontWeight: 700 }}>404</div>;
  }
  const a = teacher.application;

  function fmtDate(s: string | null | undefined) {
    if (!s) return T.none;
    try { return new Date(s).toLocaleString(L === "ar" ? "ar" : "sq"); }
    catch { return s; }
  }
  const isDecided = teacher.onboarding_status === "ACTIVE" || teacher.onboarding_status === "REJECTED";
  const statusLabel =
    teacher.onboarding_status === "ACTIVE" ? T.active :
    teacher.onboarding_status === "REJECTED" ? T.rejected : T.underReview;

  return (
    <div className="ad-page" dir={dir}>
      <div className="ad-bar">
        <Link href="/school-admin/applications" className="ad-back">{T.back}</Link>
        <div className="ad-bar-spacer" />
        <a
          className="ad-print-btn"
          href={`/school-admin/applications/${id}/print`}
          target="_blank"
          rel="noopener noreferrer"
        >
          🖨 {T.print}
        </a>
      </div>

      <header className="ad-head">
        <div>
          <h1 className="ad-name">{a.full_name}</h1>
          <p className="ad-meta">{a.email} · {a.phone}</p>
        </div>
        <span className={`ad-status st-${teacher.onboarding_status}`}>{statusLabel}</span>
      </header>

      <Section title={T.sectionPersonal}>
        <Grid>
          <Item label={L === "ar" ? "العمر" : "Mosha"} value={String(a.age)} />
          <Item label={L === "ar" ? "الدولة" : "Shteti"} value={a.country} />
          <Item label={L === "ar" ? "المدينة" : "Qyteti"} value={a.city} />
          <Item label={L === "ar" ? "الجنس" : "Gjinia"} value={GENDER_L[a.gender][L]} />
        </Grid>
      </Section>

      {/* Nomination section retained only if a legacy application carried
          one of those fields; new applications never populate them. */}
      {(a.nominating_entity || a.nominator_name || a.nominator_role) && (
        <Section title={T.sectionNomination}>
          <Grid>
            <Item label={L === "ar" ? "الجهة" : "Institucioni"} value={a.nominating_entity || T.none} />
            <Item label={L === "ar" ? "الاسم" : "Emri"} value={a.nominator_name || T.none} />
            <Item label={L === "ar" ? "الصفة" : "Roli"} value={a.nominator_role || T.none} />
          </Grid>
        </Section>
      )}

      <Section title={T.sectionRole}>
        <Item
          label=""
          value={
            (CURRENT_ROLE_L[a.current_role as keyof typeof CURRENT_ROLE_L]?.[L] ?? a.current_role) +
            (a.current_role_other ? ` — ${a.current_role_other}` : "")
          }
        />
      </Section>

      <Section title={T.sectionQual}>
        <Grid>
          <Item label={L === "ar" ? "المستوى" : "Niveli"} value={QUALIFICATION_L[a.qualification as keyof typeof QUALIFICATION_L]?.[L] ?? a.qualification} />
          <Item label={L === "ar" ? "التخصص" : "Specializimi"} value={a.specialization} />
          <Item label={L === "ar" ? "جهة التخرج" : "Institucioni"} value={a.graduation_institution} />
        </Grid>
      </Section>

      <Section title={T.sectionExp}>
        <Item label={L === "ar" ? "المجالات" : "Fushat"} value={
          a.experience_areas.map((c) => EXPERIENCE_AREA_L[c]?.[L] ?? c).join("، ") || T.none
        } />
        {a.experience_areas_other && (
          <Item label={L === "ar" ? "أخرى" : "Tjetër"} value={a.experience_areas_other} />
        )}
        <Item label={L === "ar" ? "سنوات الخبرة" : "Vitet e përvojës"} value={EXPERIENCE_RANGE_L[a.years_of_experience as keyof typeof EXPERIENCE_RANGE_L]?.[L] ?? a.years_of_experience} />
      </Section>

      <Section title={T.sectionGroups}>
        <Item label="" value={
          a.target_groups.map((c) => TARGET_GROUP_L[c]?.[L] ?? c).join("، ") || T.none
        } />
        {a.target_groups_other && (
          <Item label={L === "ar" ? "أخرى" : "Tjetër"} value={a.target_groups_other} />
        )}
      </Section>

      <Section title={T.sectionContrib}>
        <Item label="" value={
          a.contributions.map((c) => CONTRIBUTION_L[c]?.[L] ?? c).join("، ") || T.none
        } />
      </Section>

      <Section title={T.sectionAch}>
        <Item label={L === "ar" ? "حصل على" : "Ka pasur"} value={a.has_achievements ? (L === "ar" ? "نعم" : "Po") : (L === "ar" ? "لا" : "Jo")} />
        {a.has_achievements && a.achievements_scope && (
          <Item label={L === "ar" ? "النطاق" : "Shtrirja"} value={ACHIEVEMENT_SCOPE_L[a.achievements_scope as keyof typeof ACHIEVEMENT_SCOPE_L]?.[L] ?? a.achievements_scope} />
        )}
      </Section>

      <Section title={T.sectionLang}>
        {a.languages.length === 0 ? (
          <Item label="" value={T.none} />
        ) : (
          <ul className="ad-langs">
            {a.languages.map((l) => (
              <li key={l.lang}>
                <strong>{LANGUAGE_L[l.lang]?.[L] ?? l.lang}</strong>
                {" — "}
                {LANG_LEVEL_L[l.level]?.[L] ?? l.level}
              </li>
            ))}
          </ul>
        )}
        {a.languages_other && (
          <Item label={L === "ar" ? "لغة أخرى" : "Gjuhë tjetër"} value={a.languages_other} />
        )}
      </Section>

      {/* "About the candidate" — replaces the old attachments checklist.
          Legacy applications might still have attachments[]; show them only
          when present. The free-form notes field is the headline now. */}
      <Section title={L === "ar" ? "نبذة عن المرشّح" : "Rreth kandidatit"}>
        {a.notes && (
          <Item label={L === "ar" ? "ملاحظات" : "Shënime"} value={a.notes} />
        )}
        {a.attachments && a.attachments.length > 0 && (
          <Item
            label={L === "ar" ? "مرفقات (قديم)" : "Bashkëngjitje (të vjetra)"}
            value={a.attachments.map((c) => ATTACHMENT_L[c]?.[L] ?? c).join("، ")}
          />
        )}
        {!a.notes && (!a.attachments || a.attachments.length === 0) && (
          <Item label="" value={T.none} />
        )}
      </Section>

      <Section title={T.sectionRev}>
        <Grid>
          <Item label={T.submittedAt} value={fmtDate(a.submitted_at)} />
          <Item label={T.reviewedAt} value={fmtDate(a.reviewed_at)} />
        </Grid>
        {a.reviewer_notes && (
          <Item label={L === "ar" ? "ملاحظات سابقة" : "Shënime të mëparshme"} value={a.reviewer_notes} />
        )}

        {!isDecided && (
          <div className="ad-decision">
            <label className="ad-notes-label">{T.notes}</label>
            <textarea
              className="ad-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {error && <div className="ad-err">{error}</div>}
            {!viewOnly && (
              <div className="ad-actions">
                <button className="ad-btn approve" onClick={() => decide("approve")} disabled={saving}>
                  ✓ {saving ? T.saving : T.approve}
                </button>
                <button className="ad-btn reject" onClick={() => decide("reject")} disabled={saving}>
                  ✕ {saving ? T.saving : T.reject}
                </button>
              </div>
            )}
          </div>
        )}
      </Section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .ad-page { font-family: 'Cairo', sans-serif; max-width: 920px; margin: 0 auto; }
        .ad-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
        .ad-back { text-decoration: none; color: #6B4F1E; font-weight: 800; font-size: 13.5px; }
        .ad-back:hover { color: #B89B5E; }
        .ad-bar-spacer { flex: 1; }
        .ad-print-btn {
          padding: 8px 16px; background: #FFFDF8; border: 1.5px solid #B89B5E;
          color: #6B4F1E; border-radius: 10px; text-decoration: none;
          font-size: 13px; font-weight: 800;
        }
        .ad-print-btn:hover { background: #B89B5E; color: #FFF8E2; }

        .ad-head {
          display: flex; align-items: center; gap: 14px;
          background: #FFFDF8; border: 1px solid rgba(8,11,12,0.07); border-radius: 14px;
          padding: 20px; margin-bottom: 18px;
        }
        .ad-head > div { flex: 1; min-width: 0; }
        .ad-name { font-size: 22px; font-weight: 900; color: #1B1810; margin: 0 0 4px; }
        .ad-meta { font-size: 13px; color: #5E5A52; margin: 0; }
        .ad-status {
          padding: 5px 14px; border-radius: 99px; font-size: 12px; font-weight: 800;
          letter-spacing: 0.04em; text-transform: uppercase; flex-shrink: 0;
        }
        .ad-status.st-UNDER_REVIEW { background: rgba(194,160,89,0.16); color: #6B4F1E; }
        .ad-status.st-ACTIVE       { background: rgba(45,138,74,0.12); color: #1E5C2E; }
        .ad-status.st-REJECTED     { background: rgba(139,26,26,0.10); color: #7A1E1E; }

        .ad-section {
          background: #FFFDF8; border: 1px solid rgba(8,11,12,0.07);
          border-radius: 14px; padding: 18px; margin-bottom: 14px;
        }
        .ad-section-title {
          font-size: 14px; font-weight: 900; color: #6B4F1E; margin: 0 0 12px;
          padding-bottom: 8px; border-bottom: 1px solid rgba(194,160,89,0.18);
        }
        .ad-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        .ad-item { margin-bottom: 10px; }
        .ad-item-label { display: block; font-size: 11px; font-weight: 800; color: #8A7B60; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 3px; }
        .ad-item-value { font-size: 13.5px; color: #2E2210; font-weight: 600; line-height: 1.7; white-space: pre-wrap; }

        .ad-langs { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; color: #2E2210; }

        .ad-decision { margin-top: 14px; padding-top: 14px; border-top: 1px dashed rgba(194,160,89,0.32); }
        .ad-notes-label { display: block; font-size: 12.5px; font-weight: 800; color: #6B4F1E; margin-bottom: 6px; }
        .ad-notes {
          width: 100%; padding: 10px 12px; font-family: inherit; font-size: 13.5px;
          border: 1.5px solid rgba(194,160,89,0.32); border-radius: 11px;
          background: #FFFCEF; outline: none; resize: vertical;
        }
        .ad-notes:focus { border-color: #B89B5E; }
        .ad-err { color: #7A1E1E; font-size: 13px; font-weight: 700; margin-top: 8px; }
        .ad-actions { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .ad-btn {
          padding: 11px 22px; border-radius: 11px; font-weight: 900; font-size: 14px;
          border: none; cursor: pointer; font-family: inherit;
        }
        .ad-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .ad-btn.approve {
          background: linear-gradient(180deg, #4FA465, #2D8A4A); color: #F0F8E8;
          box-shadow: 0 4px 14px rgba(45,138,74,0.32);
        }
        .ad-btn.reject {
          background: linear-gradient(180deg, #C24F4F, #A33333); color: #FFF0E2;
          box-shadow: 0 4px 14px rgba(163,51,51,0.32);
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ad-section">
      {title && <h2 className="ad-section-title">{title}</h2>}
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="ad-grid">{children}</div>;
}
function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="ad-item">
      {label && <span className="ad-item-label">{label}</span>}
      <div className="ad-item-value">{value}</div>
    </div>
  );
}
