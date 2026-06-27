// ============================================================
// FILE 1: school-admin/teachers/page.tsx
// ============================================================
"use client";
export const dynamic = "force-dynamic";
import { cachedFetch } from "@/lib/api-cache";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";
import { useConfirm } from "@/lib/confirm-dialog";

interface Teacher {
  id: string;
  profile: { full_name: string; is_active: boolean };
  classes: { id: string; name: string }[];
}

export function SchoolAdminTeachersPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const confirm = useConfirm();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState("");

  useEffect(() => {
    fetch("/api/school-admin/teachers")
      .then((r) => r.json())
      .then((d) => setTeachers(d.teachers ?? []))
      .finally(() => setLoading(false));
  }, []);

  const toggleTeacher = async (teacherId: string, currentActive: boolean) => {
    if (currentActive) {
      const ok = await confirm({
        title: lang === "ar" ? "تعطيل المعلم" : lang === "sq" ? "Çaktivizo mësuesin" : "Deactivate teacher",
        message: lang === "ar"
          ? "سيتم تعطيل وصول هذا المعلم إلى لوحته فوراً. لن يتمكن من الدخول حتى تعيد تفعيله."
          : lang === "sq"
            ? "Ky mësues do të humbasë qasjen menjëherë. Nuk do të mund të hyjë derisa ta riaktivizoni."
            : "This teacher will lose access immediately. They won't be able to log in until you reactivate them.",
        variant: "warning",
        confirmText: lang === "ar" ? "تعطيل" : lang === "sq" ? "Çaktivizo" : "Deactivate",
        irreversible: false,
      });
      if (!ok) return;
    }
    setToggling(teacherId);
    setToggleError("");
    try {
      const r = await fetch(`/api/school-admin/teachers/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      const d = await r.json();
      if (!r.ok) { setToggleError(d.error ?? "حدث خطأ"); return; }
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId
            ? { ...t, profile: { ...t.profile, is_active: !currentActive } }
            : t,
        ),
      );
    } catch {
      setToggleError(lang === "ar" ? "تعذر الاتصال بالخادم" : "Gabim lidhje");
    } finally {
      setToggling(null);
    }
  };
  return (
    <div className="te-page" dir={dir}>
      {/* Header */}
      <div className="te-header">
        <div>
          <p className="te-eyebrow">
            {lang === "ar" ? "إدارة الكوادر" : "Menaxhimi"}
          </p>
          <h1 className="te-title">{tr.teachers}</h1>
          <p className="te-sub">
            {teachers.length} {tr.teachersInYourSchool}
          </p>
        </div>
      </div>

      {/* Rule */}
      <div className="te-rule">
        <div className="te-rule-line" />
        <div className="te-rule-diamond" />
        <div className="te-rule-line" />
      </div>

      {toggleError && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(139,26,26,0.06)", border: "1px solid rgba(139,26,26,0.18)",
          color: "#8b1a1a", fontSize: 13, padding: "10px 14px", borderRadius: 9, fontWeight: 600,
        }}>
          {toggleError}
        </div>
      )}

      {loading ? (
        <MandalaLoader label={tr.loading} />
      ) : teachers.length === 0 ? (
        <div className="te-empty">
          <div className="te-empty-icon">
            <svg
              width="28"
              height="28"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <p>{tr.noTeachers}</p>
        </div>
      ) : (
        <div className="te-list">
          {teachers.map((teacher, i) => (
            <div
              key={teacher.id}
              className="te-row"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Avatar */}
              <div className="te-av">{teacher.profile.full_name.charAt(0)}</div>

              {/* Info */}
              <div className="te-body">
                <div className="te-name">{teacher.profile.full_name}</div>
                <div className="te-classes">
                  {teacher.classes.length > 0 ? (
                    <>
                      <span className="te-prefix">{lang === "ar" ? "الفصل:" : "Class:"}</span>{" "}
                      {teacher.classes.map((c) => c.name).join(" · ")}
                    </>
                  ) : (
                    <span className="te-no-class">{tr.noAssignedClasses}</span>
                  )}
                </div>
                {!teacher.profile.is_active && (
                  <div className="te-inactive-label">
                    {lang === "ar" ? "معطّل" : "Çaktivizuar"}
                  </div>
                )}
              </div>

              {/* Class count badge */}
              <div className="te-badge-wrap">
                <div className="te-badge">
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                  </svg>
                  <span>{teacher.classes.length}</span>
                  <span className="te-badge-label">{tr.classCountLabel}</span>
                </div>
              </div>

              {/* Activate / Deactivate toggle */}
              <button
                data-write="true"
                className={`te-toggle ${teacher.profile.is_active ? "te-toggle--off" : "te-toggle--on"}`}
                onClick={() => toggleTeacher(teacher.id, teacher.profile.is_active)}
                disabled={toggling === teacher.id}
                title={teacher.profile.is_active
                  ? (lang === "ar" ? "تعطيل المعلم" : "Çaktivizo")
                  : (lang === "ar" ? "تفعيل المعلم" : "Aktivizo")}
              >
                {toggling === teacher.id ? (
                  <span className="te-spin" />
                ) : teacher.profile.is_active ? (
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
                  </svg>
                ) : (
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v8m-4-4h8" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }

        :root {
          --gold: #C8A96A;
          --gold-pale: rgba(200,169,106,0.07);
          --gold-border: rgba(200,169,106,0.18);
          --black: #0B0B0C;
          --off-white: #F5F3EE;
          --text: #0B0B0C;
          --text2: #3D3526;
          --text3: #8A7B60;
          --surface: #FFFFFF;
          --border: #E4DDD0;
          --font: 'Cairo', sans-serif;
        }

        .te-page {
          display: flex; flex-direction: column; gap: 20px;
          font-family: var(--font);
          animation: fadeUp 0.3s ease;
        }

        .te-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .te-eyebrow {
          font-size: 10px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase;
          color: var(--gold); margin-bottom: 4px;
        }
        .te-title { font-size: 24px; font-weight: 900; color: var(--black); letter-spacing: -0.4px; }
        .te-sub { font-size: 12.5px; color: var(--text3); margin-top: 3px; font-weight: 500; }

        .te-rule { display: flex; align-items: center; gap: 10px; }
        .te-rule-line { flex: 1; height: 1px; background: var(--border); }
        .te-rule-diamond { width: 5px; height: 5px; background: var(--gold); transform: rotate(45deg); opacity: 0.45; flex-shrink: 0; }

        .te-empty {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          padding: 64px 20px; color: var(--text3); font-size: 13px; font-weight: 500;
        }
        .te-empty-icon {
          width: 60px; height: 60px; border-radius: 13px;
          background: var(--surface); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--gold); opacity: 0.6;
        }

        .te-list { display: flex; flex-direction: column; gap: 6px; }
        .te-row {
          display: flex; align-items: center; gap: 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 14px 18px;
          transition: border-color 0.15s, box-shadow 0.15s;
          animation: fadeUp 0.4s ease both;
          position: relative;
          overflow: hidden;
        }
        /* Gold left accent on hover */
        .te-row::before {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          inset-inline-start: 0;
          width: 2px;
          background: var(--gold);
          opacity: 0;
          transition: opacity 0.15s;
        }
        .te-row:hover { border-color: rgba(200,169,106,0.32); box-shadow: 0 2px 12px rgba(200,169,106,0.07); }
        .te-row:hover::before { opacity: 0.7; }

        .te-av {
          width: 40px; height: 40px; border-radius: 8px;
          background: var(--black);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 900;
          color: var(--gold);
          flex-shrink: 0;
        }

        .te-body { flex: 1; min-width: 0; }
        .te-name { font-size: 13.5px; font-weight: 800; color: var(--text); }
        .te-classes {
          font-size: 11.5px; color: var(--text3); margin-top: 3px;
          font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .te-no-class { color: var(--border); font-style: italic; }
        .te-prefix { color: var(--gold-deep, #B89B5E); font-weight: 700; }

        .te-badge-wrap { flex-shrink: 0; }
        .te-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: var(--off-white);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 12px; font-weight: 700; color: var(--text2);
        }
        .te-badge svg { color: var(--gold); }
        .te-badge-label { color: var(--text3); font-weight: 500; }

        .te-inactive-label {
          font-size: 11px; font-weight: 800; color: #8b1a1a;
          background: rgba(139,26,26,0.08); border: 1px solid rgba(139,26,26,0.18);
          border-radius: 6px; padding: 2px 8px; display: inline-block; margin-top: 4px;
        }

        .te-toggle {
          flex-shrink: 0; width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; border: 1px solid; transition: all 0.18s;
        }
        .te-toggle:disabled { opacity: 0.4; cursor: not-allowed; }
        .te-toggle--off { background: rgba(139,26,26,0.07); border-color: rgba(139,26,26,0.22); color: #8b1a1a; }
        .te-toggle--off:hover:not(:disabled) { background: rgba(139,26,26,0.14); }
        .te-toggle--on { background: rgba(45,138,74,0.08); border-color: rgba(45,138,74,0.22); color: #2D8A4A; }
        .te-toggle--on:hover:not(:disabled) { background: rgba(45,138,74,0.15); }
        .te-spin { display: inline-block; width: 11px; height: 11px; border: 2px solid rgba(200,169,106,0.2); border-top-color: var(--gold); border-radius: 50%; animation: fadeUp 0.7s linear infinite; }

        @media (max-width: 600px) {
          .te-page { gap: 14px; }
          .te-title { font-size: 20px; }
          .te-sub { font-size: 12px; }
          .te-row { padding: 12px 14px; gap: 10px; flex-wrap: wrap; }
          .te-av { width: 36px; height: 36px; font-size: 14px; }
          .te-body { flex: 1 1 calc(100% - 100px); min-width: 0; }
          .te-name { font-size: 13px; }
          .te-classes { font-size: 11px; }
          .te-badge-label { display: none; }
          .te-badge { padding: 4px 8px; }
          .te-empty { padding: 48px 16px; }
        }
        @media (max-width: 400px) {
          .te-row { padding: 10px 12px; gap: 8px; }
          .te-av { width: 34px; height: 34px; }
          .te-toggle { width: 30px; height: 30px; }
        }
      `}</style>
    </div>
  );
}

export default SchoolAdminTeachersPage;

// ============================================================
// FILE 2:
