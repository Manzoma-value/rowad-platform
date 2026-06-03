"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";
import { cachedFetch } from "@/lib/api-cache";

type Announcement = {
  id: string;
  content: string;
  created_at: string;
  teacher: { profile: { full_name: string } };
};

type StudentData = {
  profile: { full_name: string };
  class: {
    id: string;
    name: string;
    teacher: { profile: { full_name: string } } | null;
    students: { id: string; profile: { full_name: string } }[];
  } | null;
};

export default function StudentClassPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [data, setData] = useState<StudentData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    cachedFetch<StudentData>("/api/student", 60_000).then(async (d) => {
      setData(d);
      if (d.class) {
        const ann = await cachedFetch<Announcement[]>(
          `/api/student/announcements?classId=${d.class.id}`,
          30_000,
        );
        setAnnouncements(ann);
      }
    });
  }, []);

  if (!data) return <MandalaLoader label={tr.loading} />;

  if (!data.class) {
    return (
      <div className="cls-shell" dir={dir}>
        <div className="cls-empty-wrap">
          <div className="cls-empty-icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
            </svg>
          </div>
          <p className="cls-empty-text">{tr.noClass}</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="cls-shell" dir={dir}>

      {/* ── Header banner ── */}
      <div className="cls-header">
        <div className="cls-header-left">
          <p className="cls-eyebrow">{lang === "ar" ? "الفصل الدراسي" : "Klasa"}</p>
          <h1 className="cls-title">{data.class.name}</h1>
          <div className="cls-chips">
            {data.class.teacher ? (
              <span className="cls-chip">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {tr.yourTeacher}: {data.class.teacher.profile.full_name}
              </span>
            ) : (
              <span className="cls-chip muted">{tr.withoutTeacher}</span>
            )}
            <span className="cls-chip">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              {data.class.students.length} {tr.classmates ?? "طالب"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className="cls-grid">

        {/* Classmates */}
        <div className="cls-panel">
          <div className="cls-panel-head">
            <div className="cls-panel-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <span className="cls-panel-title">{tr.classmates}</span>
            <span className="cls-count">{data.class.students.length}</span>
          </div>
          <div className="cls-roster">
            {data.class.students.map((s) => {
              const isMe = s.profile.full_name === data.profile.full_name;
              return (
                <div key={s.id} className={`cls-row ${isMe ? "is-me" : ""}`}>
                  <div className="cls-av">{s.profile.full_name.charAt(0)}</div>
                  <span className="cls-row-name">{s.profile.full_name}</span>
                  {isMe && <span className="cls-you">{tr.youBadge ?? "أنت"}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Announcements */}
        <div className="cls-panel">
          <div className="cls-panel-head">
            <div className="cls-panel-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <span className="cls-panel-title">{tr.classAnnouncements}</span>
            {announcements.length > 0 && <span className="cls-count">{announcements.length}</span>}
          </div>

          {announcements.length === 0 ? (
            <div className="cls-void">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span>{tr.noAnnouncements}</span>
            </div>
          ) : (
            <div className="cls-ann-list">
              {announcements.map((a) => (
                <div key={a.id} className="cls-ann-item">
                  <div className="cls-ann-bar" />
                  <div className="cls-ann-body">
                    <p className="cls-ann-text">{a.content}</p>
                    <div className="cls-ann-meta">
                      <span className="cls-ann-author">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        {a.teacher.profile.full_name}
                      </span>
                      <span className="cls-ann-date">
                        {new Date(a.created_at).toLocaleDateString(lang === "ar" ? "ar" : "sq")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

  .cls-shell{min-height:100%;background:#F6F4EE;font-family:'Cairo',Tajawal,sans-serif;padding:28px 24px;display:flex;flex-direction:column;gap:18px}

  /* Empty */
  .cls-empty-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#FFFDF8;border:1px solid rgba(200,169,106,0.15);border-radius:18px;padding:56px;text-align:center}
  .cls-empty-icon{color:rgba(200,169,106,0.35)}
  .cls-empty-text{font-size:14px;color:#9A8A70}

  /* Header */
  .cls-header{
    background:#0B0B0C;border-radius:22px;padding:24px 30px;
    position:relative;overflow:hidden;border:1px solid rgba(200,169,106,0.1);
    animation:fadeUp 0.42s ease both;
  }
  .cls-header::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#C8A96A 30%,#E5B93C 60%,transparent)}
  .cls-header::after{content:'';position:absolute;bottom:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(200,169,106,0.06),transparent 70%);pointer-events:none}
  .cls-header-left{position:relative;z-index:1}
  .cls-eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(200,169,106,0.55);margin-bottom:6px}
  .cls-title{font-size:24px;font-weight:900;color:#FFFFFF;letter-spacing:-0.3px;margin-bottom:12px}
  .cls-chips{display:flex;gap:8px;flex-wrap:wrap}
  .cls-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(200,169,106,0.1);border:1px solid rgba(200,169,106,0.2);color:rgba(200,169,106,0.88);font-size:11.5px;font-weight:600;padding:5px 12px;border-radius:99px}
  .cls-chip.muted{color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.07)}

  /* Grid */
  .cls-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}

  /* Panel */
  .cls-panel{background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);border-radius:18px;overflow:hidden;animation:fadeUp 0.42s ease both;animation-delay:0.06s}
  .cls-panel-head{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(200,169,106,0.09);background:rgba(200,169,106,0.03)}
  .cls-panel-icon{width:30px;height:30px;border-radius:8px;flex-shrink:0;background:#0B0B0C;border:1px solid rgba(200,169,106,0.18);display:flex;align-items:center;justify-content:center;color:#C8A96A}
  .cls-panel-title{font-size:13.5px;font-weight:800;color:#0B0B0C;flex:1}
  .cls-count{font-size:11px;font-weight:800;color:#A8863E;background:rgba(200,169,106,0.12);border:1px solid rgba(200,169,106,0.22);padding:2px 9px;border-radius:99px}

  /* Roster */
  .cls-roster{padding:8px 10px;display:flex;flex-direction:column;gap:2px}
  .cls-row{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:10px;transition:background 0.14s}
  .cls-row:hover{background:rgba(200,169,106,0.06)}
  .cls-row.is-me{background:#0B0B0C}
  .cls-row.is-me:hover{background:#141008}
  .cls-av{width:32px;height:32px;border-radius:50%;flex-shrink:0;background:rgba(200,169,106,0.1);border:1.5px solid rgba(200,169,106,0.18);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#A8863E}
  .cls-row.is-me .cls-av{background:rgba(200,169,106,0.14);border-color:rgba(200,169,106,0.28);color:#C8A96A}
  .cls-row-name{flex:1;font-size:13px;font-weight:600;color:#1A1208}
  .cls-row.is-me .cls-row-name{color:#FFFFFF}
  .cls-you{font-size:10px;font-weight:800;color:#C8A96A;background:rgba(200,169,106,0.14);border:1px solid rgba(200,169,106,0.24);padding:2px 8px;border-radius:99px}

  /* Announcements */
  .cls-void{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 20px;color:rgba(200,169,106,0.3);font-size:13px;text-align:center}
  .cls-ann-list{display:flex;flex-direction:column;padding:8px 14px;gap:0}
  .cls-ann-item{display:flex;gap:12px;padding:13px 0;border-bottom:1px solid rgba(200,169,106,0.07)}
  .cls-ann-item:last-child{border-bottom:none}
  .cls-ann-bar{width:3px;min-height:36px;background:linear-gradient(180deg,#C8A96A,#E5B93C);border-radius:99px;flex-shrink:0;margin:2px 0}
  .cls-ann-body{flex:1}
  .cls-ann-text{font-size:13.5px;color:#1A1208;line-height:1.65;margin-bottom:8px}
  .cls-ann-meta{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}
  .cls-ann-author{display:flex;align-items:center;gap:5px;font-size:11px;color:#A8863E;font-weight:600}
  .cls-ann-date{font-size:11px;color:#9A8A70}

  /* ─── Mobile ─── */
  @media (max-width: 600px) {
    .cls-shell { padding: 16px 14px; gap: 14px; }
    .cls-header { padding: 18px 18px; border-radius: 16px; }
    .cls-title { font-size: 20px; margin-bottom: 10px; }
    .cls-eyebrow { font-size: 9.5px; letter-spacing: 1.5px; margin-bottom: 5px; }
    .cls-chip { font-size: 11px; padding: 4px 10px; }
    .cls-grid { grid-template-columns: 1fr; gap: 12px; }
    .cls-panel { border-radius: 16px; }
    .cls-panel-head { padding: 12px 14px; }
    .cls-panel-title { font-size: 13px; }
    .cls-roster { padding: 6px 8px; }
    .cls-row { padding: 8px 8px; gap: 8px; }
    .cls-av { width: 30px; height: 30px; font-size: 11.5px; }
    .cls-row-name { font-size: 12.5px; }
    .cls-ann-list { padding: 6px 12px; }
    .cls-ann-text { font-size: 13px; line-height: 1.6; }
    .cls-empty-wrap { padding: 40px 22px; border-radius: 16px; }
  }
  @media (max-width: 380px) {
    .cls-shell { padding: 14px 12px; }
    .cls-title { font-size: 18px; }
    .cls-header { padding: 16px 14px; }
  }
`;
