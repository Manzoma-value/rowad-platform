"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cachedFetch } from "@/lib/api-cache";

interface SchoolDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  language: string;
  created_at: string;
  color_primary: string;
  color_secondary: string;
  color_bg: string;
  admin: { id: string; full_name: string } | null;
  teachers: {
    id: string;
    profile: { full_name: string };
    classes: { id: string; name: string }[];
  }[];
  students: {
    id: string;
    onboarding_status: string;
    profile: { full_name: string };
    class: { id: string; name: string } | null;
  }[];
  classes: {
    id: string;
    name: string;
    teacher: { profile: { full_name: string } } | null;
    _count: { students: number };
  }[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_INTAKE: "في انتظار الاختبار",
  INTAKE_SUBMITTED: "تم تقديم الاختبار",
  SCHOOL_ASSIGNED: "تم تعيين المدرسة",
  SCHOOL_PLACEMENT_SUBMITTED: "تم تقديم التوزيع",
  CLASS_ASSIGNED: "تم تعيين الفصل",
};

type Tab = "overview" | "teachers" | "students" | "classes" | "settings";

const PRESET_THEMES = [
  {
    name: "الهوية الرئيسية",
    primary: "#C8A96A",
    secondary: "#E5B93C",
    bg: "#0B0B0C",
  },
  { name: "الشباب", primary: "#E5B93C", secondary: "#C8A96A", bg: "#0B0B0C" },
  { name: "القيم", primary: "#C8A96A", secondary: "#E5B93C", bg: "#7A1E1E" },
  {
    name: "أزرق ليلي",
    primary: "#60A5FA",
    secondary: "#93C5FD",
    bg: "#0F172A",
  },
  { name: "زمرد", primary: "#34D399", secondary: "#6EE7B7", bg: "#064E3B" },
  { name: "بنفسجي", primary: "#A78BFA", secondary: "#C4B5FD", bg: "#1E1B4B" },
  { name: "وردي", primary: "#F472B6", secondary: "#FBCFE8", bg: "#1A0A14" },
  { name: "برتقالي", primary: "#FB923C", secondary: "#FED7AA", bg: "#1A0A00" },
];

