"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";

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
    fetch("/api/student")
      .then((r) => r.json())
      .then(async (d: StudentData) => {
        setData(d);
        if (d.class) {
          const res = await fetch(
            `/api/student/announcements?classId=${d.class.id}`,
          );
          setAnnouncements(await res.json());
        }
      });
  }, []);

  if (!data) return <MandalaLoader label={tr.loading} />;

  if (!data.class) {
    return (
      <div className="no-class-shell" dir={dir}>
        <div className="no-class-card">
          <div className="no-class-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          </div>
          <p className="no-class-text">{tr.noClass}</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page-shell" dir={dir}>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-eyebrow">الفصل الدراسي</div>
          <h1 className="page-title">{data.class.name}</h1>
          {data.class.teacher && (
            <div className="teacher-chip">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {tr.yourTeacher}: {data.class.teacher.profile.full_name}
            </div>
          )}
          {!data.class.teacher && (
            <div className="teacher-chip muted">{tr.withoutTeacher}</div>
          )}
        </div>
        <div className="page-header-right">
          <div className="stat-pill">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            {data.class.students.length} {tr.classmates ?? "طالب"}
          </div>
        </div>
      </div>

      <div className="two-col">
        {/* Classmates */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <div className="panel-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <h2 className="panel-title">{tr.classmates}</h2>
            </div>
            <span className="count-badge">{data.class.students.length}</span>
          </div>
          <div className="student-list">
            {data.class.students.map((s) => {
              const isMe = s.profile.full_name === data.profile.full_name;
              return (
                <div
                  key={s.id}
                  className={`student-row ${isMe ? "is-me" : ""}`}
                >
                  <div className="student-avatar">
                    {s.profile.full_name.charAt(0)}
                  </div>
                  <span className="student-name">{s.profile.full_name}</span>
                  {isMe && (
                    <span className="you-badge">{tr.youBadge ?? "أنت"}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Announcements */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <div className="panel-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </div>
              <h2 className="panel-title">{tr.classAnnouncements}</h2>
            </div>
            {announcements.length > 0 && (
              <span className="count-badge">{announcements.length}</span>
            )}
          </div>

          {announcements.length === 0 ? (
            <div className="empty-announce">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span>{tr.noAnnouncements}</span>
            </div>
          ) : (
            <div className="announce-list">
              {announcements.map((a) => (
                <div key={a.id} className="announce-card">
                  <div className="announce-dot" />
                  <div className="announce-body">
                    <p className="announce-content">{a.content}</p>
                    <div className="announce-meta">
                      <span className="announce-teacher">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        {a.teacher.profile.full_name}
                      </span>
                      <span className="announce-date">
                        {new Date(a.created_at).toLocaleDateString(
                          lang === "ar" ? "ar" : "sq",
                        )}
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
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --gold: #C8A96A; --gold-dark: #A8863E; --gold-light: #E8D09A; --gold-pale: #F5EDDA;
    --ink: #1A1208; --ink2: #3D2E10; --muted: #7A6540; --surface: #FEFCF7;
    --border: #E8D9B8; --white: #FFFFFF;
  }

  /* Shell */
  .page-shell {
    min-height: 100vh; background: var(--gold-pale);
    font-family: 'Tajawal', sans-serif;
    padding: 28px 24px; display: flex; flex-direction: column; gap: 20px;
  }
  .no-class-shell {
    min-height: 100vh; background: var(--gold-pale);
    font-family: 'Tajawal', sans-serif;
    display: flex; align-items: center; justify-content: center; padding: 28px;
  }
  .no-class-card {
    background: var(--white); border: 1px solid var(--border); border-radius: 18px;
    padding: 40px 32px; display: flex; flex-direction: column; align-items: center; gap: 14px;
    text-align: center; max-width: 360px;
  }
  .no-class-icon { color: var(--gold); }
  .no-class-text { font-size: 14px; color: var(--muted); }

  /* Page header */
  .page-header {
    background: var(--ink); border-radius: 18px; padding: 22px 26px;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    flex-wrap: wrap;
  }
  .page-eyebrow { font-size: 10px; font-weight: 700; color: var(--gold); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 5px; }
  .page-title { font-size: 22px; font-weight: 800; color: var(--white); margin-bottom: 10px; }
  .teacher-chip {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(200,169,106,0.15); border: 1px solid rgba(200,169,106,0.3);
    color: var(--gold-light); font-size: 12px; font-weight: 600;
    padding: 4px 12px; border-radius: 99px;
  }
  .teacher-chip.muted { color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); }
  .page-header-right { display: flex; align-items: flex-start; padding-top: 4px; }
  .stat-pill {
    display: flex; align-items: center; gap: 6px;
    background: rgba(200,169,106,0.12); border: 1px solid rgba(200,169,106,0.25);
    color: var(--gold-light); font-size: 12px; font-weight: 700;
    padding: 6px 14px; border-radius: 99px; white-space: nowrap;
  }

  /* Two-col grid */
  .two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }

  /* Panel */
  .panel {
    background: var(--white); border: 1px solid var(--border); border-radius: 18px;
    overflow: hidden; display: flex; flex-direction: column;
  }
  .panel-header {
    background: var(--gold-pale); border-bottom: 1px solid var(--border);
    padding: 13px 18px; display: flex; align-items: center; justify-content: space-between;
  }
  .panel-title-wrap { display: flex; align-items: center; gap: 9px; }
  .panel-icon {
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    background: rgba(168,134,62,0.12); border: 1px solid rgba(168,134,62,0.2);
    display: flex; align-items: center; justify-content: center; color: var(--gold-dark);
  }
  .panel-title { font-size: 14px; font-weight: 800; color: var(--ink); }
  .count-badge {
    font-size: 11px; font-weight: 800; color: var(--gold-dark);
    background: rgba(200,169,106,0.15); border: 1px solid rgba(200,169,106,0.25);
    padding: 3px 10px; border-radius: 99px;
  }

  /* Student list */
  .student-list { display: flex; flex-direction: column; padding: 10px 12px; gap: 4px; }
  .student-row {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: 10px;
    border: 1px solid transparent; transition: all 0.15s;
  }
  .student-row:hover { background: var(--gold-pale); border-color: var(--border); }
  .student-row.is-me { background: rgba(200,169,106,0.08); border-color: rgba(200,169,106,0.25); }
  .student-avatar {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    background: var(--gold-pale); border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 800; color: var(--gold-dark);
  }
  .student-row.is-me .student-avatar { background: var(--gold); color: var(--ink); border-color: var(--gold-dark); }
  .student-name { font-size: 13.5px; font-weight: 500; color: var(--ink2); flex: 1; }
  .student-row.is-me .student-name { font-weight: 700; color: var(--ink); }
  .you-badge {
    font-size: 10.5px; font-weight: 800; color: var(--gold-dark);
    background: rgba(200,169,106,0.15); border: 1px solid rgba(200,169,106,0.3);
    padding: 2px 9px; border-radius: 99px;
  }

  /* Announcements */
  .empty-announce {
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 36px 20px; color: var(--muted); font-size: 13px; text-align: center;
  }
  .empty-announce svg { color: var(--border); }
  .announce-list { display: flex; flex-direction: column; gap: 0; padding: 10px 12px; }
  .announce-card {
    display: flex; gap: 12px; padding: 12px 10px;
    border-bottom: 1px solid var(--border);
  }
  .announce-card:last-child { border-bottom: none; }
  .announce-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gold); flex-shrink: 0; margin-top: 6px; }
  .announce-body { display: flex; flex-direction: column; gap: 6px; flex: 1; }
  .announce-content { font-size: 13.5px; color: var(--ink2); line-height: 1.65; }
  .announce-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .announce-teacher { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--gold-dark); font-weight: 600; }
  .announce-date { font-size: 11px; color: var(--muted); }
`;
