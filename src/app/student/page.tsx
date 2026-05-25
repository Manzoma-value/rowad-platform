"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  school: { name: string } | null;
  class: {
    id: string;
    name: string;
    teacher: { profile: { full_name: string } } | null;
    students: { id: string; profile: { full_name: string } }[];
  } | null;
};

export default function StudentPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [data, setData] = useState<StudentData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cachedFetch<StudentData>("/api/student", 60_000)
      .then(async (d) => {
        setData(d);
        if (d.class) {
          const ann = await cachedFetch<Announcement[]>(
            `/api/student/announcements?classId=${d.class.id}`,
            30_000,
          );
          setAnnouncements(Array.isArray(ann) ? ann : []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <MandalaLoader label={tr.loading} />;

  const initials = data?.profile?.full_name
    ? data.profile.full_name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
    : "ط";

  return (
    <div className="sd-shell" dir={dir}>
      <main className="sd-main">

        {/* ── Welcome Banner ── */}
        <div className="sd-welcome">
          <div className="sd-welcome-text">
            <p className="sd-greeting">{tr.welcome}</p>
            <h1 className="sd-name">{data?.profile?.full_name}</h1>
            {data?.class ? (
              <div className="sd-chips">
                <span className="sd-chip">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
                  {data.class.name}
                </span>
                {data.class.teacher && (
                  <span className="sd-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {data.class.teacher.profile.full_name}
                  </span>
                )}
              </div>
            ) : (
              <span className="sd-chip muted">{tr.noClass}</span>
            )}
          </div>
          <div className="sd-avatar">{initials}</div>
        </div>

        {/* ── No class state ── */}
        {!data?.class ? (
          <div className="sd-empty-state">
            <div className="sd-empty-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
              </svg>
            </div>
            <h2 className="sd-empty-title">{tr.noClass}</h2>
            <p className="sd-empty-sub">{tr.noClassContact}</p>
          </div>
        ) : (

          /* ── Main grid ── */
          <div className="sd-grid">

            {/* Announcements */}
            <div className="sd-card">
              <div className="sd-card-head">
                <div className="sd-card-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                </div>
                <span className="sd-card-title">{tr.announcements}</span>
                <span className="sd-badge">{announcements.length}</span>
              </div>

              <div className="sd-ann-list">
                {announcements.length === 0 ? (
                  <div className="sd-void">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 01-3.46 0"/>
                    </svg>
                    <p>{tr.noAnnouncements}</p>
                  </div>
                ) : (
                  announcements.map((a, i) => (
                    <div key={a.id} className="sd-ann-item" style={{ animationDelay: `${i * 55}ms` }}>
                      <div className="sd-ann-bar" />
                      <div className="sd-ann-body">
                        <p className="sd-ann-text">{a.content}</p>
                        <div className="sd-ann-meta">
                          <span className="sd-ann-author">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            {a.teacher.profile.full_name}
                          </span>
                          <span className="sd-ann-date">
                            {new Date(a.created_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "sq-AL", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Classmates */}
            <div className="sd-card">
              <div className="sd-card-head">
                <div className="sd-card-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <span className="sd-card-title">{tr.classmates}</span>
                <span className="sd-badge">{data.class.students.length}</span>
              </div>

              <div className="sd-roster">
                {data.class.students.map((s, i) => {
                  const isMe = s.profile.full_name === data.profile.full_name;
                  return (
                    <div key={s.id} className={`sd-roster-row ${isMe ? "is-me" : ""}`} style={{ animationDelay: `${i * 38}ms` }}>
                      <div className="sd-roster-av">{s.profile.full_name.charAt(0)}</div>
                      <span className="sd-roster-name">{s.profile.full_name}</span>
                      {isMe && <span className="sd-you">{tr.youBadge}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div className="sd-actions">
          {[
            {
              href: "/student/quizzes",
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>,
              title: tr.quizzes,
              sub: tr.quizzesActionSub,
            },
            {
              href: "/student/roadmap",
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>,
              title: tr.questionBank,
              sub: tr.questionBankSub,
            },
            {
              href: "/student/classes",
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
              title: tr.myClass,
              sub: tr.myClassActionSub,
            },
          ].map(({ href, icon, title, sub }, idx) => (
            <Link key={href} href={href} className="sd-action" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="sd-action-icon">{icon}</div>
              <div className="sd-action-body">
                <div className="sd-action-title">{title}</div>
                <div className="sd-action-sub">{sub}</div>
              </div>
              <svg className="sd-action-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: dir === "rtl" ? "rotate(180deg)" : "none" }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </Link>
          ))}
        </div>

      </main>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

  .sd-shell{min-height:100%;width:100%;background:#F6F4EE;font-family:'Cairo',Tajawal,sans-serif}
  .sd-main{padding:28px 24px;display:flex;flex-direction:column;gap:18px;width:100%;max-width:1200px;margin-inline:auto}

  /* ── Banner ── */
  .sd-welcome{
    background:#0B0B0C;border-radius:22px;padding:28px 32px;
    display:flex;align-items:center;justify-content:space-between;gap:20px;
    position:relative;overflow:hidden;
    border:1px solid rgba(200,169,106,0.12);
    animation:fadeUp 0.45s ease both;
  }
  .sd-welcome::before{
    content:'';position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,transparent,#C8A96A 30%,#E5B93C 60%,transparent);
  }
  .sd-welcome::after{
    content:'';position:absolute;top:-80px;right:-80px;width:260px;height:260px;
    border-radius:50%;background:radial-gradient(circle,rgba(200,169,106,0.07) 0%,transparent 70%);
    pointer-events:none;
  }
  .sd-welcome-text{position:relative;z-index:1}
  .sd-greeting{font-size:12px;color:rgba(200,169,106,0.55);font-weight:600;letter-spacing:0.4px;margin-bottom:5px}
  .sd-name{font-size:27px;font-weight:900;color:#FFFFFF;letter-spacing:-0.4px;line-height:1.15}
  .sd-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}
  .sd-chip{
    display:inline-flex;align-items:center;gap:6px;
    background:rgba(200,169,106,0.1);border:1px solid rgba(200,169,106,0.2);
    color:rgba(200,169,106,0.9);font-size:11.5px;font-weight:600;
    padding:5px 12px;border-radius:99px;
  }
  .sd-chip.muted{color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.07);margin-top:11px}
  .sd-avatar{
    width:66px;height:66px;border-radius:50%;flex-shrink:0;
    background:rgba(200,169,106,0.1);border:2px solid rgba(200,169,106,0.28);
    display:flex;align-items:center;justify-content:center;
    font-size:23px;font-weight:900;color:#C8A96A;
    position:relative;z-index:1;
  }

  /* ── Empty state ── */
  .sd-empty-state{
    background:#FFFDF8;border:1px solid rgba(200,169,106,0.15);border-radius:18px;
    padding:54px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;
    animation:fadeUp 0.4s ease both;
  }
  .sd-empty-icon{color:rgba(200,169,106,0.35)}
  .sd-empty-title{font-size:17px;font-weight:800;color:#0B0B0C}
  .sd-empty-sub{font-size:13px;color:#9A8A70}

  /* ── Grid ── */
  .sd-grid{display:grid;grid-template-columns:1fr 300px;gap:16px;align-items:start}
  @media(max-width:740px){.sd-grid{grid-template-columns:1fr}}

  /* ── Card ── */
  .sd-card{
    background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);border-radius:18px;
    overflow:hidden;animation:fadeUp 0.4s ease both;animation-delay:0.05s;
  }
  .sd-card-head{
    display:flex;align-items:center;gap:10px;padding:14px 18px;
    border-bottom:1px solid rgba(200,169,106,0.09);background:rgba(200,169,106,0.03);
  }
  .sd-card-icon{
    width:30px;height:30px;border-radius:8px;flex-shrink:0;
    background:#0B0B0C;border:1px solid rgba(200,169,106,0.18);
    display:flex;align-items:center;justify-content:center;color:#C8A96A;
  }
  .sd-card-title{font-size:13.5px;font-weight:800;color:#0B0B0C;flex:1}
  .sd-badge{
    font-size:11px;font-weight:800;color:#A8863E;
    background:rgba(200,169,106,0.12);border:1px solid rgba(200,169,106,0.22);
    padding:2px 9px;border-radius:99px;
  }

  /* ── Announcement list ── */
  .sd-ann-list{padding:8px 14px;display:flex;flex-direction:column;gap:0;max-height:420px;overflow-y:auto}
  .sd-ann-item{display:flex;gap:12px;padding:13px 2px;border-bottom:1px solid rgba(200,169,106,0.07);animation:fadeUp 0.3s ease both}
  .sd-ann-item:last-child{border-bottom:none}
  .sd-ann-bar{width:3px;min-height:36px;background:linear-gradient(180deg,#C8A96A,#E5B93C);border-radius:99px;flex-shrink:0;margin:2px 0}
  .sd-ann-body{flex:1}
  .sd-ann-text{font-size:13.5px;color:#1A1208;line-height:1.65;margin-bottom:8px}
  .sd-ann-meta{display:flex;align-items:center;justify-content:space-between}
  .sd-ann-author{display:flex;align-items:center;gap:5px;font-size:11px;color:#A8863E;font-weight:600}
  .sd-ann-date{font-size:11px;color:#9A8A70}
  .sd-void{padding:40px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;color:rgba(200,169,106,0.3)}
  .sd-void p{font-size:13px;color:#9A8A70}

  /* ── Roster ── */
  .sd-roster{padding:8px 10px;display:flex;flex-direction:column;gap:2px;max-height:360px;overflow-y:auto}
  .sd-roster-row{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:10px;transition:background 0.14s;animation:fadeUp 0.25s ease both}
  .sd-roster-row:hover{background:rgba(200,169,106,0.06)}
  .sd-roster-row.is-me{background:#0B0B0C}
  .sd-roster-row.is-me:hover{background:#141008}
  .sd-roster-av{
    width:30px;height:30px;border-radius:50%;flex-shrink:0;
    background:rgba(200,169,106,0.1);border:1.5px solid rgba(200,169,106,0.18);
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:800;color:#A8863E;
  }
  .sd-roster-row.is-me .sd-roster-av{background:rgba(200,169,106,0.14);border-color:rgba(200,169,106,0.28);color:#C8A96A}
  .sd-roster-name{flex:1;font-size:12.5px;font-weight:600;color:#1A1208}
  .sd-roster-row.is-me .sd-roster-name{color:#FFFFFF}
  .sd-you{font-size:10px;font-weight:800;color:#C8A96A;background:rgba(200,169,106,0.14);border:1px solid rgba(200,169,106,0.24);padding:2px 8px;border-radius:99px}

  /* ── Quick actions ── */
  .sd-actions{display:flex;gap:12px;flex-wrap:wrap}
  .sd-action{
    display:flex;align-items:center;gap:13px;
    background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);
    border-radius:16px;padding:15px 18px;text-decoration:none;
    color:#0B0B0C;flex:1;min-width:178px;
    transition:all 0.2s cubic-bezier(0.22,1,0.36,1);
    animation:fadeUp 0.45s ease both;
  }
  .sd-action:hover{border-color:rgba(200,169,106,0.35);transform:translateY(-2px);box-shadow:0 8px 22px rgba(8,11,12,0.09)}
  .sd-action-icon{
    width:42px;height:42px;border-radius:12px;flex-shrink:0;
    background:#0B0B0C;border:1px solid rgba(200,169,106,0.15);
    display:flex;align-items:center;justify-content:center;color:#C8A96A;
  }
  .sd-action-body{flex:1}
  .sd-action-title{font-size:13.5px;font-weight:800;color:#0B0B0C}
  .sd-action-sub{font-size:11.5px;color:#7A6540;margin-top:2px}
  .sd-action-arrow{color:rgba(200,169,106,0.38);flex-shrink:0;transition:color 0.15s}
  .sd-action:hover .sd-action-arrow{color:#C8A96A}

  @media(max-width:600px){
    .sd-main{padding:16px;gap:14px}
    .sd-welcome{padding:20px}
    .sd-name{font-size:21px}
    .sd-avatar{width:50px;height:50px;font-size:17px}
    .sd-empty-state{padding:36px 24px}
    .sd-actions{gap:10px}
    .sd-action{min-width:0;flex-basis:100%}
  }
  @media(max-width:400px){
    .sd-welcome{padding:16px}
    .sd-name{font-size:18px}
    .sd-greeting{font-size:11px}
    .sd-avatar{display:none}
    .sd-empty-state{padding:28px 16px}
    .sd-empty-title{font-size:15px}
    .sd-empty-sub{font-size:12px}
  }
`;