export default function OwnerSchoolDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [settingsName, setSettingsName] = useState("");
  const [settingsSlug, setSettingsSlug] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [settingsLang, setSettingsLang] = useState("ar");
  const [colorPrimary, setColorPrimary] = useState("#C8A96A");
  const [colorSecondary, setColorSecondary] = useState("#E5B93C");
  const [colorBg, setColorBg] = useState("#0B0B0C");

  useEffect(() => {
    if (!id) return;
    cachedFetch<{ school: SchoolDetail }>(`/api/owner/schools/${id}`, 60_000)
      .then((d) => {
        setSchool(d.school);
        setSettingsName(d.school?.name ?? "");
        setSettingsSlug(d.school?.slug ?? "");
        setSettingsDesc(d.school?.description ?? "");
        setSettingsLang(d.school?.language ?? "ar");
        setColorPrimary(d.school?.color_primary || "#C8A96A");
        setColorSecondary(d.school?.color_secondary || "#E5B93C");
        setColorBg(d.school?.color_bg || "#0B0B0C");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function saveSettings() {
    setSaving(true);
    setSaveMsg("");
    const r = await fetch(`/api/owner/schools/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: settingsName,
        slug: settingsSlug,
        description: settingsDesc,
        language: settingsLang,
        color_primary: colorPrimary,
        color_secondary: colorSecondary,
        color_bg: colorBg,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setSaveMsg(d.error ?? "فشل الحفظ");
    } else {
      setSchool((prev) =>
        prev
          ? {
              ...prev,
              name: d.school.name,
              slug: d.school.slug,
              description: d.school.description,
              language: d.school.language,
              color_primary: d.school.color_primary,
              color_secondary: d.school.color_secondary,
              color_bg: d.school.color_bg,
              admin: d.school.admin,
            }
          : prev,
      );
      setSaveMsg("✓ تم الحفظ بنجاح");
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  }

  if (loading)
    return (
      <div className="sd-load">
        <div className="sd-spin" />
        جارٍ تحميل بيانات المدرسة…<style>{css}</style>
      </div>
    );
  if (!school)
    return (
      <div className="sd-load">
        المدرسة غير موجودة.<style>{css}</style>
      </div>
    );

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "نظرة عامة" },
    { id: "teachers", label: "المعلمون", count: school.teachers.length },
    { id: "students", label: "الطلاب", count: school.students.length },
    { id: "classes", label: "الفصول", count: school.classes.length },
    { id: "settings", label: "⚙️ الإعدادات" },
  ];

  const filteredStudents = school.students.filter((s) =>
    s.profile.full_name.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredTeachers = school.teachers.filter((t) =>
    t.profile.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="sd-page" dir="rtl">
      <div className="sd-header">
        <Link href="/owner/schools" className="sd-back">
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          جميع المدارس
        </Link>
        <div className="sd-title-row">
          <div
            className="sd-icon"
            style={{
              background: `${school.color_primary || "#C8A96A"}20`,
              border: `1px solid ${school.color_primary || "#C8A96A"}40`,
            }}
          >
            🏫
          </div>
          <div className="sd-title-body">
            <h1 className="sd-title">{school.name}</h1>
            <p className="sd-sub">
              المدير:{" "}
              {school.admin ? (
                <strong>{school.admin.full_name}</strong>
              ) : (
                <span className="sd-no-admin">غير معيَّن</span>
              )}
              <span className="sd-sep"> · </span>
              أُنشئت{" "}
              {new Date(school.created_at).toLocaleDateString("ar-SA", {
                year: "numeric",
                month: "long",
              })}
            </p>
          </div>
          {/* Color preview dots */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {[
              school.color_bg,
              school.color_primary,
              school.color_secondary,
            ].map((c, i) => (
              <div
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: c || "#C8A96A",
                  border: "1.5px solid rgba(0,0,0,0.15)",
                }}
              />
            ))}
          </div>
          <a
            href={`/schools/${school.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="sd-landing-btn"
          >
            <svg
              width="12"
              height="12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            صفحة المدرسة
          </a>
        </div>
      </div>

      <div className="sd-tabs-wrap">
        <div className="sd-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`sd-tab ${tab === t.id ? "active" : ""}`}
              onClick={() => {
                setTab(t.id);
                setSearch("");
              }}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="sd-tab-badge">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="sd-ov">
          <div className="sd-ov-grid">
            {[
              { label: "المعلمون", value: school.teachers.length, icon: "👨‍🏫" },
              { label: "الطلاب", value: school.students.length, icon: "🎓" },
              { label: "الفصول", value: school.classes.length, icon: "📚" },
              {
                label: "تاريخ الإنشاء",
                value: new Date(school.created_at).toLocaleDateString("ar-SA", {
                  year: "numeric",
                  month: "short",
                }),
                icon: "📅",
              },
            ].map((s) => (
              <div key={s.label} className="sd-ov-card">
                <div className="sd-ov-icon">{s.icon}</div>
                <div className="sd-ov-val">{s.value}</div>
                <div className="sd-ov-lab">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="sd-ov-info-grid">
            {[
              {
                label: "المعلمون بدون فصول",
                val: school.teachers.filter((t) => t.classes.length === 0)
                  .length,
              },
              {
                label: "الطلاب بدون فصل",
                val: school.students.filter((s) => !s.class).length,
              },
              {
                label: "الفصول بدون معلم",
                val: school.classes.filter((c) => !c.teacher).length,
              },
            ].map((item, i) => (
              <div key={i} className="sd-info-card">
                <span className="sd-info-label">{item.label}</span>
                <span className="sd-info-val">{item.val}</span>
              </div>
            ))}
          </div>
          <div className="sd-landing-preview">
            <div className="sd-landing-preview-left">
              <div className="sd-landing-preview-icon">🌐</div>
              <div>
                <div className="sd-landing-preview-title">
                  صفحة المدرسة العامة
                </div>
                <div className="sd-landing-preview-url">{`/schools/${school.slug}`}</div>
              </div>
            </div>
            <a
              href={`/schools/${school.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="sd-landing-btn"
            >
              <svg
                width="12"
                height="12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              فتح الصفحة
            </a>
          </div>
        </div>
      )}

      {/* Teachers */}
      {tab === "teachers" && (
        <div className="sd-list">
          {school.teachers.length > 4 && (
            <div className="sd-search-wrap">
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                className="sd-search-icon"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="sd-search"
                placeholder="ابحث عن معلم…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          {filteredTeachers.length === 0 ? (
            <div className="sd-empty">لا توجد نتائج.</div>
          ) : (
            filteredTeachers.map((t) => (
              <div key={t.id} className="sd-row">
                <div className="sd-av teacher">
                  {t.profile.full_name.charAt(0)}
                </div>
                <div className="sd-row-body">
                  <div className="sd-row-name">{t.profile.full_name}</div>
                  <div className="sd-row-sub">
                    {t.classes.length > 0
                      ? t.classes.map((c) => c.name).join("، ")
                      : "لا توجد فصول مُعيَّنة"}
                  </div>
                </div>
                <div className="sd-tag">
                  {t.classes.length} {t.classes.length === 1 ? "فصل" : "فصول"}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Students */}
      {tab === "students" && (
        <div className="sd-list">
          {school.students.length > 4 && (
            <div className="sd-search-wrap">
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                className="sd-search-icon"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="sd-search"
                placeholder="ابحث عن طالب…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          {filteredStudents.length === 0 ? (
            <div className="sd-empty">لا توجد نتائج.</div>
          ) : (
            filteredStudents.map((s) => (
              <div key={s.id} className="sd-row">
                <div className="sd-av student">
                  {s.profile.full_name.charAt(0)}
                </div>
                <div className="sd-row-body">
                  <div className="sd-row-name">{s.profile.full_name}</div>
                  <div className="sd-row-sub">
                    {s.class?.name ?? "لم يُعيَّن فصل"}
                  </div>
                </div>
                <div
                  className="sd-status-chip"
                  style={{
                    color: "var(--gold)",
                    background: "var(--gold-muted)",
                    border: "1px solid var(--gold-border)",
                  }}
                >
                  {STATUS_LABELS[s.onboarding_status] ?? s.onboarding_status}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Classes */}
      {tab === "classes" && (
        <div className="sd-list">
          {school.classes.length === 0 ? (
            <div className="sd-empty">لا توجد فصول.</div>
          ) : (
            school.classes.map((c) => (
              <div key={c.id} className="sd-row">
                <div className="sd-av class-av">📚</div>
                <div className="sd-row-body">
                  <div className="sd-row-name">{c.name}</div>
                  <div className="sd-row-sub">
                    {c.teacher?.profile.full_name ?? "لم يُعيَّن معلم"}
                  </div>
                </div>
                <div className="sd-tag">{c._count.students} طالب</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Settings */}
      {tab === "settings" && (
        <div className="sd-settings">
          <div className="sd-settings-card">
            <h2 className="sd-settings-title">إعدادات المدرسة</h2>

            <div className="sd-field">
              <label className="sd-field-label">اسم المدرسة</label>
              <input
                className="sd-input"
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
              />
            </div>

            <div className="sd-field">
              <label className="sd-field-label">رابط الصفحة (Slug)</label>
              <div className="sd-slug-wrap">
                <span className="sd-slug-prefix">/schools/</span>
                <input
                  className="sd-input sd-slug-input"
                  value={settingsSlug}
                  onChange={(e) =>
                    setSettingsSlug(
                      e.target.value.toLowerCase().replace(/\s/g, "-"),
                    )
                  }
                  dir="ltr"
                />
              </div>
              <div className="sd-field-hint">
                رابط الصفحة العامة:{" "}
                <a
                  href={`/schools/${settingsSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--gold)", textDecoration: "none" }}
                >
                  /schools/{settingsSlug}
                </a>
              </div>
            </div>

            <div className="sd-field">
              <label className="sd-field-label">وصف المدرسة</label>
              <textarea
                className="sd-textarea"
                value={settingsDesc}
                onChange={(e) => setSettingsDesc(e.target.value)}
                rows={3}
                placeholder="وصف مختصر يظهر في الصفحة العامة..."
              />
            </div>

            <div className="sd-field">
              <label className="sd-field-label">لغة المدرسة</label>
              <select
                className="sd-select"
                value={settingsLang}
                onChange={(e) => setSettingsLang(e.target.value)}
              >
                <option value="ar">🇸🇦 العربية (الافتراضي)</option>
                <option value="sq">🇦🇱 Shqip — الألبانية</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>

            {/* ── COLOR THEME ── */}
            <div className="sd-divider" />

            <div className="sd-field">
              <label className="sd-field-label">قوالب ألوان جاهزة</label>
              <div className="sd-presets">
                {PRESET_THEMES.map((theme, i) => (
                  <button
                    key={i}
                    className="sd-preset-btn"
                    onClick={() => {
                      setColorPrimary(theme.primary);
                      setColorSecondary(theme.secondary);
                      setColorBg(theme.bg);
                    }}
                  >
                    <div className="sd-preset-dots">
                      <div style={{ background: theme.bg }} />
                      <div style={{ background: theme.primary }} />
                      <div style={{ background: theme.secondary }} />
                    </div>
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="sd-field">
              <label className="sd-field-label">ألوان مخصصة</label>
              <div className="sd-colors-grid">
                {[
                  {
                    label: "اللون الرئيسي",
                    hint: "الأزرار والعناوين والأيقونة",
                    value: colorPrimary,
                    setter: setColorPrimary,
                  },
                  {
                    label: "اللون الثانوي",
                    hint: "الزخارف والتفاصيل الهندسية",
                    value: colorSecondary,
                    setter: setColorSecondary,
                  },
                  {
                    label: "لون الخلفية",
                    hint: "خلفية صفحة المدرسة",
                    value: colorBg,
                    setter: setColorBg,
                  },
                ].map((c, i) => (
                  <div key={i} className="sd-color-field">
                    <div className="sd-color-label">{c.label}</div>
                    <div className="sd-color-input-wrap">
                      <input
                        type="color"
                        value={c.value}
                        onChange={(e) => c.setter(e.target.value)}
                        className="sd-color-picker"
                      />
                      <input
                        type="text"
                        value={c.value}
                        onChange={(e) => c.setter(e.target.value)}
                        className="sd-color-hex"
                        maxLength={7}
                        placeholder="#000000"
                        dir="ltr"
                      />
                    </div>
                    <div className="sd-color-hint">{c.hint}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div className="sd-field">
              <label className="sd-field-label">معاينة مباشرة</label>
              <div className="sd-preview" style={{ background: colorBg }}>
                <div
                  className="sd-preview-header"
                  style={{ borderBottom: `1px solid rgba(255,255,255,0.08)` }}
                >
                  <div
                    className="sd-preview-logo"
                    style={{ background: colorPrimary, color: colorBg }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
                    </svg>
                  </div>
                  <span
                    style={{
                      color: colorPrimary,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    بناء الأهلية
                  </span>
                  <div
                    className="sd-preview-btn"
                    style={{ background: colorPrimary, color: colorBg }}
                  >
                    دخول
                  </div>
                </div>
                <div className="sd-preview-body">
                  <div
                    className="sd-preview-ring"
                    style={{
                      border: `1.5px solid ${colorSecondary}`,
                      borderRadius: "50%",
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: colorPrimary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 900,
                        color: colorBg,
                      }}
                    >
                      {settingsName.charAt(0) || "م"}
                    </div>
                  </div>
                  <div
                    style={{
                      color: "white",
                      fontSize: 13,
                      fontWeight: 800,
                      marginTop: 8,
                    }}
                  >
                    {settingsName || "اسم المدرسة"}
                  </div>
                  <div
                    style={{
                      color: colorPrimary,
                      fontSize: 9,
                      opacity: 0.6,
                      marginTop: 4,
                    }}
                  >
                    المنصة التعليمية
                  </div>
                </div>
              </div>
            </div>

            {saveMsg && (
              <div
                className={`sd-save-msg ${saveMsg.startsWith("✓") ? "success" : "error"}`}
              >
                {saveMsg}
              </div>
            )}

            <button
              className="sd-save-btn"
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? "جارٍ الحفظ..." : "حفظ جميع التغييرات"}
            </button>
          </div>

          <div className="sd-landing-preview">
            <div className="sd-landing-preview-left">
              <div className="sd-landing-preview-icon">🌐</div>
              <div>
                <div className="sd-landing-preview-title">
                  صفحة المدرسة العامة
                </div>
                <div className="sd-landing-preview-url">{`/schools/${school.slug}`}</div>
              </div>
            </div>
            <a
              href={`/schools/${school.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="sd-landing-btn"
            >
              <svg
                width="12"
                height="12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              فتح الصفحة
            </a>
          </div>
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

const css = `
  :root{--gold:#C8A96A;--gold2:#E5B93C;--gold-muted:rgba(200,169,106,0.1);--gold-border:rgba(200,169,106,0.2);--black:#0B0B0C;--off-white:#F5F3EE;--text:#0B0B0C;--text2:#4a3f2f;--text3:#9a8a6a;--surface:#ffffff;--surface2:#faf8f4;--surface3:#f5f0e8;--border:#e8dfd0;--border2:#d8ccb8;--danger:#8b1a1a;--radius:10px;--shadow-sm:0 1px 3px rgba(11,11,12,0.06);--shadow:0 4px 12px rgba(11,11,12,0.08)}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes spin{to{transform:rotate(360deg)}}

  .sd-page{display:flex;flex-direction:column;gap:22px;font-family:'Cairo',sans-serif}
  .sd-load{display:flex;align-items:center;gap:12px;height:220px;justify-content:center;color:var(--text3);font-size:14px;font-family:'Cairo',sans-serif}
  .sd-spin{width:20px;height:20px;border:2px solid var(--gold-border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite}

  .sd-header{display:flex;flex-direction:column;gap:12px;padding-bottom:20px;border-bottom:1px solid var(--border)}
  .sd-back{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text3);text-decoration:none;font-weight:600;transition:color 0.15s}
  .sd-back:hover{color:var(--gold)}
  .sd-title-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  .sd-icon{width:52px;height:52px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:28px}
  .sd-title-body{flex:1}
  .sd-title{font-size:22px;font-weight:800;color:var(--black);letter-spacing:-0.4px}
  .sd-sub{font-size:13px;color:var(--text3);margin-top:3px}
  .sd-sep{opacity:0.4}
  .sd-no-admin{color:var(--danger);font-style:italic}
  .sd-landing-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;border:1px solid var(--gold-border);color:var(--gold);font-size:12px;font-weight:700;text-decoration:none;transition:all 0.15s;background:var(--gold-muted);white-space:nowrap}
  .sd-landing-btn:hover{background:rgba(200,169,106,0.18);border-color:var(--gold)}

  .sd-tabs-wrap{border-bottom:2px solid var(--border)}
  .sd-tabs{display:flex;gap:2px}
  .sd-tab{display:flex;align-items:center;gap:7px;background:none;border:none;cursor:pointer;padding:10px 16px;font-size:13.5px;font-weight:700;color:var(--text3);border-bottom:2px solid transparent;margin-bottom:-2px;transition:all 0.15s;font-family:'Cairo',sans-serif;border-radius:6px 6px 0 0}
  .sd-tab:hover{color:var(--text);background:var(--surface3)}
  .sd-tab.active{color:var(--gold);border-bottom-color:var(--gold)}
  .sd-tab-badge{background:var(--surface3);border-radius:99px;padding:1px 8px;font-size:11px;font-family:'IBM Plex Mono',monospace;color:var(--text3);font-weight:700}
  .sd-tab.active .sd-tab-badge{background:var(--gold-muted);color:var(--gold);border:1px solid var(--gold-border)}

  .sd-ov{display:flex;flex-direction:column;gap:14px}
  .sd-ov-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .sd-ov-card{background:var(--surface);border:1px solid var(--border);border-top:2px solid var(--gold);border-radius:var(--radius);padding:20px 16px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;box-shadow:var(--shadow-sm)}
  .sd-ov-icon{font-size:24px}
  .sd-ov-val{font-size:26px;font-weight:900;font-family:'IBM Plex Mono',monospace;color:var(--gold);letter-spacing:-1px}
  .sd-ov-lab{font-size:12px;color:var(--text3);font-weight:700}
  .sd-ov-info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .sd-info-card{background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;display:flex;align-items:center;justify-content:space-between}
  .sd-info-label{font-size:12.5px;color:var(--text2);font-weight:600}
  .sd-info-val{font-size:18px;font-weight:800;color:var(--black);font-family:'IBM Plex Mono',monospace}
  .sd-landing-preview{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:var(--gold-muted);border:1px solid var(--gold-border);border-radius:12px;gap:12px}
  .sd-landing-preview-left{display:flex;align-items:center;gap:12px}
  .sd-landing-preview-icon{font-size:22px}
  .sd-landing-preview-title{font-size:13px;font-weight:700;color:var(--black)}
  .sd-landing-preview-url{font-size:12px;color:var(--text3);font-family:'IBM Plex Mono',monospace;margin-top:2px}

  .sd-list{display:flex;flex-direction:column;gap:8px}
  .sd-empty{text-align:center;color:var(--text3);padding:48px;font-size:14px}
  .sd-search-wrap{position:relative;display:flex;align-items:center}
  .sd-search-icon{position:absolute;right:13px;color:var(--text3);pointer-events:none}
  .sd-search{width:100%;background:var(--surface);border:1px solid var(--border2);border-radius:8px;padding:9px 40px 9px 13px;font-size:13.5px;font-family:'Cairo',sans-serif;color:var(--text);outline:none}
  .sd-search:focus{border-color:var(--gold)}
  .sd-row{display:flex;align-items:center;gap:13px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--shadow-sm);transition:border-color 0.15s}
  .sd-row:hover{border-color:var(--gold-border)}
  .sd-av{width:38px;height:38px;border-radius:10px;flex-shrink:0;background:var(--black);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:var(--gold)}
  .sd-av.student{background:rgba(200,169,106,0.15);color:var(--gold);border:1px solid var(--gold-border)}
  .sd-av.class-av{background:var(--surface2);font-size:20px;border:1px solid var(--border)}
  .sd-row-body{flex:1;min-width:0}
  .sd-row-name{font-size:14px;font-weight:700;color:var(--black)}
  .sd-row-sub{font-size:12px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sd-tag{font-size:12px;font-weight:700;color:var(--text2);background:var(--surface2);border:1px solid var(--border);padding:4px 12px;border-radius:20px;white-space:nowrap;flex-shrink:0}
  .sd-status-chip{font-size:11px;font-weight:700;white-space:nowrap;padding:4px 11px;border-radius:20px;flex-shrink:0}

  .sd-settings{display:flex;flex-direction:column;gap:16px}
  .sd-settings-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:18px;box-shadow:var(--shadow-sm)}
  .sd-settings-title{font-size:15px;font-weight:800;color:var(--black)}
  .sd-divider{height:1px;background:var(--border);margin:4px 0}
  .sd-field{display:flex;flex-direction:column;gap:7px}
  .sd-field-label{font-size:11.5px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px}
  .sd-field-hint{font-size:11px;color:var(--text3);font-weight:500}
  .sd-input{background:var(--surface);border:1px solid var(--border2);color:var(--text);border-radius:8px;padding:10px 13px;font-size:13.5px;font-family:'Cairo',sans-serif;outline:none;width:100%;transition:border-color 0.15s}
  .sd-input:focus{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-muted)}
  .sd-textarea{background:var(--surface);border:1px solid var(--border2);color:var(--text);border-radius:8px;padding:10px 13px;font-size:13.5px;font-family:'Cairo',sans-serif;outline:none;width:100%;resize:vertical;line-height:1.6;transition:border-color 0.15s}
  .sd-textarea:focus{border-color:var(--gold)}
  .sd-select{background:var(--surface);border:1px solid var(--border2);color:var(--text);border-radius:8px;padding:10px 13px;font-size:13.5px;font-family:'Cairo',sans-serif;outline:none;width:100%;cursor:pointer}
  .sd-select:focus{border-color:var(--gold)}
  .sd-slug-wrap{display:flex;align-items:center;border:1px solid var(--border2);border-radius:8px;overflow:hidden;background:var(--surface)}
  .sd-slug-prefix{padding:10px 12px;background:var(--surface3);color:var(--text3);font-size:12.5px;font-family:'IBM Plex Mono',monospace;border-left:1px solid var(--border2);white-space:nowrap}
  .sd-slug-input{border:none!important;box-shadow:none!important;flex:1}

  /* Presets */
  .sd-presets{display:flex;gap:7px;flex-wrap:wrap}
  .sd-preset-btn{display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:12px;font-weight:600;color:var(--text2);font-family:'Cairo',sans-serif;transition:all 0.15s}
  .sd-preset-btn:hover{border-color:var(--gold-border);background:var(--gold-muted)}
  .sd-preset-dots{display:flex;gap:3px}
  .sd-preset-dots div{width:11px;height:11px;border-radius:50%;border:1.5px solid rgba(0,0,0,0.12)}

  /* Color fields */
  .sd-colors-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .sd-color-field{display:flex;flex-direction:column;gap:6px}
  .sd-color-label{font-size:12px;font-weight:700;color:var(--text2)}
  .sd-color-input-wrap{display:flex;align-items:center;gap:8px;border:1px solid var(--border2);border-radius:8px;padding:6px 10px;background:var(--surface)}
  .sd-color-picker{width:32px;height:32px;border-radius:6px;border:none;cursor:pointer;padding:0;background:none;flex-shrink:0}
  .sd-color-hex{flex:1;border:none;outline:none;font-size:13px;font-family:'IBM Plex Mono',monospace;color:var(--text);background:none}
  .sd-color-hint{font-size:10.5px;color:var(--text3)}

  /* Live preview */
  .sd-preview{border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)}
  .sd-preview-header{display:flex;align-items:center;gap:10px;padding:10px 14px}
  .sd-preview-logo{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .sd-preview-btn{margin-right:auto;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700}
  .sd-preview-body{display:flex;flex-direction:column;align-items:center;padding:16px;gap:0}

  .sd-save-btn{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--black);color:var(--gold);border:1px solid rgba(200,169,106,0.3);border-radius:9px;padding:12px 20px;font-size:13.5px;font-weight:800;cursor:pointer;font-family:'Cairo',sans-serif;transition:all 0.18s;width:fit-content}
  .sd-save-btn:hover:not(:disabled){background:rgba(200,169,106,0.1);border-color:var(--gold)}
  .sd-save-btn:disabled{opacity:0.5;cursor:not-allowed}
  .sd-save-msg{font-size:13px;font-weight:600;padding:10px 14px;border-radius:8px}
  .sd-save-msg.success{background:rgba(26,107,60,0.1);color:#1a6b3c;border:1px solid rgba(26,107,60,0.2)}
  .sd-save-msg.error{background:rgba(139,26,26,0.1);color:var(--danger);border:1px solid rgba(139,26,26,0.2)}

  @media(max-width:900px){.sd-ov-grid{grid-template-columns:repeat(2,1fr)}.sd-ov-info-grid{grid-column:1fr}.sd-colors-grid{grid-template-columns:1fr}}
  @media(max-width:600px){.sd-tabs{overflow-x:auto}}
`;
