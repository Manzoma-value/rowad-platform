"use client";
export const dynamic = "force-dynamic";
import MandalaLoader from "@/components/MandalaLoader";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";

interface School {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  language: string;
  is_active: boolean;
  color_primary: string;
  color_secondary: string;
  color_bg: string;
  admin: { id: string; full_name: string } | null;
  _count: { teachers: number; students: number; classes: number };
}

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
];

export default function OwnerSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLang, setNewLang] = useState("ar");
  const [newColorPrimary, setNewColorPrimary] = useState("#C8A96A");
  const [newColorSecondary, setNewColorSecondary] = useState("#E5B93C");
  const [newColorBg, setNewColorBg] = useState("#0B0B0C");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function autoSlug(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  useEffect(() => {
    cachedFetch<{ schools: School[] }>("/api/owner/schools", 60_000)
      .then((d) => setSchools(d.schools ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.admin?.full_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const totalStudents = schools.reduce(
    (a, s) => a + (s._count?.students ?? 0),
    0,
  );
  const totalTeachers = schools.reduce(
    (a, s) => a + (s._count?.teachers ?? 0),
    0,
  );

  async function handleCreate() {
    setCreateError("");
    if (!newName.trim()) {
      setCreateError("اسم الجهة مطلوب");
      return;
    }
    setCreating(true);
    const slug = newSlug.trim() || autoSlug(newName);
    try {
      const r = await fetch("/api/owner/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug,
          description: newDesc.trim() || null,
          language: newLang,
          color_primary: newColorPrimary,
          color_secondary: newColorSecondary,
          color_bg: newColorBg,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setCreateError(d.error ?? "فشل إنشاء الجهة");
        return;
      }
      invalidateCache("/api/owner/schools");
      invalidateCache("/api/owner/stats");
      setSchools((prev) => [d.school, ...prev]);
      setShowCreate(false);
      setNewName("");
      setNewSlug("");
      setNewDesc("");
      setNewLang("ar");
      setNewColorPrimary("#C8A96A");
      setNewColorSecondary("#E5B93C");
      setNewColorBg("#0B0B0C");
    } catch {
      setCreateError("تعذر الاتصال بالخادم");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(schoolId: string, currentActive: boolean) {
    setToggling(schoolId);
    try {
      const r = await fetch(`/api/owner/schools/${schoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (r.ok) {
        invalidateCache("/api/owner/schools");
        setSchools((prev) =>
          prev.map((s) => (s.id === schoolId ? { ...s, is_active: !currentActive } : s)),
        );
      }
    } catch { /* silent */ }
    setToggling(null);
  }

  async function handleDelete(schoolId: string) {
    setDeleting(schoolId);
    try {
      const r = await fetch(`/api/owner/schools/${schoolId}`, { method: "DELETE" });
      if (r.ok) {
        invalidateCache("/api/owner/schools");
        invalidateCache("/api/owner/stats");
        setSchools((prev) => prev.filter((s) => s.id !== schoolId));
        setConfirmDelete(null);
      }
    } catch { /* silent */ }
    setDeleting(null);
  }

  return (
    <div className="pg" dir="rtl">
      {/* ── Page header ── */}
      <div className="pg-head">
        <div className="pg-head-left">
          <div className="pg-rule" />
          <div>
            <div className="pg-eyebrow">إدارة المنصة</div>
            <h1 className="pg-title">الجهات المسجَّلة</h1>
          </div>
        </div>
        <button className="btn-create" onClick={() => setShowCreate((s) => !s)}>
          <svg
            width="13"
            height="13"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          إضافة جهة
        </button>
      </div>

      {/* ── Create panel ── */}
      {showCreate && (
        <div className="create-panel">
          <div className="create-panel-header">
            <div className="create-panel-title">تسجيل جهة جديدة</div>
            <div className="create-panel-sub">
              ستظهر الجهة فور إنشائها في قائمة الجهات مع صفحتها العامة
            </div>
          </div>

          <div className="create-grid">
            <div className="cf">
              <label className="cf-label">
                اسم الجهة <span className="cf-req">*</span>
              </label>
              <input
                className="cf-input"
                value={newName}
                placeholder=" الرواد"
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newSlug) setNewSlug(autoSlug(e.target.value));
                }}
              />
            </div>
            <div className="cf">
              <label className="cf-label">رابط الصفحة</label>
              <div className="cf-slug">
                <span className="cf-slug-pre">/schools/</span>
                <input
                  className="cf-input cf-slug-inp"
                  value={newSlug}
                  placeholder="al-rowad"
                  dir="ltr"
                  onChange={(e) =>
                    setNewSlug(e.target.value.toLowerCase().replace(/\s/g, "-"))
                  }
                />
              </div>
            </div>
            <div className="cf cf-full">
              <label className="cf-label">وصف الجهة</label>
              <input
                className="cf-input"
                value={newDesc}
                placeholder="وصف مختصر يظهر في الصفحة العامة..."
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div className="cf">
              <label className="cf-label">لغة الجهة</label>
              <select
                className="cf-select"
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
              >
                <option value="ar">🇸🇦 العربية</option>
                <option value="sq">🇦🇱 Shqip</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
            <div className="cf cf-full">
              <label className="cf-label">ألوان الصفحة العامة</label>
              <div className="theme-presets">
                {PRESET_THEMES.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`theme-preset ${newColorBg === t.bg && newColorPrimary === t.primary ? "active" : ""}`}
                    onClick={() => {
                      setNewColorPrimary(t.primary);
                      setNewColorSecondary(t.secondary);
                      setNewColorBg(t.bg);
                    }}
                  >
                    <div className="theme-dots">
                      <span style={{ background: t.bg }} />
                      <span style={{ background: t.primary }} />
                      <span style={{ background: t.secondary }} />
                    </div>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {createError && <div className="create-error">{createError}</div>}
          <div className="create-actions">
            <button
              className="btn-create"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "جارٍ الإنشاء..." : "إنشاء الجهة"}
            </button>
            <button
              className="btn-cancel"
              onClick={() => {
                setShowCreate(false);
                setCreateError("");
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ── Summary strip ── */}
      {!loading && schools.length > 0 && (
        <div className="summary">
          {[
            { num: schools.length, lab: " جهة مسجَّلة", icon: "�" },
            { num: totalTeachers, lab: "مشرف في المنصة", icon: "👨‍🏫" },
            { num: totalStudents, lab: "مستفيد منتسب", icon: "🎓" },
          ].map((s, i) => (
            <div key={i} className="summary-item">
              <span className="summary-icon">{s.icon}</span>
              <span className="summary-num">{s.num}</span>
              <span className="summary-lab">{s.lab}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Search ── */}
      {!loading && schools.length > 0 && (
        <div className="search-wrap">
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            className="search-ico"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            className="search-inp"
            placeholder="البحث عن الجهة أو مدير..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* ── Grid ── */}
      {loading ? (
        <MandalaLoader label="جارٍ تحميل المدارس" sublabel="يرجى الانتظار..." />
      ) : filtered.length === 0 ? (
        <div className="state-center state-empty">
          <div className="empty-ring">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle
                cx="24"
                cy="24"
                r="22"
                stroke="#C8A96A"
                strokeWidth="0.6"
                strokeDasharray="3 4"
              />
              <circle
                cx="24"
                cy="24"
                r="15"
                stroke="#C8A96A"
                strokeWidth="0.6"
              />
              <circle cx="24" cy="24" r="8" stroke="#E5B93C" strokeWidth="1" />
              <circle cx="24" cy="24" r="2.5" fill="#C8A96A" />
            </svg>
          </div>
          <p>
            {search ? "لا توجد نتائج مطابقة لبحثك" : "لا توجد جهات مسجّلة بعد"}
          </p>
        </div>
      ) : (
        <div className="schools-grid">
          {filtered.map((school, idx) => (
            <div
              key={school.id}
              className={`school-card${school.is_active ? "" : " inactive-card"}`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* Card top accent line using school's primary color */}
              <div
                className="card-accent"
                style={{
                  background: `linear-gradient(90deg, ${school.color_primary || "#C8A96A"}, ${school.color_secondary || "#E5B93C"})`,
                }}
              />

              <div className="card-head">
                {/* School color swatch */}
                <div
                  className="card-swatch"
                  style={{
                    background: school.color_bg || "#0B0B0C",
                    border: `1px solid ${school.color_primary || "#C8A96A"}30`,
                  }}
                >
                  <span
                    style={{
                      color: school.color_primary || "#C8A96A",
                      fontSize: 18,
                    }}
                  >
                    🏫
                  </span>
                </div>
                <div className="card-meta">
                  <span className="card-lang">
                    {school.language === "sq" ? "🇦🇱 Shqip" : "🇸🇦 عربي"}
                  </span>
                  <span className="card-date">
                    {new Date(school.created_at).toLocaleDateString("ar-SA", {
                      year: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>

              <div className="card-name">{school.name}</div>
              {school.description && (
                <div className="card-desc">{school.description}</div>
              )}

              <div className="card-admin">
                <svg
                  width="11"
                  height="11"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {school.admin ? (
                  <span className="card-admin-name">
                    {school.admin.full_name}
                  </span>
                ) : (
                  <span className="card-no-admin">لم يُعيَّن مدير</span>
                )}
              </div>

              <div className="card-rule" />

              <div className="card-stats">
                {[
                  { val: school._count?.teachers ?? 0, lab: "الجهة" },
                  { val: school._count?.students ?? 0, lab: "مستفيد" },
                  { val: school._count?.classes ?? 0, lab: "فصل" },
                ].map((s, i) => (
                  <div key={i} className="stat">
                    <span className="stat-val">{s.val}</span>
                    <span className="stat-lab">{s.lab}</span>
                  </div>
                ))}
              </div>

              {/* Active/inactive badge */}
              <div className="card-status-row">
                <span className={`card-status-badge ${school.is_active ? "active" : "inactive"}`}>
                  {school.is_active ? "نشطة" : "معطّلة"}
                </span>
                <div className="card-status-actions">
                  <button
                    className={`btn-toggle ${school.is_active ? "deactivate" : "activate"}`}
                    onClick={() => handleToggleActive(school.id, school.is_active)}
                    disabled={toggling === school.id}
                    title={school.is_active ? "تعطيل الجهة" : "تفعيل الجهة"}
                  >
                    {toggling === school.id ? "..." : school.is_active ? "تعطيل" : "تفعيل"}
                  </button>
                  {confirmDelete === school.id ? (
                    <span className="confirm-delete-row">
                      <button className="btn-delete-confirm" onClick={() => handleDelete(school.id)} disabled={deleting === school.id}>
                        {deleting === school.id ? "..." : "تأكيد الحذف"}
                      </button>
                      <button className="btn-delete-cancel" onClick={() => setConfirmDelete(null)}>إلغاء</button>
                    </span>
                  ) : (
                    <button className="btn-delete" onClick={() => setConfirmDelete(school.id)} title="حذف الجهة">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="card-actions">
                <Link
                  href={`/owner/schools/${school.id}`}
                  className="btn-manage"
                >
                  إدارة الجهة
                </Link>
                <a
                  href={`/schools/${school.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-view"
                >
                  <svg
                    width="11"
                    height="11"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  الصفحة العامة
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');

  :root {
    --gold: #C8A96A;
    --gold2: #E5B93C;
    --gold-muted: rgba(200,169,106,0.08);
    --gold-muted2: rgba(200,169,106,0.15);
    --gold-border: rgba(200,169,106,0.18);
    --black: #0B0B0C;
    --off-white: #F5F3EE;
    --cream: #EDE9E0;
    --text: #1a1208;
    --text2: #4a3f2a;
    --text3: #8a7a5a;
    --surface: #ffffff;
    --surface2: #FAF8F4;
    --surface3: #F5F0E8;
    --border: #E4DDD0;
    --border2: #D4C9B5;
    --danger: #8b1a1a;
    --radius: 12px;
    --shadow-sm: 0 1px 4px rgba(11,11,12,0.05), 0 0 0 1px rgba(200,169,106,0.06);
    --shadow: 0 4px 16px rgba(11,11,12,0.07), 0 0 0 1px rgba(200,169,106,0.08);
    --shadow-lg: 0 12px 40px rgba(11,11,12,0.10), 0 0 0 1px rgba(200,169,106,0.10);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }

  .pg {
    display: flex; flex-direction: column; gap: 28px;
    font-family: 'Cairo', sans-serif;
    background: var(--off-white);
    min-height: 100vh;
    padding: 36px 40px 120px;
    position: relative;
  }

  /* ── Page header ── */
  .pg-head {
    display: flex; align-items: flex-end; justify-content: space-between;
    flex-wrap: wrap; gap: 16px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
    position: relative;
  }
  .pg-head-left { display: flex; align-items: center; gap: 16px; }
  .pg-rule { width: 3px; height: 48px; background: linear-gradient(180deg, var(--gold), var(--gold2)); border-radius: 99px; flex-shrink: 0; }
  .pg-eyebrow { font-size: 10px; font-weight: 700; color: var(--gold); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; }
  .pg-title { font-size: 26px; font-weight: 900; color: var(--black); letter-spacing: -0.8px; }

  /* ── Buttons ── */
  .btn-create {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 22px;
    background: var(--black); color: var(--gold);
    border: 1px solid rgba(200,169,106,0.25);
    border-radius: 9px; font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: 'Cairo', sans-serif;
    transition: all 0.2s; white-space: nowrap; letter-spacing: 0.1px;
  }
  .btn-create:hover:not(:disabled) { background: #1a1208; border-color: var(--gold); box-shadow: 0 4px 20px rgba(200,169,106,0.2); }
  .btn-create:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-cancel {
    display: inline-flex; align-items: center; padding: 11px 22px;
    background: none; border: 1px solid var(--border2);
    border-radius: 9px; font-size: 13px; font-weight: 600;
    color: var(--text3); cursor: pointer; font-family: 'Cairo', sans-serif;
    transition: all 0.15s;
  }
  .btn-cancel:hover { border-color: var(--border); color: var(--text2); }

  /* ── Create panel ── */
  .create-panel {
    background: var(--surface);
    border: 1px solid var(--gold-border);
    border-radius: 16px; padding: 28px 32px;
    display: flex; flex-direction: column; gap: 22px;
    box-shadow: var(--shadow-lg);
    animation: slideDown 0.22s ease;
    position: relative; overflow: hidden;
  }
  .create-panel::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--gold), var(--gold2), var(--gold));
  }
  .create-panel-header { display: flex; flex-direction: column; gap: 4px; }
  .create-panel-title { font-size: 16px; font-weight: 800; color: var(--black); }
  .create-panel-sub { font-size: 12.5px; color: var(--text3); font-weight: 500; }

  .create-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .cf { display: flex; flex-direction: column; gap: 7px; }
  .cf-full { grid-column: 1 / -1; }
  .cf-label { font-size: 11px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.6px; }
  .cf-req { color: var(--gold); }
  .cf-input {
    background: var(--surface2); border: 1px solid var(--border2);
    color: var(--text); border-radius: 8px; padding: 10px 13px;
    font-size: 13.5px; font-family: 'Cairo', sans-serif; outline: none; width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .cf-input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(200,169,106,0.1); background: var(--surface); }
  .cf-select {
    background: var(--surface2); border: 1px solid var(--border2);
    color: var(--text); border-radius: 8px; padding: 10px 13px;
    font-size: 13.5px; font-family: 'Cairo', sans-serif; outline: none; width: 100%; cursor: pointer;
  }
  .cf-select:focus { border-color: var(--gold); }
  .cf-slug { display: flex; align-items: center; border: 1px solid var(--border2); border-radius: 8px; overflow: hidden; background: var(--surface2); }
  .cf-slug-pre { padding: 10px 11px; background: var(--surface3); color: var(--text3); font-size: 12px; font-family: monospace; border-left: 1px solid var(--border2); white-space: nowrap; }
  .cf-slug-inp { border: none!important; box-shadow: none!important; background: transparent!important; flex: 1; }

  /* Theme presets */
  .theme-presets { display: flex; gap: 8px; flex-wrap: wrap; }
  .theme-preset {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 13px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--surface2);
    cursor: pointer; font-size: 12px; font-weight: 600;
    color: var(--text2); font-family: 'Cairo', sans-serif;
    transition: all 0.15s;
  }
  .theme-preset:hover { border-color: var(--gold-border); background: var(--gold-muted); }
  .theme-preset.active { border-color: var(--gold); background: var(--gold-muted2); color: var(--black); font-weight: 700; }
  .theme-dots { display: flex; gap: 3px; }
  .theme-dots span { width: 11px; height: 11px; border-radius: 50%; border: 1.5px solid rgba(0,0,0,0.1); display: block; }

  .create-error { font-size: 12.5px; color: var(--danger); background: rgba(139,26,26,0.06); border: 1px solid rgba(139,26,26,0.15); padding: 10px 14px; border-radius: 8px; }
  .create-actions { display: flex; gap: 10px; align-items: center; padding-top: 4px; border-top: 1px solid var(--border); }

  /* ── Summary ── */
  .summary {
    display: grid; grid-template-columns: repeat(3, 1fr);
    border: 1px solid var(--border); border-radius: var(--radius);
    overflow: hidden; background: var(--surface);
    box-shadow: var(--shadow-sm);
  }
  .summary-item {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 20px 16px; gap: 4px;
    border-left: 1px solid var(--border); position: relative;
  }
  .summary-item:last-child { border-left: none; }
  .summary-item::after {
    content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 32px; height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .summary-item:hover::after { opacity: 1; }
  .summary-icon { font-size: 16px; margin-bottom: 2px; }
  .summary-num { font-size: 28px; font-weight: 900; color: var(--gold); font-family: 'IBM Plex Mono', monospace; letter-spacing: -1px; line-height: 1; }
  .summary-lab { font-size: 11px; color: var(--text3); font-weight: 600; letter-spacing: 0.2px; }

  /* ── Search ── */
  .search-wrap { position: relative; display: flex; align-items: center; }
  .search-ico { position: absolute; right: 14px; color: var(--text3); pointer-events: none; }
  .search-inp {
    width: 100%; background: var(--surface);
    border: 1px solid var(--border2); border-radius: 10px;
    padding: 11px 42px 11px 16px;
    font-size: 13.5px; font-family: 'Cairo', sans-serif; color: var(--text);
    outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    box-shadow: var(--shadow-sm);
  }
  .search-inp:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(200,169,106,0.1); }
  .search-inp::placeholder { color: var(--text3); }


  .empty-ring { opacity: 0.6; }

  /* ── School cards grid ── */
  .schools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .school-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0;
    display: flex; flex-direction: column;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
    animation: fadeUp 0.3s ease both;
    overflow: hidden; position: relative;
  }
  .school-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
    border-color: rgba(200,169,106,0.3);
  }

  .card-accent { height: 2px; width: 100%; flex-shrink: 0; }

  .card-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 20px 12px;
  }
  .card-swatch {
    width: 44px; height: 44px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .card-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
  .card-lang {
    font-size: 10px; font-weight: 700; color: var(--gold);
    background: var(--gold-muted); border: 1px solid var(--gold-border);
    padding: 2px 8px; border-radius: 99px; white-space: nowrap;
  }
  .card-date { font-size: 10px; color: var(--text3); font-weight: 500; }

  .card-name { font-size: 16px; font-weight: 800; color: var(--black); line-height: 1.3; padding: 0 20px 6px; }
  .card-desc { font-size: 12px; color: var(--text3); line-height: 1.65; padding: 0 20px 8px; }
  .card-admin {
    display: flex; align-items: center; gap: 7px;
    padding: 0 20px 16px; font-size: 12.5px; color: var(--text3);
  }
  .card-admin-name { font-weight: 700; color: var(--text2); }
  .card-no-admin { color: var(--danger); font-style: italic; font-weight: 600; font-size: 12px; }

  .card-rule { height: 1px; background: var(--border); margin: 0 20px; }

  .card-stats {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px;
  }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
  .stat-val { font-size: 18px; font-weight: 900; color: var(--black); font-family: 'IBM Plex Mono', monospace; letter-spacing: -0.5px; }
  .stat-lab { font-size: 10px; color: var(--text3); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }

  .card-actions {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 20px 18px; gap: 8px;
  }
  .btn-manage {
    display: inline-flex; align-items: center; padding: 8px 16px;
    background: var(--black); color: var(--gold);
    border: 1px solid rgba(200,169,106,0.2);
    border-radius: 8px; font-size: 12.5px; font-weight: 700;
    text-decoration: none; transition: all 0.15s;
    font-family: 'Cairo', sans-serif;
  }
  .btn-manage:hover { border-color: var(--gold); box-shadow: 0 2px 12px rgba(200,169,106,0.2); }
  .btn-view {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11.5px; font-weight: 600; color: var(--text3);
    text-decoration: none; transition: color 0.15s;
    font-family: 'Cairo', sans-serif;
  }
  .btn-view:hover { color: var(--gold); }

  /* ── Status & actions ── */
  .card-status-row { display: flex; align-items: center; justify-content: space-between; padding: 0 20px 12px; gap: 8px; }
  .card-status-badge { font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 99px; }
  .card-status-badge.active { background: rgba(45,138,74,0.10); color: #2D8A4A; border: 1px solid rgba(45,138,74,0.20); }
  .card-status-badge.inactive { background: rgba(139,26,26,0.08); color: #8b1a1a; border: 1px solid rgba(139,26,26,0.18); }
  .card-status-actions { display: flex; align-items: center; gap: 6px; }
  .btn-toggle {
    font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 7px;
    cursor: pointer; font-family: 'Cairo', sans-serif; border: 1px solid;
    transition: all 0.15s;
  }
  .btn-toggle:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-toggle.deactivate { background: rgba(139,26,26,0.07); color: #8b1a1a; border-color: rgba(139,26,26,0.20); }
  .btn-toggle.deactivate:hover:not(:disabled) { background: rgba(139,26,26,0.14); }
  .btn-toggle.activate { background: rgba(45,138,74,0.08); color: #2D8A4A; border-color: rgba(45,138,74,0.20); }
  .btn-toggle.activate:hover:not(:disabled) { background: rgba(45,138,74,0.15); }
  .btn-delete {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 7px;
    background: rgba(139,26,26,0.06); border: 1px solid rgba(139,26,26,0.15);
    color: #8b1a1a; cursor: pointer; transition: all 0.15s;
  }
  .btn-delete:hover { background: rgba(139,26,26,0.14); }
  .confirm-delete-row { display: flex; align-items: center; gap: 4px; }
  .btn-delete-confirm {
    font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 7px;
    background: #8b1a1a; color: #fff; border: none; cursor: pointer;
    font-family: 'Cairo', sans-serif; transition: opacity 0.15s;
  }
  .btn-delete-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-delete-cancel {
    font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 7px;
    background: none; border: 1px solid var(--border2); color: var(--text3);
    cursor: pointer; font-family: 'Cairo', sans-serif;
  }

  /* Inactive card style */
  .school-card.inactive-card { opacity: 0.70; }
  .school-card.inactive-card .card-accent { opacity: 0.4; }

  /* ── Mobile responsive ── */
  @media (max-width: 768px) {
    .pg { padding: 20px 16px 80px; gap: 20px; }
    .pg-head { flex-direction: column; align-items: stretch; gap: 12px; }
    .pg-title { font-size: 22px; }
    .btn-create { width: 100%; justify-content: center; }
    .create-panel { padding: 20px 16px; }
    .create-grid { grid-template-columns: 1fr; }
    .cf-full { grid-column: 1; }
    .summary { grid-template-columns: 1fr; }
    .summary-item { padding: 14px; flex-direction: row; gap: 10px; border-left: none; border-bottom: 1px solid var(--border); }
    .summary-item:last-child { border-bottom: none; }
    .summary-num { font-size: 22px; }
    .schools-grid { grid-template-columns: 1fr; }
    .card-actions { flex-direction: column; }
    .btn-manage { width: 100%; justify-content: center; text-align: center; }
    .theme-presets { gap: 6px; }
    .theme-preset { padding: 5px 10px; font-size: 11px; }
  }
  @media (max-width: 480px) {
    .pg { padding: 16px 12px 60px; }
    .pg-title { font-size: 20px; }
    .pg-eyebrow { font-size: 9px; letter-spacing: 1.5px; }
    .card-head { padding: 14px 14px 10px; }
    .card-name { padding: 0 14px 4px; font-size: 15px; }
    .card-desc { padding: 0 14px 6px; }
    .card-admin { padding: 0 14px 12px; }
    .card-rule { margin: 0 14px; }
    .card-stats { padding: 12px 14px; }
    .card-actions { padding: 10px 14px 14px; }
    .stat-val { font-size: 16px; }
  }
`;
