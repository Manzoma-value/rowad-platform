"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import { invalidateCache } from "@/lib/api-cache";
import MandalaLoader from "@/components/MandalaLoader";
import {
  APP_UI,
  pickLang,
  APP_CURRENT_ROLES,
  APP_QUALIFICATIONS,
  APP_EXPERIENCE_RANGES,
  APP_ACHIEVEMENT_SCOPES,
  APP_EXPERIENCE_AREAS,
  APP_TARGET_GROUPS,
  APP_CONTRIBUTIONS,
  APP_LANGUAGES,
  APP_LANG_LEVELS,
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
  type AppLanguage,
  type LangLevel,
} from "@/lib/teacher-application";

type Form = {
  age: string;
  country: string;
  city: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "";
  current_role: string;
  current_role_other: string;
  qualification: string;
  specialization: string;
  graduation_institution: string;
  experience_areas: string[];
  experience_areas_other: string;
  years_of_experience: string;
  target_groups: string[];
  target_groups_other: string;
  contributions: string[];
  has_achievements: boolean;
  achievements_scope: string;
  languages: { lang: AppLanguage; level: LangLevel }[];
  languages_other: string;
  notes: string;
};

const EMPTY: Form = {
  age: "", country: "", city: "", phone: "",
  gender: "",
  current_role: "", current_role_other: "",
  qualification: "", specialization: "", graduation_institution: "",
  experience_areas: [], experience_areas_other: "",
  years_of_experience: "",
  target_groups: [], target_groups_other: "",
  contributions: [],
  has_achievements: false, achievements_scope: "",
  languages: [], languages_other: "",
  notes: "",
};

const DRAFT_KEY = "teacher-application-draft-v1";
const TOTAL_STEPS = 5;
const FIELD_STEP: Record<string, number> = {
  age: 0, country: 0, city: 0, phone: 0, gender: 0,
  current_role: 1, qualification: 1, specialization: 1, graduation_institution: 1,
  years_of_experience: 2,
  languages_other: 4,
};

function initialForm(): Form {
  if (typeof window === "undefined") return EMPTY;
  try {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    return saved ? { ...EMPTY, ...(JSON.parse(saved) as Partial<Form>) } : EMPTY;
  } catch {
    window.localStorage.removeItem(DRAFT_KEY);
    return EMPTY;
  }
}

function hasDraftValues(form: Form) {
  return Object.values(form).some((value) => Array.isArray(value) ? value.length > 0 : typeof value === "boolean" ? value : Boolean(value));
}

