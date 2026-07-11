"use client";
export const dynamic = "force-dynamic";

import { Component, type ReactNode, use, useEffect, useState } from "react";
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
    print: "تنزيل PDF",
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
    assignGroups: "مجموعات المعلمين (اختياري)",
    assignGroupsHint: "يمكنك إضافة المعلم إلى مجموعة أو أكثر الآن، أو تنظيمه لاحقاً من صفحة مجموعات المعلمين.",
    noTeacherGroups: "لا توجد مجموعات معلمين بعد.",
  },
  sq: {
    back: "← Kthehu te lista",
    print: "Shkarko PDF",
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
    assignGroups: "Grupet e mësuesve (opsionale)",
    assignGroupsHint: "Mund ta shtosh mësuesin në një ose më shumë grupe tani, ose ta organizosh më vonë.",
    noTeacherGroups: "Nuk ka grupe mësuesish ende.",
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
  onboarding_status: "PENDING_APPLICATION" | "UNDER_REVIEW" | "WAITING_LIST" | "ACTIVE" | "REJECTED";
  profile: { full_name: string; email: string | null };
  application: App | null;
};
type GroupOption = { id: string; name: string; description: string | null; _count: { members: number } };

// Tiny error boundary so a render-time crash in any sub-section surfaces
// as a readable message instead of an empty page. Logs the error to the
// console so we can grab the stack from the user's DevTools.
class DetailBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error, info: { componentStack?: string }) {
    console.error("[application detail render]", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 40, maxWidth: 720, margin: "0 auto", fontFamily: "'Cairo',sans-serif" }}>
          <div style={{ background: "rgba(139,26,26,0.06)", border: "1.5px solid rgba(139,26,26,0.32)", borderRadius: 12, padding: 18, color: "#5A1818" }}>
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
              تعذر عرض هذا الطلب · This application could not be rendered
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

export default function ApplicationDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <DetailBoundary>
      <ApplicationDetailPageInner {...props} />
    </DetailBoundary>
  );
}

