/* eslint-disable react-hooks/set-state-in-effect */
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import { useConfirm } from "@/lib/confirm-dialog";

interface ClassItem {
  id: string;
  name: string;
  teacher: { profile: { full_name: string } } | null;
  _count: { students: number };
}
interface Teacher {
  id: string;
  profile: { full_name: string };
}

export default function SchoolAdminClassesPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const confirm = useConfirm();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [cData, tData] = await Promise.all([
      cachedFetch<{ classes: ClassItem[] }>(
        "/api/school-admin/classes",
        60_000,
      ),
      cachedFetch<{ teachers: Teacher[] }>(
        "/api/school-admin/teachers",
        60_000,
      ),
    ]);
    setClasses(cData.classes ?? []);
    setTeachers(tData.teachers ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!newName.trim()) {
      setError(tr.enterClassName);
      return;
    }
    setCreating(true);
    setError("");
    const r = await fetch("/api/school-admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error ?? tr.failedCreate);
    } else {
      invalidateCache("/api/school-admin/classes");
      setNewName("");
      load();
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ message: tr.deleteClassConfirm }))) return;
    await fetch(`/api/school-admin/classes/${id}`, { method: "DELETE" });
    invalidateCache("/api/school-admin/classes");
    load();
  }

  async function handleAssignTeacher(classId: string, teacherId: string) {
    await fetch(`/api/school-admin/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacher_id: teacherId || null }),
    });
    invalidateCache("/api/school-admin/classes");
    load();
  }

  if (loading) return <MandalaLoader label={tr.loading} />;

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div className="cl-page" dir={dir}>
      <div className="cl-header">
        <div>
          <p className="cl-eyebrow">{lang === "ar" ? "إدارة" : "Menaxhimi"}</p>
          <h1 className="cl-title">{tr.classes}</h1>
          <p className="cl-sub">
            {classes.length} {tr.classesInYourSchool}
          </p>
        </div>
      </div>

      <div className="cl-rule">
        <div className="cl-rule-line" />
        <div className="cl-rule-diamond" />
        <div className="cl-rule-line" />
      </div>

      <div className="create-section">
        <p className="create-label">
          {lang === "ar" ? "إضافة فصل جديد" : "Shto klasë të re"}
        </p>
        <div className="create-row" data-write-area="true">
          <input
            className="cl-input"
            placeholder={tr.newClassName}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            dir={dir}
          />
          <button data-write="true" className="cl-btn" onClick={handleCreate} disabled={creating}>
            {creating ? (
              <>
                <div className="btn-spin" /> {tr.creating}
              </>
            ) : (
              <>
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
                {tr.createClass}
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="cl-error">
            <svg
              width="12"
              height="12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {classes.length === 0 ? (
        <div className="cl-empty">
          <div className="cl-empty-icon">
            <svg
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </div>
          <p>{tr.noClassesYet}</p>
        </div>
      ) : (
        <div className="cl-grid">
          {classes.map((cls, i) => (
            <div
              key={cls.id}
              className="cl-card"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="cl-card-accent" />
              <div className="cl-card-head">
                <div className="cl-card-icon">
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                  </svg>
                </div>
                <div className="cl-card-body">
                  <div className="cl-name">{cls.name}</div>
                  <div className="cl-count">
                    <svg
                      width="10"
                      height="10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    {cls._count.students} {tr.studentCount}
                  </div>
                </div>
                <button
                  data-write="true"
                  className="delete-btn"
                  onClick={() => handleDelete(cls.id)}
                  title={tr.deleteClassConfirm}
                >
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
              <div className="cl-divider" />
              <div className="cl-teacher-row">
                <span className="cl-teacher-label">{tr.teacherLabel}</span>
                <select
                  className="cl-select"
                  dir={dir}
                  value={
                    cls.teacher
                      ? (teachers.find(
                          (t) =>
                            t.profile.full_name ===
                            cls.teacher?.profile.full_name,
                        )?.id ?? "")
                      : ""
                  }
                  onChange={(e) => handleAssignTeacher(cls.id, e.target.value)}
                >
                  <option value="">{tr.withoutTeacher}</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.profile.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sp{to{transform:rotate(360deg)}}
        :root{--gold:#C8A96A;--gold-pale:rgba(200,169,106,0.07);--gold-border:rgba(200,169,106,0.18);--black:#0B0B0C;--off-white:#F5F3EE;--text:#0B0B0C;--text2:#3D3526;--text3:#8A7B60;--surface:#FFFFFF;--border:#E4DDD0;--border2:#D4CAB8;--font:'Cairo',sans-serif}
        .cl-page{display:flex;flex-direction:column;gap:20px;font-family:var(--font);animation:fadeUp 0.3s ease}
        .cl-header{display:flex;align-items:flex-start;justify-content:space-between}
        .cl-eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:4px}
        .cl-title{font-size:24px;font-weight:900;color:var(--black);letter-spacing:-0.4px}
        .cl-sub{font-size:12.5px;color:var(--text3);margin-top:3px;font-weight:500}
        .cl-rule{display:flex;align-items:center;gap:10px}
        .cl-rule-line{flex:1;height:1px;background:var(--border)}
        .cl-rule-diamond{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);opacity:0.45;flex-shrink:0}
        .create-section{display:flex;flex-direction:column;gap:8px}
        .create-label{font-size:11px;font-weight:700;color:var(--text3);letter-spacing:0.5px;text-transform:uppercase}
        .create-row{display:flex;gap:10px}
        .cl-input{flex:1;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:var(--font);color:var(--text);outline:none;transition:border-color 0.15s}
        .cl-input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,169,106,0.1)}
        .cl-btn{display:inline-flex;align-items:center;gap:7px;background:var(--black);color:var(--gold);padding:10px 20px;border:none;border-radius:7px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:var(--font);white-space:nowrap;transition:background 0.15s}
        .cl-btn:hover:not(:disabled){background:#1A1A1E}
        .cl-btn:disabled{opacity:0.5;cursor:not-allowed}
        .btn-spin{width:12px;height:12px;border:2px solid rgba(200,169,106,0.2);border-top-color:var(--gold);border-radius:50%;animation:sp 0.7s linear infinite}
        .cl-error{display:flex;align-items:center;gap:6px;font-size:12px;color:#8B2020;background:rgba(180,40,40,0.05);border:1px solid rgba(180,40,40,0.15);padding:8px 12px;border-radius:6px}
        .cl-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:64px 20px;color:var(--text3);font-size:13px;font-weight:500}
        .cl-empty-icon{width:64px;height:64px;border-radius:14px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--gold);opacity:0.6}
        .cl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
        .cl-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:13px;position:relative;overflow:hidden;transition:border-color 0.15s,box-shadow 0.15s;animation:fadeUp 0.4s ease both}
        .cl-card:hover{border-color:rgba(200,169,106,0.35);box-shadow:0 4px 16px rgba(200,169,106,0.08)}
        .cl-card-accent{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(200,169,106,0.3) 50%,transparent)}
        .cl-card-head{display:flex;align-items:center;gap:11px}
        .cl-card-icon{width:38px;height:38px;border-radius:8px;background:var(--black);display:flex;align-items:center;justify-content:center;color:var(--gold);flex-shrink:0}
        .cl-card-body{flex:1}
        .cl-name{font-size:14px;font-weight:800;color:var(--text)}
        .cl-count{display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--text3);margin-top:2px;font-weight:500}
        .delete-btn{background:none;border:1px solid var(--border);color:var(--text3);width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;flex-shrink:0}
        .delete-btn:hover{border-color:#C0392B;color:#C0392B;background:rgba(192,57,43,0.05)}
        .cl-divider{height:1px;background:var(--border)}
        .cl-teacher-row{display:flex;align-items:center;gap:10px}
        .cl-teacher-label{font-size:11px;color:var(--text3);font-weight:700;white-space:nowrap;text-transform:uppercase;letter-spacing:0.5px}
        .cl-select{flex:1;background:var(--off-white);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:7px 10px;font-size:12px;font-family:var(--font);outline:none;cursor:pointer;transition:border-color 0.15s}
        .cl-select:focus{border-color:var(--gold)}
        @media(max-width:700px){
          .cl-grid{grid-template-columns:1fr; gap:10px}
          .create-row{flex-direction:column; gap:10px}
          .create-row input, .create-row button{width:100%}
        }
        @media(max-width:420px){
          .cl-teacher-row{flex-wrap:wrap; gap:6px}
          .cl-teacher-label{flex-basis:100%}
        }
      `}</style>
    </div>
  );
}
