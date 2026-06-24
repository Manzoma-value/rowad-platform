"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  APP_ATTACHMENTS,
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
  type AppLanguage,
  type LangLevel,
} from "@/lib/teacher-application";

type Form = {
  full_name: string;
  age: string;
  country: string;
  city: string;
  phone: string;
  email: string;
  gender: "MALE" | "FEMALE" | "";
  nominating_entity: string;
  nominator_name: string;
  nominator_role: string;
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
  attachments: string[];
  notes: string;
};

const EMPTY: Form = {
  full_name: "", age: "", country: "", city: "", phone: "", email: "",
  gender: "",
  nominating_entity: "", nominator_name: "", nominator_role: "",
  current_role: "", current_role_other: "",
  qualification: "", specialization: "", graduation_institution: "",
  experience_areas: [], experience_areas_other: "",
  years_of_experience: "",
  target_groups: [], target_groups_other: "",
  contributions: [],
  has_achievements: false, achievements_scope: "",
  languages: [], languages_other: "",
  attachments: [], notes: "",
};

export default function TeacherApplicationPage() {
  const { lang } = useLang();
  const router = useRouter();
  const L = pickLang(lang);
  const T = APP_UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form>(EMPTY);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  // Route guard: if the teacher already submitted or is past PENDING_APPLICATION,
  // bounce them to the appropriate screen.
  useEffect(() => {
    fetch("/api/teacher", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const status: string = d?.onboarding_status;
        if (status === "UNDER_REVIEW") { router.replace("/teacher/under-review"); return; }
        if (status === "REJECTED")     { router.replace("/teacher/rejected"); return; }
        if (status === "ACTIVE")       { router.replace("/teacher"); return; }
        // Pre-fill the email/full_name from profile if available
        if (d?.profile?.full_name)
          setForm((f) => ({ ...f, full_name: f.full_name || d.profile.full_name }));
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

  function toggle(field: "experience_areas" | "target_groups" | "contributions" | "attachments", code: string) {
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

  async function submit() {
    setError("");
    const required: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      age: form.age,
      country: form.country.trim(),
      city: form.city.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      gender: form.gender,
      current_role: form.current_role,
      qualification: form.qualification,
      specialization: form.specialization.trim(),
      graduation_institution: form.graduation_institution.trim(),
      years_of_experience: form.years_of_experience,
    };
    const missing = new Set<string>();
    for (const [k, v] of Object.entries(required)) {
      if (!v) missing.add(k);
    }
    const ageNum = Number(form.age);
    if (!ageNum || ageNum < 16 || ageNum > 120) missing.add("age");
    if (missing.size > 0) {
      setInvalidFields(missing);
      setError(T.requiredFields);
      window.scrollTo({ top: 0, behavior: "smooth" });
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
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d?.error === "missing_field"
          ? `${T.requiredFields} (${d.field})`
          : T.serverError);
        setSubmitting(false);
        return;
      }
      // Bust the layout's cached /api/teacher response (5-min TTL) so the
      // layout sees UNDER_REVIEW immediately on the next render. Without
      // this the layout's gatedTo stays "PENDING_APPLICATION" and bounces
      // the user back to /teacher/application, causing a flicker.
      invalidateCache("/api/teacher");
      window.location.replace("/teacher/under-review");
    } catch {
      setError(T.serverError);
      setSubmitting(false);
    }
  }

  const isInvalid = (f: string) => invalidFields.has(f);

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
        </header>

        {error && <div className="ta-error">{error}</div>}

        {/* Personal */}
        <Section title={T.sectionPersonal}>
          <Grid>
            <Field label={T.fullName} invalid={isInvalid("full_name")}>
              <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="ta-input" />
            </Field>
            <Field label={T.age} invalid={isInvalid("age")}>
              <input type="number" min={16} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} className="ta-input" />
            </Field>
            <Field label={T.country} invalid={isInvalid("country")}>
              <input value={form.country} onChange={(e) => set("country", e.target.value)} className="ta-input" />
            </Field>
            <Field label={T.city} invalid={isInvalid("city")}>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} className="ta-input" />
            </Field>
            <Field label={T.phone} invalid={isInvalid("phone")}>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="ta-input" dir="ltr" />
            </Field>
            <Field label={T.email} invalid={isInvalid("email")}>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="ta-input" dir="ltr" />
            </Field>
          </Grid>
          <Field label={T.gender} invalid={isInvalid("gender")}>
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

        {/* Nomination */}
        <Section title={T.sectionNomination}>
          <Grid>
            <Field label={T.nominatingEntity} optional><input value={form.nominating_entity} onChange={(e) => set("nominating_entity", e.target.value)} className="ta-input" /></Field>
            <Field label={T.nominatorName} optional><input value={form.nominator_name} onChange={(e) => set("nominator_name", e.target.value)} className="ta-input" /></Field>
            <Field label={T.nominatorRole} optional><input value={form.nominator_role} onChange={(e) => set("nominator_role", e.target.value)} className="ta-input" /></Field>
          </Grid>
        </Section>

        {/* Current role */}
        <Section title={T.sectionCurrentRole}>
          <Field label={T.currentRole} invalid={isInvalid("current_role")}>
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
          <Field label={T.qualification} invalid={isInvalid("qualification")}>
            <CheckboxGrid
              mode="single"
              value={form.qualification ? [form.qualification] : []}
              onToggle={(c) => set("qualification", c)}
              options={APP_QUALIFICATIONS.map((c) => ({ code: c, label: QUALIFICATION_L[c][L] }))}
            />
          </Field>
          <Grid>
            <Field label={T.specialization} invalid={isInvalid("specialization")}>
              <input value={form.specialization} onChange={(e) => set("specialization", e.target.value)} className="ta-input" />
            </Field>
            <Field label={T.graduationInstitution} invalid={isInvalid("graduation_institution")}>
              <input value={form.graduation_institution} onChange={(e) => set("graduation_institution", e.target.value)} className="ta-input" />
            </Field>
          </Grid>
        </Section>

        {/* Experience areas */}
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
          <Field label={T.yearsOfExperience} invalid={isInvalid("years_of_experience")}>
            <CheckboxGrid
              mode="single"
              value={form.years_of_experience ? [form.years_of_experience] : []}
              onToggle={(c) => set("years_of_experience", c)}
              options={APP_EXPERIENCE_RANGES.map((c) => ({ code: c, label: EXPERIENCE_RANGE_L[c][L] }))}
            />
          </Field>
        </Section>

        {/* Target groups */}
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

        {/* Contributions */}
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

        {/* Languages */}
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
            <Field label={T.languagesOther} optional>
              <input value={form.languages_other} onChange={(e) => set("languages_other", e.target.value)} className="ta-input" />
            </Field>
          )}
        </Section>

        {/* Attachments */}
        <Section title={T.sectionAttachments}>
          <p className="ta-hint">{T.attachments}</p>
          <CheckboxGrid
            mode="multi"
            value={form.attachments}
            onToggle={(c) => toggle("attachments", c)}
            options={APP_ATTACHMENTS.map((c) => ({ code: c, label: ATTACHMENT_L[c][L] }))}
          />
          <Field label={T.notes} optional>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="ta-input ta-textarea"
              rows={4}
            />
          </Field>
        </Section>

        <div className="ta-submit-row">
          <button className="ta-submit-btn" onClick={submit} disabled={submitting}>
            {submitting ? T.submitting : T.submitBtn}
          </button>
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