function ApplicationDetailPageInner({
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
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  // "notfound" = server said 404 (real). "error" = 5xx/network — retryable.
  const [loadFail, setLoadFail] = useState<"" | "notfound" | "error">("");
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadFail("");
      // One automatic retry on 5xx/network — a stale serverless DB socket
      // recovers on the second attempt.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await fetch(`/api/school-admin/applications/${id}`, { cache: "no-store" });
          if (r.status === 404) {
            if (!cancelled) { setLoadFail("notfound"); setLoading(false); }
            return;
          }
          if (!r.ok) throw new Error(`status ${r.status}`);
          const d = await r.json();
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
          if (!cancelled) {
            setTeacher(t ?? null);
            if (!t) setLoadFail("notfound");
            setLoading(false);
          }
          return;
        } catch {
          if (attempt === 0) await new Promise((res) => setTimeout(res, 700));
        }
      }
      if (!cancelled) { setLoadFail("error"); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id, retryTick]);

  useEffect(() => {
    fetch("/api/school-admin/teacher-groups", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setGroupOptions(Array.isArray(d?.groups) ? d.groups : []))
      .catch(() => setGroupOptions([]));
  }, []);

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  }

  async function decide(action: "approve" | "reject" | "waitlist") {
    const confirmMsg = action === "approve"
      ? T.confirmApprove
      : action === "reject"
        ? T.confirmReject
        : (L === "ar" ? "هل تريد وضع هذا الطلب في قائمة الانتظار؟" : "Ta vendosim këtë aplikim në listë pritjeje?");
    if (!window.confirm(confirmMsg)) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch(`/api/school-admin/applications/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: notes || undefined,
          group_ids: action === "approve" ? selectedGroupIds : undefined,
        }),
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
  // Transient server/network failure — show a retry, never a dead page.
  if (loadFail === "error") {
    return (
      <div dir={dir} style={{ padding: 60, textAlign: "center", fontFamily: "'Cairo',sans-serif" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#6B1E2D", marginBottom: 16 }}>
          {L === "ar" ? "تعذر تحميل الطلب — مشكلة مؤقتة في الاتصال." : "Aplikimi nuk u ngarkua — problem i përkohshëm."}
        </div>
        <button
          onClick={() => setRetryTick((n) => n + 1)}
          style={{
            background: "linear-gradient(180deg,#5B1526,#32101A)", color: "#B8A082",
            border: "none", padding: "10px 26px", borderRadius: 11,
            fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer",
          }}
        >
          {L === "ar" ? "إعادة المحاولة" : "Provo përsëri"}
        </button>
      </div>
    );
  }
  if (loadFail === "notfound" || !teacher || !teacher.application) {
    return (
      <div dir={dir} style={{ padding: 40, textAlign: "center", color: "#6B1E2D", fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}>
        {L === "ar" ? "هذا الطلب غير موجود." : "Ky aplikim nuk ekziston."}
      </div>
    );
  }
  const a = teacher.application;

  function fmtDate(s: string | null | undefined) {
    if (!s) return T.none;
    try { return new Date(s).toLocaleString(L === "ar" ? "ar-u-nu-latn" : "sq"); }
    catch { return s; }
  }
  const statusLabel =
    teacher.onboarding_status === "ACTIVE" ? T.active :
    teacher.onboarding_status === "WAITING_LIST" ? (L === "ar" ? "قائمة الانتظار" : "Në pritje") :
    teacher.onboarding_status === "REJECTED" ? T.rejected : T.underReview;

  return (
    <div className="teacher-application-detail-page" dir={dir} data-testid="teacher-application-detail">
      <div className="teacher-application-detail-bar">
        <Link href="/school-admin/applications" className="teacher-application-detail-back">{T.back}</Link>
        <div className="teacher-application-detail-bar-spacer" />
        <a
          className="teacher-application-detail-print-btn"
          href={`/school-admin/applications/${id}/print`}
          target="_blank"
          rel="noopener noreferrer"
        >
          🖨 {T.print}
        </a>
      </div>

      <header className="teacher-application-detail-head">
        <div>
          <h1 className="teacher-application-detail-name">{a.full_name}</h1>
          <p className="teacher-application-detail-meta">{a.email} · {a.phone}</p>
        </div>
        <span className={`teacher-application-detail-status st-${teacher.onboarding_status}`}>{statusLabel}</span>
      </header>

      <Section title={T.sectionPersonal}>
        <Grid>
          <Item label={L === "ar" ? "العمر" : "Mosha"} value={String(a.age)} />
          <Item label={L === "ar" ? "الدولة" : "Shteti"} value={a.country} />
          <Item label={L === "ar" ? "المدينة" : "Qyteti"} value={a.city} />
          <Item label={L === "ar" ? "الجنس" : "Gjinia"} value={GENDER_L[a.gender as keyof typeof GENDER_L]?.[L] ?? T.none} />
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
          <ul className="teacher-application-detail-langs">
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

        {(
          <div className="teacher-application-detail-decision">
            <div className="teacher-application-detail-group-pick">
              <div className="teacher-application-detail-group-pick-head">
                <span className="teacher-application-detail-notes-label">{T.assignGroups}</span>
                <p>{T.assignGroupsHint}</p>
              </div>
              {groupOptions.length === 0 ? (
                <div className="teacher-application-detail-group-empty">{T.noTeacherGroups}</div>
              ) : (
                <div className="teacher-application-detail-group-options">
                  {groupOptions.map((group) => {
                    const checked = selectedGroupIds.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        type="button"
                        className={`teacher-application-detail-group-option${checked ? " selected" : ""}`}
                        onClick={() => toggleGroup(group.id)}
                        disabled={viewOnly || saving}
                      >
                        <span className="teacher-application-detail-group-check">{checked ? "✓" : "+"}</span>
                        <span className="teacher-application-detail-group-info">
                          <strong>{group.name}</strong>
                          <small>{group._count.members} {L === "ar" ? "أعضاء" : "anëtarë"}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <label className="teacher-application-detail-notes-label">{T.notes}</label>
            <textarea
              className="teacher-application-detail-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {error && <div className="teacher-application-detail-err">{error}</div>}
            {!viewOnly && (
              <div className="teacher-application-detail-actions">
                <button className="teacher-application-detail-btn approve" onClick={() => decide("approve")} disabled={saving}>
                  ✓ {saving ? T.saving : T.approve}
                </button>
                <button className="teacher-application-detail-btn waitlist" onClick={() => decide("waitlist")} disabled={saving}>
                  {saving ? T.saving : (L === "ar" ? "قائمة الانتظار" : "Në pritje")}
                </button>
                <button className="teacher-application-detail-btn reject" onClick={() => decide("reject")} disabled={saving}>
                  ✕ {saving ? T.saving : T.reject}
                </button>
              </div>
            )}
          </div>
        )}
      </Section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .teacher-application-detail-page { font-family: 'Cairo', sans-serif; max-width: 920px; margin: 0 auto; }
        .teacher-application-detail-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
        .teacher-application-detail-back { text-decoration: none; color: #6B1E2D; font-weight: 800; font-size: 13.5px; }
        .teacher-application-detail-back:hover { color: #B8A082; }
        .teacher-application-detail-bar-spacer { flex: 1; }
        .teacher-application-detail-print-btn {
          padding: 8px 16px; background: #FFFBF5; border: 1.5px solid #B8A082;
          color: #6B1E2D; border-radius: 10px; text-decoration: none;
          font-size: 13px; font-weight: 800;
        }
        .teacher-application-detail-print-btn:hover { background: #B8A082; color: #FFF8E2; }

        .teacher-application-detail-head {
          display: flex; align-items: center; gap: 14px;
          background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px;
          padding: 20px; margin-bottom: 18px;
        }
        .teacher-application-detail-head > div { flex: 1; min-width: 0; }
        .teacher-application-detail-name { font-size: 22px; font-weight: 900; color: #32101A; margin: 0 0 4px; }
        .teacher-application-detail-meta { font-size: 13px; color: #655B53; margin: 0; }
        .teacher-application-detail-status {
          padding: 5px 14px; border-radius: 99px; font-size: 12px; font-weight: 800;
          letter-spacing: 0.04em; text-transform: uppercase; flex-shrink: 0;
        }
        .teacher-application-detail-status.st-UNDER_REVIEW { background: rgba(194,160,89,0.16); color: #6B1E2D; }
        .teacher-application-detail-status.st-WAITING_LIST  { background: rgba(184,160,130,0.18); color: #4A0E1C; }
        .teacher-application-detail-status.st-ACTIVE       { background: rgba(45,138,74,0.12); color: #1B5E20; }
        .teacher-application-detail-status.st-REJECTED     { background: rgba(139,26,26,0.10); color: #6B1E2D; }

        .teacher-application-detail-section {
          background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07);
          border-radius: 14px; padding: 18px; margin-bottom: 14px;
        }
        .teacher-application-detail-section-title {
          font-size: 14px; font-weight: 900; color: #6B1E2D; margin: 0 0 12px;
          padding-bottom: 8px; border-bottom: 1px solid rgba(194,160,89,0.18);
        }
        .teacher-application-detail-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        .teacher-application-detail-item { margin-bottom: 10px; }
        .teacher-application-detail-item-label { display: block; font-size: 11px; font-weight: 800; color: #796A62; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 3px; }
        .teacher-application-detail-item-value { font-size: 13.5px; color: #4A0E1C; font-weight: 600; line-height: 1.7; white-space: pre-wrap; }

        .teacher-application-detail-langs { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; color: #4A0E1C; }

        .teacher-application-detail-decision { margin-top: 14px; padding-top: 14px; border-top: 1px dashed rgba(194,160,89,0.32); }
        .teacher-application-detail-group-pick { margin-bottom: 14px; }
        .teacher-application-detail-group-pick-head p { margin: -2px 0 10px; color: #796A62; font-size: 12.5px; line-height: 1.7; }
        .teacher-application-detail-group-empty {
          padding: 12px; border-radius: 10px; border: 1px dashed rgba(194,160,89,0.32);
          color: #796A62; font-size: 12.5px; font-weight: 800; background: rgba(194,160,89,0.04);
        }
        .teacher-application-detail-group-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px; margin-bottom: 8px; }
        .teacher-application-detail-group-option {
          display: flex; align-items: center; gap: 10px; text-align: start;
          padding: 10px 12px; border-radius: 11px; border: 1.5px solid rgba(194,160,89,0.28);
          background: #FFF; cursor: pointer; font-family: inherit; transition: border-color .15s, background .15s;
        }
        .teacher-application-detail-group-option:hover:not(:disabled), .teacher-application-detail-group-option.selected {
          border-color: #B8A082; background: linear-gradient(165deg,#FFFBF5,#F7F3EB);
        }
        .teacher-application-detail-group-option:disabled { opacity: 0.6; cursor: not-allowed; }
        .teacher-application-detail-group-check {
          width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: rgba(194,160,89,0.14); color: #8F765B; font-weight: 900; flex-shrink: 0;
        }
        .teacher-application-detail-group-option.selected .teacher-application-detail-group-check { background: #B8A082; color: #4A0E1C; }
        .teacher-application-detail-group-info { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .teacher-application-detail-group-info strong { color: #32101A; font-size: 13px; line-height: 1.3; overflow-wrap: anywhere; }
        .teacher-application-detail-group-info small { color: #796A62; font-size: 11.5px; font-weight: 800; }
        .teacher-application-detail-notes-label { display: block; font-size: 12.5px; font-weight: 800; color: #6B1E2D; margin-bottom: 6px; }
        .teacher-application-detail-notes {
          width: 100%; padding: 10px 12px; font-family: inherit; font-size: 13.5px;
          border: 1.5px solid rgba(194,160,89,0.32); border-radius: 11px;
          background: #FFFCEF; outline: none; resize: vertical;
        }
        .teacher-application-detail-notes:focus { border-color: #B8A082; }
        .teacher-application-detail-err { color: #6B1E2D; font-size: 13px; font-weight: 700; margin-top: 8px; }
        .teacher-application-detail-actions { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .teacher-application-detail-btn {
          padding: 11px 22px; border-radius: 11px; font-weight: 900; font-size: 14px;
          border: none; cursor: pointer; font-family: inherit;
        }
        .teacher-application-detail-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .teacher-application-detail-btn.approve {
          background: linear-gradient(180deg, #4FA465, #1B5E20); color: #F0F8E8;
          box-shadow: 0 4px 14px rgba(45,138,74,0.32);
        }
        .teacher-application-detail-btn.reject {
          background: linear-gradient(180deg, #C24F4F, #6B1E2D); color: #FFF0E2;
          box-shadow: 0 4px 14px rgba(163,51,51,0.32);
        }
        .teacher-application-detail-btn.waitlist {
          background: #4A0E1C; color: #D9C9B0;
          box-shadow: 0 4px 14px rgba(74,14,28,0.22);
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="teacher-application-detail-section">
      {title && <h2 className="teacher-application-detail-section-title">{title}</h2>}
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="teacher-application-detail-grid">{children}</div>;
}
function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="teacher-application-detail-item">
      {label && <span className="teacher-application-detail-item-label">{label}</span>}
      <div className="teacher-application-detail-item-value">{value}</div>
    </div>
  );
}