export default function TeacherApplicationPage() {
  const { lang } = useLang();
  const router = useRouter();
  const L = pickLang(lang);
  const T = APP_UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form>(initialForm);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "local">("idle");

  useEffect(() => {
    if (loading || submitting) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      // Private browsing or a full storage quota should not block the form.
    }
    if (!hasDraftValues(form)) return;
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      void fetch("/api/teacher/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((response) => {
        setSaveState(response.ok ? "saved" : "local");
      }).catch(() => setSaveState("local"));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [form, loading, submitting]);

  useEffect(() => {
    fetch("/api/teacher/application", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.draft || typeof data.draft !== "object") return;
        setForm((current) => hasDraftValues(current) ? current : { ...EMPTY, ...(data.draft as Partial<Form>) });
      })
      .catch(() => {});
  }, []);

  // Route guard: if the teacher already submitted or is past PENDING_APPLICATION,
  // bounce them to the appropriate screen.
  useEffect(() => {
    fetch("/api/teacher", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const status: string = d?.onboarding_status;
        if (status === "UNDER_REVIEW") { router.replace("/teacher/under-review"); return; }
        if (status === "REJECTED")     { router.replace("/teacher/rejected"); return; }
        if (status === "WAITING_LIST") { router.replace("/teacher/under-review"); return; }
        if (status === "ACTIVE")       { router.replace("/teacher"); return; }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const set = useCallback(<K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setInvalidFields((s) => {
      if (!s.has(k as string)) return s;
      const n = new Set(s); n.delete(k as string); return n;
    });
  }, []);

  function toggle(field: "experience_areas" | "target_groups" | "contributions", code: string) {
    setForm((f) => {
      const cur = f[field];
      const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
      return { ...f, [field]: next };
    });
  }

  function setLangEntry(langCode: AppLanguage, level: LangLevel | null) {
    setForm((f) => {
      const without = f.languages.filter((l) => l.lang !== langCode);
      if (!level) return { ...f, languages: without };
      return { ...f, languages: [...without, { lang: langCode, level }] };
    });
  }

  function getMissing(fields?: string[]) {
    const required: Record<string, unknown> = {
      age: form.age,
      country: form.country.trim(),
      city: form.city.trim(),
      phone: form.phone.trim(),
      gender: form.gender,
      current_role: form.current_role,
      qualification: form.qualification,
      specialization: form.specialization.trim(),
      graduation_institution: form.graduation_institution.trim(),
      years_of_experience: form.years_of_experience,
    };
    const missing = new Set<string>();
    for (const [key, value] of Object.entries(required)) {
      if (!value) missing.add(key);
    }
    const ageNum = Number(form.age);
    if (!ageNum || ageNum < 16 || ageNum > 120) missing.add("age");
    if (form.languages.some((entry) => entry.lang === "other") && !form.languages_other.trim()) {
      missing.add("languages_other");
    }
    return fields ? new Set([...missing].filter((field) => fields.includes(field))) : missing;
  }

  function focusFirstInvalid(missing: Set<string>) {
    const first = [...missing][0];
    if (!first) return;
    const targetStep = FIELD_STEP[first] ?? 0;
    setStep(targetStep);
    window.requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(`[data-field="${first}"]`);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
    });
  }

  function nextStep() {
    const fields = Object.entries(FIELD_STEP).filter(([, value]) => value === step).map(([key]) => key);
    const missing = getMissing(fields);
    if (missing.size > 0) {
      setInvalidFields((current) => new Set([...current, ...missing]));
      setError(T.incompleteTitle);
      focusFirstInvalid(missing);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setError("");
    const ageNum = Number(form.age);
    const missing = getMissing();
    if (missing.size > 0) {
      setInvalidFields(missing);
      setError(T.requiredFields);
      focusFirstInvalid(missing);
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/teacher/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          age: ageNum,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (d?.error === "missing_field" && typeof d.field === "string") {
          const serverMissing = new Set([d.field]);
          setInvalidFields(serverMissing);
          focusFirstInvalid(serverMissing);
        }
        setError(d?.error === "missing_field"
          ? `${T.requiredFields} (${d.field})`
          : T.serverError);
        setSubmitting(false);
        return;
      }
      // QR entrants are already ACTIVE and go directly to their workshop;
      // regular signups continue to the admin review screen.
      invalidateCache("/api/teacher");
      try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      const destination = d?.status === "ACTIVE"
        ? (d?.workshop_id ? `/teacher/workshops/${d.workshop_id}` : "/teacher")
        : "/teacher/under-review";
      window.location.replace(destination);
    } catch {
      setError(T.serverError);
      setSubmitting(false);
    }
  }

  const isInvalid = (f: string) => invalidFields.has(f);
  const stepTitles = L === "ar"
    ? ["البيانات الشخصية", "الدور والمؤهل", "الخبرة", "المساهمات", "المراجعة والإرسال"]
    : ["Të dhënat personale", "Roli dhe kualifikimi", "Përvoja", "Kontributet", "Rishikimi dhe dërgimi"];
  const fieldLabels: Record<string, string> = {
    age: T.age, country: T.country, city: T.city, phone: T.phone, gender: T.gender,
    current_role: T.currentRole, qualification: T.qualification, specialization: T.specialization,
    graduation_institution: T.graduationInstitution, years_of_experience: T.yearsOfExperience,
    languages_other: T.languagesOther,
  };

  if (loading) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <MandalaLoader />
      </div>
    );
  }

  return (
    <div className="ta-page" dir={dir}>
      <div className="ta-shell">
        <header className="ta-hero">
          <span className="ta-hero-badge">{L === "ar" ? "تقديم" : "Aplikim"}</span>
          <h1 className="ta-hero-title">{T.pageTitle}</h1>
          <p className="ta-hero-sub">{T.pageSub}</p>
          <div className="ta-save-state" role="status" aria-live="polite">
            {saveState === "saving" ? T.saving : saveState === "local" ? T.savedLocally : T.saved}
          </div>
        </header>

        <nav className="ta-progress" aria-label={L === "ar" ? "تقدم الطلب" : "Progresi i aplikimit"}>
          {stepTitles.map((title, index) => (
            <button key={title} type="button" className={index === step ? "active" : index < step ? "done" : ""} onClick={() => index < step && setStep(index)} aria-current={index === step ? "step" : undefined}>
              <span>{index + 1}</span><em>{title}</em>
            </button>
          ))}
        </nav>

        {error && (
          <div className="ta-error" role="alert" tabIndex={-1}>
            <strong>{error}</strong>
            {invalidFields.size > 0 && (
              <div className="ta-error-fields">
                {[...invalidFields].map((field) => (
                  <button type="button" key={field} onClick={() => focusFirstInvalid(new Set([field]))}>{fieldLabels[field] ?? field}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Personal */}
        {step === 0 && <>
        <Section title={T.sectionPersonal}>
          <Grid>
            <Field field="age" label={T.age} invalid={isInvalid("age")} errorText={T.fieldRequired}>
              <input type="number" min={16} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} className="ta-input" />
            </Field>
            <Field field="country" label={T.country} invalid={isInvalid("country")} errorText={T.fieldRequired}>
              <input value={form.country} onChange={(e) => set("country", e.target.value)} className="ta-input" />
            </Field>
            <Field field="city" label={T.city} invalid={isInvalid("city")} errorText={T.fieldRequired}>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} className="ta-input" />
            </Field>
            <Field field="phone" label={T.phone} invalid={isInvalid("phone")} errorText={T.fieldRequired}>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="ta-input" dir="ltr" />
            </Field>
          </Grid>
          <Field field="gender" label={T.gender} invalid={isInvalid("gender")} errorText={T.fieldRequired}>
            <RadioRow
              value={form.gender}
              onChange={(v) => set("gender", v as Form["gender"])}
              options={[
                { code: "MALE",   label: GENDER_L.MALE[L] },
                { code: "FEMALE", label: GENDER_L.FEMALE[L] },
              ]}
            />
          </Field>
        </Section>
        </>}

        {/* (Nomination section removed — wasn't carrying its weight.) */}

        {/* Current role */}
        {step === 1 && <>
        <Section title={T.sectionCurrentRole}>
          <Field field="current_role" label={T.currentRole} invalid={isInvalid("current_role")} errorText={T.fieldRequired}>
            <CheckboxGrid
              mode="single"
              value={form.current_role ? [form.current_role] : []}
              onToggle={(c) => set("current_role", c)}
              options={APP_CURRENT_ROLES.map((c) => ({ code: c, label: CURRENT_ROLE_L[c][L] }))}
            />
          </Field>
          {form.current_role === "OTHER" && (
            <Field label={T.currentRoleOther} optional>
              <input value={form.current_role_other} onChange={(e) => set("current_role_other", e.target.value)} className="ta-input" />
            </Field>
          )}
        </Section>

        {/* Qualification */}
        <Section title={T.sectionQualification}>
          <Field field="qualification" label={T.qualification} invalid={isInvalid("qualification")} errorText={T.fieldRequired}>
            <CheckboxGrid
              mode="single"
              value={form.qualification ? [form.qualification] : []}
              onToggle={(c) => set("qualification", c)}
              options={APP_QUALIFICATIONS.map((c) => ({ code: c, label: QUALIFICATION_L[c][L] }))}
            />
          </Field>
          <Grid>
            <Field field="specialization" label={T.specialization} invalid={isInvalid("specialization")} errorText={T.fieldRequired}>
              <input value={form.specialization} onChange={(e) => set("specialization", e.target.value)} className="ta-input" />
            </Field>
            <Field field="graduation_institution" label={T.graduationInstitution} invalid={isInvalid("graduation_institution")} errorText={T.fieldRequired}>
              <input value={form.graduation_institution} onChange={(e) => set("graduation_institution", e.target.value)} className="ta-input" />
            </Field>
          </Grid>
        </Section>
        </>}

        {/* Experience areas */}
        {step === 2 && <>
        <Section title={T.sectionExperienceAreas}>
          <p className="ta-hint">{T.experienceAreas}</p>
          <CheckboxGrid
            mode="multi"
            value={form.experience_areas}
            onToggle={(c) => toggle("experience_areas", c)}
            options={APP_EXPERIENCE_AREAS.map((c) => ({ code: c, label: EXPERIENCE_AREA_L[c][L] }))}
          />
          {form.experience_areas.includes("OTHER") && (
            <Field label={T.experienceAreasOther} optional>
              <input value={form.experience_areas_other} onChange={(e) => set("experience_areas_other", e.target.value)} className="ta-input" />
            </Field>
          )}
        </Section>

        {/* Years of experience */}
        <Section title={T.sectionYearsOfExperience}>
          <Field field="years_of_experience" label={T.yearsOfExperience} invalid={isInvalid("years_of_experience")} errorText={T.fieldRequired}>
            <CheckboxGrid
              mode="single"
              value={form.years_of_experience ? [form.years_of_experience] : []}
              onToggle={(c) => set("years_of_experience", c)}
              options={APP_EXPERIENCE_RANGES.map((c) => ({ code: c, label: EXPERIENCE_RANGE_L[c][L] }))}
            />
          </Field>
        </Section>
        </>}

        {/* Target groups */}
        {step === 3 && <>
        <Section title={T.sectionTargetGroups}>
          <p className="ta-hint">{T.targetGroups}</p>
          <CheckboxGrid
            mode="multi"
            value={form.target_groups}
            onToggle={(c) => toggle("target_groups", c)}
            options={APP_TARGET_GROUPS.map((c) => ({ code: c, label: TARGET_GROUP_L[c][L] }))}
          />
          {form.target_groups.includes("OTHER") && (
            <Field label={T.targetGroupsOther} optional>
              <input value={form.target_groups_other} onChange={(e) => set("target_groups_other", e.target.value)} className="ta-input" />
            </Field>
          )}
        </Section>

        <Section title={T.sectionContributions}>
          <p className="ta-hint">{T.contributions}</p>
          <CheckboxGrid
            mode="multi"
            value={form.contributions}
            onToggle={(c) => toggle("contributions", c)}
            options={APP_CONTRIBUTIONS.map((c) => ({ code: c, label: CONTRIBUTION_L[c][L] }))}
          />
        </Section>

        {/* Achievements */}
        <Section title={T.sectionAchievements}>
          <Field label={T.hasAchievements}>
            <RadioRow
              value={form.has_achievements ? "yes" : "no"}
              onChange={(v) => set("has_achievements", v === "yes")}
              options={[
                { code: "yes", label: T.yes },
                { code: "no",  label: T.no },
              ]}
            />
          </Field>
          {form.has_achievements && (
            <Field label={T.achievementsScope}>
              <CheckboxGrid
                mode="single"
                value={form.achievements_scope ? [form.achievements_scope] : []}
                onToggle={(c) => set("achievements_scope", c)}
                options={APP_ACHIEVEMENT_SCOPES.map((c) => ({ code: c, label: ACHIEVEMENT_SCOPE_L[c][L] }))}
              />
            </Field>
          )}
        </Section>
        </>}

        {/* Languages */}
        {step === 4 && <>
        <Section title={T.sectionLanguages}>
          <p className="ta-hint">{T.languages}</p>
          <div className="ta-lang-list">
            {APP_LANGUAGES.map((code) => {
              const entry = form.languages.find((l) => l.lang === code);
              const isOn = !!entry;
              return (
                <div key={code} className={`ta-lang-row${isOn ? " on" : ""}`}>
                  <button
                    type="button"
                    className="ta-lang-toggle"
                    onClick={() => setLangEntry(code, isOn ? null : "INTERMEDIATE")}
                  >
                    <span className="ta-lang-check">{isOn ? "✓" : ""}</span>
                    <span>{LANGUAGE_L[code][L]}</span>
                  </button>
                  {isOn && (
                    <div className="ta-lang-levels">
                      {APP_LANG_LEVELS.map((lv) => (
                        <button
                          key={lv}
                          type="button"
                          className={`ta-lang-lvl${entry!.level === lv ? " on" : ""}`}
                          onClick={() => setLangEntry(code, lv)}
                        >
                          {LANG_LEVEL_L[lv][L]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {form.languages.some((l) => l.lang === "other") && (
            <Field field="languages_other" label={T.languagesOther} invalid={isInvalid("languages_other")} errorText={T.fieldRequired}>
              <input value={form.languages_other} onChange={(e) => set("languages_other", e.target.value)} className="ta-input" />
            </Field>
          )}
        </Section>

        {/* About you — the old attachments checklist is gone; this is a
            free-form text box where the candidate can tell us more about
            themselves (LinkedIn, portfolio, anything they want to share). */}
        <Section title={T.notes}>
          <Field label="" optional>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="ta-input ta-textarea"
              rows={5}
              placeholder={T.notesPlaceholder}
            />
          </Field>
        </Section>

        <section className="ta-review-note">
          <strong>{T.reviewTitle}</strong>
          <p>{T.reviewText}</p>
        </section>
        </>}

        <div className="ta-submit-row">
          {step > 0 && <button type="button" className="ta-back-btn" onClick={() => { setError(""); setStep((current) => current - 1); }} disabled={submitting}>{T.previousStep}</button>}
          {step < TOTAL_STEPS - 1 ? (
            <button type="button" className="ta-submit-btn" onClick={nextStep}>{T.nextStep}</button>
          ) : (
            <button type="button" className="ta-submit-btn" onClick={submit} disabled={submitting}>
              {submitting ? T.submitting : T.submitBtn}
            </button>
          )}
        </div>
      </div>

      <style>{ta_styles}</style>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ta-section">
      <div className="ta-section-head">
        <span className="ta-section-rule" />
        <h2 className="ta-section-title">{title}</h2>
        <span className="ta-section-rule" />
      </div>
      <div className="ta-section-body">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="ta-grid">{children}</div>;
}

function Field({ field, label, children, optional, invalid, errorText }: {
  field?: string;
  label: string;
  children: React.ReactNode;
  optional?: boolean;
  invalid?: boolean;
  errorText?: string;
}) {
  return (
    <label className={`ta-field${invalid ? " invalid" : ""}`} data-field={field}>
      <span className="ta-label">
        {label}
        {!optional && <span className="ta-required">*</span>}
      </span>
      {children}
      {invalid && <span className="ta-field-error">{errorText}</span>}
    </label>
  );
}

function CheckboxGrid({
  options, value, onToggle, mode,
}: {
  options: { code: string; label: string }[];
  value: string[];
  onToggle: (code: string) => void;
  mode: "single" | "multi";
}) {
  return (
    <div className="ta-chk-grid">
      {options.map((o) => {
        const on = value.includes(o.code);
        return (
          <button
            key={o.code}
            type="button"
            className={`ta-chk${on ? " on" : ""}`}
            onClick={() => onToggle(o.code)}
            aria-pressed={on}
          >
            <span className={`ta-chk-box${mode === "single" ? " radio" : ""}`}>
              {on && <span className="ta-chk-dot" />}
            </span>
            <span className="ta-chk-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function RadioRow({
  options, value, onChange,
}: {
  options: { code: string; label: string }[];
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="ta-radio-row">
      {options.map((o) => {
        const on = value === o.code;
        return (
          <button
            key={o.code}
            type="button"
            className={`ta-radio${on ? " on" : ""}`}
            onClick={() => onChange(o.code)}
          >
            <span className="ta-radio-dot" />
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const ta_styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  .ta-page {
    min-height: 100vh; padding: 36px 16px 60px;
    font-family: 'Cairo', 'Tajawal', sans-serif;
    background:
      radial-gradient(ellipse at 50% 8%, #F7F3EB, transparent 45%),
      linear-gradient(160deg,#E5E0D5 0%,#E5E0D5 100%);
  }
  .ta-shell {
    max-width: 900px; margin: 0 auto;
    background: linear-gradient(160deg,#F7F3EB,#E5E0D5);
    border: 1.5px solid #B8A082; border-radius: 22px;
    padding: 36px clamp(20px, 4vw, 42px);
    box-shadow: 0 18px 60px rgba(107,30,45,0.16),
      inset 0 0 0 5px #E5E0D5, inset 0 0 0 6.5px rgba(107,30,45,0.42);
  }
  .ta-hero { text-align: center; margin-bottom: 28px; }
  .ta-hero-badge {
    display: inline-block; font-size: 11.5px; font-weight: 800; color: #6B1E2D;
    background: rgba(107,30,45,0.13); padding: 4px 14px; border-radius: 99px;
    margin-bottom: 12px; letter-spacing: 0.18em; text-transform: uppercase;
    border: 1px solid rgba(107,30,45,0.32);
  }
  .ta-hero-title {
    font-size: clamp(20px, 3.5vw, 28px); font-weight: 900; color: #6B1E2D;
    margin: 0 0 10px; line-height: 1.35;
  }
  .ta-hero-sub {
    font-size: 13.5px; color: #796A62; line-height: 1.9; margin: 0;
    max-width: 640px; margin-inline: auto;
  }
  .ta-save-state { display:inline-flex; margin-top:12px; padding:5px 11px; border-radius:999px; background:rgba(184,160,130,.13); color:#6B1E2D; font-size:11px; font-weight:800; }

  .ta-progress { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; margin:0 0 24px; }
  .ta-progress button { min-width:0; display:flex; align-items:center; gap:8px; padding:9px; border:1px solid rgba(107,30,45,.18); border-radius:11px; background:rgba(255,251,245,.5); color:#796A62; font-family:inherit; text-align:start; cursor:default; }
  .ta-progress button.done { cursor:pointer; color:#6B1E2D; }
  .ta-progress button.active { border-color:#6B1E2D; background:#FFFBF5; color:#6B1E2D; box-shadow:0 0 0 3px rgba(107,30,45,.07); }
  .ta-progress span { width:24px; height:24px; flex:none; display:grid; place-items:center; border-radius:50%; background:#E5E0D5; font-size:11px; font-weight:900; }
  .ta-progress .active span,.ta-progress .done span { background:#6B1E2D; color:#fff; }
  .ta-progress em { overflow:hidden; font-style:normal; font-size:10.5px; font-weight:800; line-height:1.3; text-overflow:ellipsis; }

  .ta-error {
    background: rgba(107,30,45,.10); color: #6B1E2D;
    border: 1px solid rgba(107,30,45,.28);
    border-radius: 12px; padding: 11px 16px; text-align: center;
    font-weight: 700; font-size: 13.5px; margin-bottom: 18px;
  }
  .ta-error strong { display:block; }
  .ta-error-fields { display:flex; flex-wrap:wrap; justify-content:center; gap:6px; margin-top:9px; }
  .ta-error-fields button { padding:4px 9px; border:1px solid rgba(107,30,45,.24); border-radius:999px; background:#FFFBF5; color:#6B1E2D; font:700 11px inherit; cursor:pointer; }

  .ta-section { margin-bottom: 30px; }
  .ta-section-head {
    display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
  }
  .ta-section-rule {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(107,30,45,0.45), transparent);
  }
  .ta-section-title {
    font-size: 15px; font-weight: 800; color: #6B1E2D;
    margin: 0; letter-spacing: 0.02em;
  }
  .ta-section-body {
    background: rgba(255,251,245,0.45);
    border: 1px solid rgba(107,30,45,0.22);
    border-radius: 14px; padding: 18px;
  }

  .ta-grid {
    display: grid; gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
  .ta-field { display: flex; flex-direction: column; gap: 6px; }
  .ta-label { font-size: 12.5px; font-weight: 800; color: #6B1E2D; display: flex; align-items: center; gap: 4px; }
  .ta-required { color: #6B1E2D; font-size: 14px; line-height: 1; }
  .ta-field.invalid .ta-input { border-color: #6B1E2D; box-shadow: 0 0 0 3px rgba(107,30,45,0.10); }
  .ta-field.invalid .ta-chk-grid,
  .ta-field.invalid .ta-radio-row { border-radius: 12px; box-shadow: 0 0 0 3px rgba(107,30,45,0.08); }
  .ta-field-error { color:#6B1E2D; font-size:11px; font-weight:800; }

  .ta-input {
    width: 100%; padding: 10px 13px; font-size: 14px;
    font-family: inherit; color: #4A0E1C;
    background: #FFFBF5; border: 1.5px solid rgba(107,30,45,0.4);
    border-radius: 11px; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ta-input:focus { border-color: #B8A082; box-shadow: 0 0 0 3px rgba(107,30,45,0.18); }
  .ta-textarea { resize: vertical; min-height: 80px; }
  .ta-hint { font-size: 12.5px; color: #796A62; margin: 0 0 12px; line-height: 1.7; }

  .ta-chk-grid {
    display: grid; gap: 9px;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
  .ta-chk {
    display: flex; align-items: center; gap: 9px;
    padding: 10px 12px; border-radius: 11px; cursor: pointer;
    background: #FFFBF5; border: 1.5px solid rgba(107,30,45,0.30);
    color: #6B1E2D; text-align: start; font-family: inherit;
    font-size: 13px; font-weight: 600; transition: all 0.15s;
  }
  .ta-chk:hover  { border-color: rgba(107,30,45,0.55); background: #F7F3EB; }
  .ta-chk.on     { border-color: #B8A082; background: linear-gradient(135deg, rgba(184,160,130,0.18), rgba(107,30,45,0.10)); color: #6B1E2D; }
  .ta-chk-box {
    width: 18px; height: 18px; flex-shrink: 0;
    border-radius: 5px; border: 1.5px solid rgba(107,30,45,0.55);
    display: flex; align-items: center; justify-content: center;
    background: #FFFBF5;
  }
  .ta-chk-box.radio { border-radius: 50%; }
  .ta-chk.on .ta-chk-box { background: #B8A082; border-color: #B8A082; }
  .ta-chk-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #F7F3EB;
  }
  .ta-chk-label { line-height: 1.4; }

  .ta-radio-row { display: flex; flex-wrap: wrap; gap: 10px; }
  .ta-radio {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 18px; border-radius: 11px; cursor: pointer;
    background: #FFFBF5; border: 1.5px solid rgba(107,30,45,0.30);
    color: #6B1E2D; font-family: inherit; font-size: 13px; font-weight: 700;
    transition: all 0.15s;
  }
  .ta-radio:hover { border-color: rgba(107,30,45,0.55); }
  .ta-radio.on    { border-color: #B8A082; background: linear-gradient(135deg, rgba(184,160,130,0.18), rgba(107,30,45,0.08)); color: #6B1E2D; }
  .ta-radio-dot {
    width: 14px; height: 14px; border-radius: 50%;
    border: 1.5px solid rgba(107,30,45,0.55); background: #FFFBF5;
  }
  .ta-radio.on .ta-radio-dot { background: #B8A082; border-color: #B8A082; box-shadow: inset 0 0 0 3px #F7F3EB; }

  .ta-lang-list { display: flex; flex-direction: column; gap: 10px; }
  .ta-lang-row {
    border: 1.5px solid rgba(107,30,45,0.30); border-radius: 12px;
    background: #FFFBF5; transition: all 0.15s;
  }
  .ta-lang-row.on { border-color: #B8A082; background: linear-gradient(135deg, rgba(184,160,130,0.10), rgba(107,30,45,0.04)); }
  .ta-lang-toggle {
    width: 100%; display: flex; align-items: center; gap: 11px;
    padding: 11px 14px; background: none; border: none;
    color: #6B1E2D; font-family: inherit; font-size: 13.5px; font-weight: 700;
    cursor: pointer; text-align: start;
  }
  .ta-lang-check {
    width: 22px; height: 22px; flex-shrink: 0;
    border-radius: 6px; border: 1.5px solid rgba(107,30,45,0.55);
    background: #FFFBF5; display: flex; align-items: center; justify-content: center;
    font-weight: 900; color: #FFFBF5;
  }
  .ta-lang-row.on .ta-lang-check { background: #B8A082; border-color: #B8A082; }
  .ta-lang-levels {
    display: flex; flex-wrap: wrap; gap: 7px; padding: 0 14px 14px;
  }
  .ta-lang-lvl {
    padding: 6px 13px; border-radius: 99px; font-size: 12px; font-weight: 700;
    background: #FFF; border: 1px solid rgba(107,30,45,0.30);
    color: #6B1E2D; cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .ta-lang-lvl:hover { border-color: #B8A082; color: #6B1E2D; }
  .ta-lang-lvl.on    { background: #B8A082; color: #F7F3EB; border-color: #B8A082; }

  .ta-review-note { margin:0 0 22px; padding:17px 18px; border:1px solid rgba(184,160,130,.38); border-radius:14px; background:rgba(255,251,245,.62); }
  .ta-review-note strong { display:block; color:#6B1E2D; font-size:14px; font-weight:900; }
  .ta-review-note p { margin:6px 0 0; color:#655B53; font-size:12.5px; line-height:1.8; }
  .ta-submit-row { display: flex; justify-content: space-between; gap:10px; margin-top: 14px; }
  .ta-back-btn { padding:13px 28px; border:1px solid rgba(107,30,45,.32); border-radius:14px; background:#FFFBF5; color:#6B1E2D; font:800 14px inherit; cursor:pointer; }
  .ta-submit-btn {
    padding: 14px 44px; font-size: 15px; font-weight: 900;
    background: linear-gradient(180deg,#B8A082,#B8A082);
    color: #4A0E1C; border: none; border-radius: 14px;
    cursor: pointer; font-family: inherit; letter-spacing: 0.02em;
    box-shadow: 0 8px 22px rgba(107,30,45,0.32),
      inset 0 1.5px 0 rgba(255,251,245,0.4);
    transition: transform 0.18s, box-shadow 0.18s;
  }
  .ta-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(107,30,45,0.40); }
  .ta-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
  @media(max-width:760px){.ta-progress{grid-template-columns:repeat(5,1fr)}.ta-progress button{justify-content:center;padding:8px 4px}.ta-progress em{display:none}.ta-progress span{width:28px;height:28px}.ta-shell{padding-inline:16px}.ta-submit-row{position:sticky;bottom:0;z-index:3;margin-inline:-16px;margin-bottom:-20px;padding:12px 16px max(12px,env(safe-area-inset-bottom));background:rgba(247,243,235,.96);border-top:1px solid rgba(184,160,130,.28);backdrop-filter:blur(10px)}}
`;