function Field({ label, children, optional, invalid }: {
  label: string;
  children: React.ReactNode;
  optional?: boolean;
  invalid?: boolean;
}) {
  return (
    <label className={`ta-field${invalid ? " invalid" : ""}`}>
      <span className="ta-label">
        {label}
        {!optional && <span className="ta-required">*</span>}
      </span>
      {children}
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
      radial-gradient(ellipse at 50% 8%, #F8F1E0, transparent 45%),
      linear-gradient(160deg,#EFE6D2 0%,#E9DFC7 100%);
  }
  .ta-shell {
    max-width: 900px; margin: 0 auto;
    background: linear-gradient(160deg,#FDF8E9,#F4E9CD);
    border: 1.5px solid #C0A063; border-radius: 22px;
    padding: 36px clamp(20px, 4vw, 42px);
    box-shadow: 0 18px 60px rgba(150,115,50,0.16),
      inset 0 0 0 5px #F2E6CC, inset 0 0 0 6.5px rgba(194,160,89,0.42);
  }
  .ta-hero { text-align: center; margin-bottom: 28px; }
  .ta-hero-badge {
    display: inline-block; font-size: 11.5px; font-weight: 800; color: #A9863F;
    background: rgba(194,160,89,0.13); padding: 4px 14px; border-radius: 99px;
    margin-bottom: 12px; letter-spacing: 0.18em; text-transform: uppercase;
    border: 1px solid rgba(194,160,89,0.32);
  }
  .ta-hero-title {
    font-size: clamp(20px, 3.5vw, 28px); font-weight: 900; color: #3B2F1C;
    margin: 0 0 10px; line-height: 1.35;
  }
  .ta-hero-sub {
    font-size: 13.5px; color: #7A6440; line-height: 1.9; margin: 0;
    max-width: 640px; margin-inline: auto;
  }

  .ta-error {
    background: rgba(139,26,26,.10); color: #7A1E1E;
    border: 1px solid rgba(139,26,26,.28);
    border-radius: 12px; padding: 11px 16px; text-align: center;
    font-weight: 700; font-size: 13.5px; margin-bottom: 18px;
  }

  .ta-section { margin-bottom: 30px; }
  .ta-section-head {
    display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
  }
  .ta-section-rule {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(194,160,89,0.45), transparent);
  }
  .ta-section-title {
    font-size: 15px; font-weight: 800; color: #6B4F1E;
    margin: 0; letter-spacing: 0.02em;
  }
  .ta-section-body {
    background: rgba(255,250,235,0.45);
    border: 1px solid rgba(194,160,89,0.22);
    border-radius: 14px; padding: 18px;
  }

  .ta-grid {
    display: grid; gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
  .ta-field { display: flex; flex-direction: column; gap: 6px; }
  .ta-label { font-size: 12.5px; font-weight: 800; color: #5A4318; display: flex; align-items: center; gap: 4px; }
  .ta-required { color: #B83434; font-size: 14px; line-height: 1; }
  .ta-field.invalid .ta-input { border-color: #B83434; box-shadow: 0 0 0 3px rgba(184,52,52,0.10); }
  .ta-field.invalid .ta-chk-grid,
  .ta-field.invalid .ta-radio-row { border-radius: 12px; box-shadow: 0 0 0 3px rgba(184,52,52,0.08); }

  .ta-input {
    width: 100%; padding: 10px 13px; font-size: 14px;
    font-family: inherit; color: #2E2210;
    background: #FFFCEF; border: 1.5px solid rgba(194,160,89,0.4);
    border-radius: 11px; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ta-input:focus { border-color: #B89B5E; box-shadow: 0 0 0 3px rgba(184,155,94,0.18); }
  .ta-textarea { resize: vertical; min-height: 80px; }
  .ta-hint { font-size: 12.5px; color: #7A6440; margin: 0 0 12px; line-height: 1.7; }

  .ta-chk-grid {
    display: grid; gap: 9px;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
  .ta-chk {
    display: flex; align-items: center; gap: 9px;
    padding: 10px 12px; border-radius: 11px; cursor: pointer;
    background: #FFFCEF; border: 1.5px solid rgba(194,160,89,0.30);
    color: #4A3B1E; text-align: start; font-family: inherit;
    font-size: 13px; font-weight: 600; transition: all 0.15s;
  }
  .ta-chk:hover  { border-color: rgba(184,155,94,0.55); background: #FFF7DD; }
  .ta-chk.on     { border-color: #B89B5E; background: linear-gradient(135deg, rgba(229,185,60,0.18), rgba(194,160,89,0.10)); color: #3B2A0E; }
  .ta-chk-box {
    width: 18px; height: 18px; flex-shrink: 0;
    border-radius: 5px; border: 1.5px solid rgba(184,155,94,0.55);
    display: flex; align-items: center; justify-content: center;
    background: #FFFEF6;
  }
  .ta-chk-box.radio { border-radius: 50%; }
  .ta-chk.on .ta-chk-box { background: #B89B5E; border-color: #B89B5E; }
  .ta-chk-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #FFF6D8;
  }
  .ta-chk-label { line-height: 1.4; }

  .ta-radio-row { display: flex; flex-wrap: wrap; gap: 10px; }
  .ta-radio {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 18px; border-radius: 11px; cursor: pointer;
    background: #FFFCEF; border: 1.5px solid rgba(194,160,89,0.30);
    color: #4A3B1E; font-family: inherit; font-size: 13px; font-weight: 700;
    transition: all 0.15s;
  }
  .ta-radio:hover { border-color: rgba(184,155,94,0.55); }
  .ta-radio.on    { border-color: #B89B5E; background: linear-gradient(135deg, rgba(229,185,60,0.18), rgba(194,160,89,0.08)); color: #3B2A0E; }
  .ta-radio-dot {
    width: 14px; height: 14px; border-radius: 50%;
    border: 1.5px solid rgba(184,155,94,0.55); background: #FFFEF6;
  }
  .ta-radio.on .ta-radio-dot { background: #B89B5E; border-color: #B89B5E; box-shadow: inset 0 0 0 3px #FFF6D8; }

  .ta-lang-list { display: flex; flex-direction: column; gap: 10px; }
  .ta-lang-row {
    border: 1.5px solid rgba(194,160,89,0.30); border-radius: 12px;
    background: #FFFCEF; transition: all 0.15s;
  }
  .ta-lang-row.on { border-color: #B89B5E; background: linear-gradient(135deg, rgba(229,185,60,0.10), rgba(194,160,89,0.04)); }
  .ta-lang-toggle {
    width: 100%; display: flex; align-items: center; gap: 11px;
    padding: 11px 14px; background: none; border: none;
    color: #4A3B1E; font-family: inherit; font-size: 13.5px; font-weight: 700;
    cursor: pointer; text-align: start;
  }
  .ta-lang-check {
    width: 22px; height: 22px; flex-shrink: 0;
    border-radius: 6px; border: 1.5px solid rgba(184,155,94,0.55);
    background: #FFFEF6; display: flex; align-items: center; justify-content: center;
    font-weight: 900; color: #FFFEF6;
  }
  .ta-lang-row.on .ta-lang-check { background: #B89B5E; border-color: #B89B5E; }
  .ta-lang-levels {
    display: flex; flex-wrap: wrap; gap: 7px; padding: 0 14px 14px;
  }
  .ta-lang-lvl {
    padding: 6px 13px; border-radius: 99px; font-size: 12px; font-weight: 700;
    background: #FFF; border: 1px solid rgba(194,160,89,0.30);
    color: #6B4F1E; cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .ta-lang-lvl:hover { border-color: #B89B5E; color: #3B2A0E; }
  .ta-lang-lvl.on    { background: #B89B5E; color: #FFF8E2; border-color: #B89B5E; }

  .ta-submit-row { display: flex; justify-content: center; margin-top: 14px; }
  .ta-submit-btn {
    padding: 14px 44px; font-size: 15px; font-weight: 900;
    background: linear-gradient(180deg,#D8B96A,#B89B5E);
    color: #1E1605; border: none; border-radius: 14px;
    cursor: pointer; font-family: inherit; letter-spacing: 0.02em;
    box-shadow: 0 8px 22px rgba(184,155,94,0.32),
      inset 0 1.5px 0 rgba(255,250,235,0.4);
    transition: transform 0.18s, box-shadow 0.18s;
  }
  .ta-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(184,155,94,0.40); }
  .ta-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
`;
