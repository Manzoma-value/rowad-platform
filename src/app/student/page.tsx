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
        {/* Welcome banner */}
        <div className="sd-welcome">
          <div className="sd-welcome-text">
            <div className="sd-welcome-greeting">{tr.welcome}،</div>
            <h1 className="sd-welcome-name">{data?.profile?.full_name} 👋</h1>
            {data?.class ? (
              <p className="sd-welcome-class">
                {tr.myClass}: <strong>{data.class.name}</strong>
                {data.class.teacher && (
                  <>
                    {" "}
                    · {tr.yourTeacher}:{" "}
                    <strong>{data.class.teacher.profile.full_name}</strong>
                  </>
                )}
              </p>
            ) : (
              <p className="sd-welcome-class">{tr.noClass}</p>
            )}
          </div>
          <div className="sd-welcome-avatar">{initials}</div>
        </div>

        {!data?.class ? (
          <div className="sd-no-class">
            <div className="sd-no-class-icon">📚</div>
            <h2>{tr.noClass}</h2>
            <p>
              {lang === "ar"
                ? "تواصل مع مدير المدرسة"
                : "Kontaktoni drejtorin e shkollës"}
            </p>
          </div>
        ) : (
          <div className="sd-grid">
            {/* Announcements */}
            <div className="sd-card">
              <div className="sd-card-header">
                <div className="sd-card-icon">📢</div>
                <h2 className="sd-card-title">{tr.announcements}</h2>
                <span className="sd-card-count">{announcements.length}</span>
              </div>
              <div className="sd-ann-list">
                {announcements.length === 0 ? (
                  <div className="sd-empty">
                    <div className="sd-empty-icon">🔔</div>
                    <p>{tr.noAnnouncements}</p>
                  </div>
                ) : (
                  announcements.map((a, i) => (
                    <div
                      key={a.id}
                      className="sd-ann-item"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="sd-ann-content">{a.content}</div>
                      <div className="sd-ann-meta">
                        <span className="sd-ann-teacher">
                          <svg
                            width="12"
                            height="12"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          {a.teacher.profile.full_name}
                        </span>
                        <span className="sd-ann-date">
                          {new Date(a.created_at).toLocaleDateString(
                            lang === "ar" ? "ar-SA" : "sq-AL",
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Classmates */}
            <div className="sd-card">
              <div className="sd-card-header">
                <div className="sd-card-icon">👥</div>
                <h2 className="sd-card-title">{tr.classmates}</h2>
                <span className="sd-card-count">
                  {data.class.students.length}
                </span>
              </div>
              <div className="sd-students-list">
                {data.class.students.map((s, i) => {
                  const isMe = s.profile.full_name === data.profile.full_name;
                  return (
                    <div
                      key={s.id}
                      className={`sd-student-row ${isMe ? "me" : ""}`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="sd-student-avatar">
                        {s.profile.full_name.charAt(0)}
                      </div>
                      <span className="sd-student-name">
                        {s.profile.full_name}
                      </span>
                      {isMe && (
                        <span className="sd-me-badge">{tr.youBadge}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="sd-actions">
          <Link href="/student/quizzes" className="sd-action-card">
            <div className="sd-action-icon">📝</div>
            <div className="sd-action-body">
              <div className="sd-action-title">{tr.quizzes}</div>
              <div className="sd-action-sub">
                {lang === "ar"
                  ? "أداء الاختبارات المتاحة"
                  : "Kryej testet e disponueshme"}
              </div>
            </div>
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{
                transform: dir === "rtl" ? "rotate(180deg)" : "none",
                color: "#C8A96A",
              }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
          <Link href="/student/roadmap" className="sd-action-card">
            <div className="sd-action-icon">🗺️</div>
            <div className="sd-action-body">
              <div className="sd-action-title">
                {lang === "ar" ? "بنك الأسئلة" : "Banka e Pyetjeve"}
              </div>
              <div className="sd-action-sub">
                {lang === "ar" ? "خارطة طريق التعلم" : "Harta e të nxënit"}
              </div>
            </div>
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{
                transform: dir === "rtl" ? "rotate(180deg)" : "none",
                color: "#C8A96A",
              }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
          <Link href="/student/classes" className="sd-action-card">
            <div className="sd-action-icon">📚</div>
            <div className="sd-action-body">
              <div className="sd-action-title">{tr.myClass}</div>
              <div className="sd-action-sub">
                {lang === "ar"
                  ? "تفاصيل فصلك الدراسي"
                  : "Detajet e klasës suaj"}
              </div>
            </div>
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{
                transform: dir === "rtl" ? "rotate(180deg)" : "none",
                color: "#C8A96A",
              }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>
      </main>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --red:#7A1E1E;
    --red-dark:#5c1616;
    --red-muted:rgba(122,30,30,0.07);
    --red-border:rgba(122,30,30,0.18);
    --gold:#C8A96A;
    --gold-muted:rgba(200,169,106,0.1);
    --gold-border:rgba(200,169,106,0.25);
    --black:#0B0B0C;
  }
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

  .sd-shell{min-height:100%;background:#faf7f4;font-family:Tajawal,sans-serif;display:flex;flex-direction:column}
  .sd-spinner{width:32px;height:32px;border:3px solid rgba(200,169,106,0.2);border-top-color:var(--red);border-radius:50%;animation:spin 0.7s linear infinite;margin:auto}

  .sd-main{padding:28px 24px;width:100%;display:flex;flex-direction:column;gap:22px}

  /* Welcome */
  .sd-welcome{
    background:linear-gradient(135deg,var(--red) 0%,var(--red-dark) 100%);
    border-radius:18px;padding:28px 32px;
    display:flex;align-items:center;justify-content:space-between;gap:16px;
    animation:fadeUp 0.4s ease both;
    border:1px solid rgba(200,169,106,0.2);
    position:relative;overflow:hidden;
  }
  .sd-welcome::before{content:'';position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(200,169,106,0.06);pointer-events:none}
  .sd-welcome-text{position:relative;z-index:1}
  .sd-welcome-greeting{font-size:13px;color:rgba(200,169,106,0.7);font-weight:500;margin-bottom:4px}
  .sd-welcome-name{font-size:26px;font-weight:800;color:white;letter-spacing:-0.5px}
  .sd-welcome-class{font-size:13.5px;color:rgba(200,169,106,0.8);margin-top:6px}
  .sd-welcome-class strong{color:var(--gold)}
  .sd-welcome-avatar{
    width:64px;height:64px;border-radius:50%;flex-shrink:0;
    background:rgba(200,169,106,0.15);backdrop-filter:blur(4px);
    display:flex;align-items:center;justify-content:center;
    font-size:22px;font-weight:800;color:var(--gold);
    border:2px solid rgba(200,169,106,0.3);
    position:relative;z-index:1;
  }

  /* No class */
  .sd-no-class{background:white;border:1px solid #f0e8e0;border-radius:16px;padding:48px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
  .sd-no-class-icon{font-size:40px}
  .sd-no-class h2{font-size:17px;font-weight:800;color:var(--black)}
  .sd-no-class p{font-size:13px;color:#8a6a5a}

  /* Grid */
  .sd-grid{display:grid;grid-template-columns:1fr 280px;gap:16px;align-items:start}
  @media(max-width:768px){.sd-grid{grid-template-columns:1fr}}

  /* Cards */
  .sd-card{background:white;border:1px solid #f0e8e0;border-radius:16px;overflow:hidden;animation:fadeUp 0.4s ease both}
  .sd-card-header{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid #f5ede6}
  .sd-card-icon{font-size:20px}
  .sd-card-title{font-size:15px;font-weight:800;color:var(--black);flex:1}
  .sd-card-count{font-size:11px;font-weight:700;color:var(--red);background:var(--red-muted);border:1px solid var(--red-border);padding:2px 8px;border-radius:99px}

  /* Announcements */
  .sd-ann-list{padding:12px 16px;display:flex;flex-direction:column;gap:10px;max-height:420px;overflow-y:auto}
  .sd-ann-item{padding:14px 16px;border-radius:12px;border:1px solid #f0e8e0;background:#fdf9f6;animation:fadeUp 0.3s ease both;transition:border-color 0.15s}
  .sd-ann-item:hover{border-color:var(--gold-border)}
  .sd-ann-content{font-size:14px;color:var(--black);line-height:1.6;margin-bottom:10px}
  .sd-ann-meta{display:flex;align-items:center;justify-content:space-between}
  .sd-ann-teacher{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#8a6a5a;font-weight:600}
  .sd-ann-date{font-size:11px;color:#b09080}

  /* Empty */
  .sd-empty{padding:36px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px}
  .sd-empty-icon{font-size:32px}
  .sd-empty p{font-size:13px;color:#b09080}

  /* Classmates */
  .sd-students-list{padding:10px 14px;display:flex;flex-direction:column;gap:4px;max-height:360px;overflow-y:auto}
  .sd-student-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;animation:fadeUp 0.25s ease both;transition:background 0.15s}
  .sd-student-row:hover{background:#fdf9f6}
  .sd-student-row.me{background:var(--red)}
  .sd-student-row.me:hover{background:var(--red-dark)}
  .sd-student-avatar{width:30px;height:30px;border-radius:8px;flex-shrink:0;background:var(--gold-muted);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--red)}
  .sd-student-row.me .sd-student-avatar{background:rgba(200,169,106,0.2);border-color:rgba(200,169,106,0.3);color:var(--gold)}
  .sd-student-name{flex:1;font-size:13px;font-weight:600;color:var(--black)}
  .sd-student-row.me .sd-student-name{color:white}
  .sd-me-badge{font-size:10px;font-weight:700;color:var(--red);background:var(--red-muted);border:1px solid var(--red-border);padding:2px 8px;border-radius:99px}
  .sd-student-row.me .sd-me-badge{color:var(--gold);background:rgba(200,169,106,0.15);border-color:rgba(200,169,106,0.3)}

  /* Actions */
  .sd-actions{display:flex;gap:12px;flex-wrap:wrap}
  .sd-action-card{display:flex;align-items:center;gap:14px;background:white;border:1px solid #f0e8e0;border-radius:14px;padding:16px 20px;text-decoration:none;color:var(--black);flex:1;min-width:180px;transition:border-color 0.15s,transform 0.15s;animation:fadeUp 0.4s ease both}
  .sd-action-card:hover{border-color:var(--gold-border);transform:translateY(-1px);box-shadow:0 4px 16px rgba(122,30,30,0.08)}
  .sd-action-icon{font-size:26px}
  .sd-action-body{flex:1}
  .sd-action-title{font-size:14px;font-weight:800;color:var(--black)}
  .sd-action-sub{font-size:12px;color:#8a6a5a;margin-top:2px}

  @media(max-width:600px){
    .sd-welcome{padding:20px}
    .sd-welcome-name{font-size:20px}
    .sd-welcome-avatar{width:48px;height:48px;font-size:16px}
    .sd-main{padding:16px}
  }
`;
