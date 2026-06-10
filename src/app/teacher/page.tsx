"use client";
export const dynamic = "force-dynamic";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import { useConfirm } from "@/lib/confirm-dialog";

import { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";

type Announcement = {
  id: string;
  content: string;
  created_at: string;
  teacher: { profile: { full_name: string } };
};
type ClassItem = {
  id: string;
  name: string;
  students: { id: string; profile: { full_name: string } }[];
};
type TeacherData = { profile: { full_name: string }; classes: ClassItem[] };

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`td-sk ${className}`} />;
}

export default function TeacherPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const confirm = useConfirm();

  const [data, setData] = useState<TeacherData | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [annLoading, setAnnLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const fetchAnnouncements = useCallback(async (classId: string) => {
    setAnnLoading(true);
    const data = await cachedFetch<Announcement[]>(`/api/teacher/announcements?classId=${classId}`, 30_000);
    setAnnouncements(data);
    setAnnLoading(false);
  }, []);

  const handleSelectClass = useCallback(async (cls: ClassItem) => {
    setSelectedClass(cls);
    await fetchAnnouncements(cls.id);
  }, [fetchAnnouncements]);

  useEffect(() => {
    cachedFetch<TeacherData>("/api/teacher", 300_000).then((d) => {
      setData(d);
      if (d.classes?.length > 0) handleSelectClass(d.classes[0]);
      setLoading(false);
      setTimeout(() => setVisible(true), 50);
    });
  }, [handleSelectClass]);

  const handlePost = async () => {
    if (!newAnnouncement.trim() || !selectedClass) return;
    setPosting(true);
    await fetch("/api/teacher/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClass.id, content: newAnnouncement }),
    });
    setNewAnnouncement("");
    invalidateCache(`/api/teacher/announcements?classId=${selectedClass.id}`);
    await fetchAnnouncements(selectedClass.id);
    setPosting(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      message: lang === "ar" ? "حذف هذا الإعلان؟" : "Fshi këtë njoftim?",
    });
    if (!ok) return;
    setDeletingId(id);
    await fetch(`/api/teacher/announcements?id=${id}`, { method: "DELETE" });
    invalidateCache(`/api/teacher/announcements?classId=${selectedClass?.id}`);
    await new Promise((r) => setTimeout(r, 280));
    if (selectedClass) await fetchAnnouncements(selectedClass.id);
    setDeletingId(null);
  };

  const initials = data?.profile.full_name
    ? data.profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("")
    : "م";

  const totalStudents = data?.classes.reduce((acc, c) => acc + c.students.length, 0);

  if (loading) {
    return (
      <div className="td-page" dir={dir}>
        <div className="td-inner">
          <Skeleton className="sk-banner" />
          <div className="td-grid">
            <div className="td-sk-col">{[1,2,3].map((i) => <Skeleton key={i} className="sk-cls"/>)}</div>
            <div className="td-sk-col">
              <Skeleton className="sk-compose"/>
              {[1,2].map((i) => <Skeleton key={i} className="sk-ann"/>)}
            </div>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="td-page" dir={dir} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(14px)", transition: "opacity 0.45s ease, transform 0.45s ease" }}>
      <div className="td-inner">

        {/* ── Banner ── */}
        <div className="td-banner">
          <div className="td-banner-left">
            <p className="td-banner-greeting">{lang === "ar" ? "مرحباً بك،" : "Mirësevini,"}</p>
            <h1 className="td-banner-name">{data?.profile.full_name}</h1>
            <p className="td-banner-sub">
              {lang === "ar" ? "أنت تشرف على" : "Ju mbikëqyrni"}{" "}
              <strong>{data?.classes.length} {tr.classes}</strong>{" "}
              {lang === "ar" ? "و" : "dhe"}{" "}
              <strong>{totalStudents} {tr.students}</strong>
            </p>
          </div>
          <div className="td-banner-stats">
            <div className="td-stat">
              <span className="td-stat-val">{data?.classes.length}</span>
              <span className="td-stat-lbl">{tr.classes}</span>
            </div>
            <div className="td-stat-sep" />
            <div className="td-stat">
              <span className="td-stat-val">{totalStudents}</span>
              <span className="td-stat-lbl">{tr.students}</span>
            </div>
          </div>
        </div>

        {/* ── Empty state ── */}
        {!data?.classes.length ? (
          <div className="td-empty">
            <div className="td-empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
              </svg>
            </div>
            <h2>{lang === "ar" ? "لم يتم تعيينك في أي فصل بعد" : "Nuk jeni caktuar në asnjë klasë"}</h2>
            <p>{lang === "ar" ? "تواصل مع مدير المدرسة" : "Kontaktoni drejtorin e shkollës"}</p>
          </div>
        ) : (
          <div className="td-grid">

            {/* ── Sidebar ── */}
            <aside className="td-sidebar">
              <p className="td-col-label">{tr.classes}</p>
              <div className="td-classes-list">
                {data?.classes.map((cls, i) => (
                  <button key={cls.id} onClick={() => handleSelectClass(cls)}
                    style={{ animationDelay: `${i * 48}ms` }}
                    className={`td-class-btn ${selectedClass?.id === cls.id ? "active" : ""}`}>
                    <div className="td-class-icon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    </div>
                    <div className="td-class-info">
                      <span className="td-class-name">{cls.name}</span>
                      <span className="td-class-count">{cls.students.length} {tr.students}</span>
                    </div>
                    {selectedClass?.id === cls.id && <span className="td-class-dot" />}
                  </button>
                ))}
              </div>

              {selectedClass && (
                <div className="td-students-card">
                  <div className="td-sc-head">
                    <div className="td-sc-icon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    </div>
                    <span className="td-sc-title">{tr.students} · {selectedClass.name}</span>
                    <span className="td-badge">{selectedClass.students.length}</span>
                  </div>
                  <div className="td-students-list">
                    {selectedClass.students.length === 0 ? (
                      <p className="td-no-students">{lang === "ar" ? "لا يوجد طلاب مسجلون" : "Nuk ka nxënës"}</p>
                    ) : (
                      selectedClass.students.map((s, i) => (
                        <div key={s.id} className="td-student-row" style={{ animationDelay: `${i * 33}ms` }}>
                          <div className="td-student-av">{s.profile.full_name.charAt(0)}</div>
                          <span className="td-student-name">{s.profile.full_name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </aside>

            {/* ── Content ── */}
            <section className="td-content">
              <p className="td-col-label">
                {tr.announcements}{selectedClass && <span className="td-col-accent"> · {selectedClass.name}</span>}
              </p>

              {/* Compose */}
              <div className="td-compose">
                <div className="td-compose-head">
                  <div className="td-compose-av">{initials}</div>
                  <span className="td-compose-label">{lang === "ar" ? "إعلان جديد للفصل" : "Njoftim i ri për klasën"}</span>
                </div>
                <textarea
                  className="td-textarea" rows={3}
                  placeholder={lang === "ar" ? "اكتب إعلاناً، تنبيهاً، أو رسالة للطلاب..." : "Shkruaj një njoftim..."}
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  onKeyDown={(e) => {
                    // Ctrl/Cmd+Enter = quick post
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      handlePost();
                    }
                  }}
                />
                <div className="td-compose-foot">
                  <span className="td-char-count">{newAnnouncement.length} {lang === "ar" ? "حرف" : "shkronja"}</span>
                  <button onClick={handlePost} disabled={posting || !newAnnouncement.trim()} className="td-post-btn">
                    {posting ? (
                      <><span className="td-spin"/>{lang === "ar" ? "جارٍ النشر..." : "Duke postuar..."}</>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        {lang === "ar" ? "نشر الإعلان" : "Posto njoftimin"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Announcements list */}
              <div className="td-ann-list">
                {annLoading ? (
                  [1,2,3].map((i) => <Skeleton key={i} className="sk-ann"/>)
                ) : announcements.length === 0 ? (
                  <div className="td-ann-empty">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 01-3.46 0"/>
                    </svg>
                    <p>{lang === "ar" ? "لا توجد إعلانات منشورة بعد" : "Nuk ka njoftime ende"}</p>
                    <span>{lang === "ar" ? "ابدأ بكتابة إعلانك أعلاه" : "Fillo të shkruash njoftimin"}</span>
                  </div>
                ) : (
                  announcements.map((a) => (
                    <div key={a.id} className={`td-ann-item ${deletingId === a.id ? "deleting" : ""}`}>
                      <div className="td-ann-bar" />
                      <div className="td-ann-body">
                        <div className="td-ann-meta-row">
                          <div className="td-ann-av">{initials}</div>
                          <span className="td-ann-author">{a.teacher.profile.full_name}</span>
                          <span className="td-ann-sep">·</span>
                          <span className="td-ann-date">
                            {new Date(a.created_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "sq", { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                        </div>
                        <p className="td-ann-content">{a.content}</p>
                      </div>
                      <button onClick={() => handleDelete(a.id)} disabled={deletingId === a.id} className="td-del-btn">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                        {tr.delete}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeOut{to{opacity:0;transform:scale(0.97)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}

  .td-page{min-height:100%;background:#F6F4EE;font-family:'Cairo',Tajawal,sans-serif;color:#0B0B0C}
  .td-inner{padding:28px 28px 52px;display:flex;flex-direction:column;gap:22px}

  /* ── Banner ── */
  .td-banner{
    background:#0B0B0C;border-radius:22px;padding:28px 32px;
    display:flex;align-items:center;justify-content:space-between;gap:16px;
    animation:fadeUp 0.42s ease both;position:relative;overflow:hidden;
    border:1px solid rgba(200,169,106,0.1);
  }
  .td-banner::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#C8A96A 30%,#E5B93C 60%,transparent)}
  .td-banner::after{content:'';position:absolute;top:-60px;left:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(200,169,106,0.06),transparent 70%);pointer-events:none}
  .td-banner-left{position:relative;z-index:1}
  .td-banner-greeting{font-size:12px;color:rgba(200,169,106,0.5);font-weight:600;margin-bottom:4px;letter-spacing:0.4px}
  .td-banner-name{font-size:25px;font-weight:900;color:#C8A96A;letter-spacing:-0.4px}
  .td-banner-sub{font-size:13px;color:rgba(200,169,106,0.45);margin-top:6px}
  .td-banner-sub strong{color:rgba(200,169,106,0.8);font-weight:700}
  .td-banner-stats{
    display:flex;align-items:center;gap:18px;
    background:rgba(200,169,106,0.08);border:1px solid rgba(200,169,106,0.15);
    border-radius:14px;padding:14px 20px;position:relative;z-index:1;
  }
  .td-stat{display:flex;flex-direction:column;align-items:center;gap:2px}
  .td-stat-val{font-size:24px;font-weight:900;color:#C8A96A;letter-spacing:-0.5px;line-height:1}
  .td-stat-lbl{font-size:11px;color:rgba(200,169,106,0.45);font-weight:600}
  .td-stat-sep{width:1px;height:32px;background:rgba(200,169,106,0.12)}

  /* ── Grid ── */
  .td-grid{display:grid;grid-template-columns:268px 1fr;gap:18px;align-items:start}
  @media(max-width:800px){.td-grid{grid-template-columns:1fr}}

  .td-col-label{font-size:10.5px;font-weight:700;color:#9A8A70;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
  .td-col-accent{color:#0B0B0C;text-transform:none;letter-spacing:0;font-weight:800}

  /* ── Sidebar ── */
  .td-sidebar{display:flex;flex-direction:column;gap:14px}
  .td-classes-list{display:flex;flex-direction:column;gap:5px}
  .td-class-btn{
    width:100%;display:flex;align-items:center;gap:10px;padding:11px 13px;
    border-radius:13px;border:1px solid rgba(200,169,106,0.14);background:#FFFDF8;
    cursor:pointer;transition:all 0.22s cubic-bezier(0.22,1,0.36,1);
    animation:fadeUp 0.3s ease both;font-family:'Cairo',sans-serif;
    -webkit-tap-highlight-color:transparent;
  }
  .td-class-btn:hover{
    border-color:rgba(200,169,106,0.40);
    background:rgba(200,169,106,0.06);
    transform:translateX(-2px);
    box-shadow:0 4px 14px rgba(11,11,12,0.04);
  }
  [dir="ltr"] .td-class-btn:hover{transform:translateX(2px)}
  .td-class-btn:active{transform:translateX(0); transition:transform .05s}
  .td-class-btn.active{
    background:#0B0B0C;border-color:#0B0B0C;
    box-shadow:0 6px 22px rgba(8,11,12,0.24), inset 0 1px 0 rgba(229,185,60,0.08);
  }
  .td-class-btn.active:hover{transform:none}
  .td-class-icon{width:32px;height:32px;border-radius:9px;flex-shrink:0;background:rgba(200,169,106,0.1);border:1px solid rgba(200,169,106,0.18);display:flex;align-items:center;justify-content:center;color:#9A8A70;transition:all 0.18s}
  .td-class-btn.active .td-class-icon{background:rgba(200,169,106,0.14);border-color:rgba(200,169,106,0.25);color:#C8A96A}
  .td-class-info{flex:1;display:flex;flex-direction:column;gap:1px;text-align:start}
  .td-class-name{font-size:13px;font-weight:700;color:#0B0B0C}
  .td-class-btn.active .td-class-name{color:#C8A96A}
  .td-class-count{font-size:11px;color:#9A8A70}
  .td-class-btn.active .td-class-count{color:rgba(200,169,106,0.5)}
  .td-class-dot{width:6px;height:6px;border-radius:50%;background:#C8A96A;flex-shrink:0}

  /* Students card */
  .td-students-card{background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);border-radius:15px;overflow:hidden;animation:fadeUp 0.35s ease both}
  .td-sc-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(200,169,106,0.09);background:rgba(200,169,106,0.03)}
  .td-sc-icon{width:28px;height:28px;border-radius:8px;flex-shrink:0;background:#0B0B0C;border:1px solid rgba(200,169,106,0.18);display:flex;align-items:center;justify-content:center;color:#C8A96A}
  .td-sc-title{flex:1;font-size:12.5px;font-weight:800;color:#0B0B0C}
  .td-badge{font-size:10.5px;font-weight:800;color:#A8863E;background:rgba(200,169,106,0.12);border:1px solid rgba(200,169,106,0.2);padding:2px 8px;border-radius:99px}
  .td-students-list{padding:8px 10px;display:flex;flex-direction:column;gap:2px;max-height:280px;overflow-y:auto}
  .td-no-students{font-size:12px;color:#9A8A70;padding:12px;text-align:center}
  .td-student-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;transition:background 0.14s;animation:fadeUp 0.25s ease both}
  .td-student-row:hover{background:rgba(200,169,106,0.06)}
  .td-student-av{width:26px;height:26px;border-radius:50%;flex-shrink:0;background:rgba(200,169,106,0.1);border:1px solid rgba(200,169,106,0.18);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#A8863E}
  .td-student-name{font-size:12.5px;font-weight:600;color:#3D2E10}

  /* ── Compose ── */
  .td-content{display:flex;flex-direction:column;gap:14px}
  .td-compose{background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);border-radius:18px;padding:17px 18px;display:flex;flex-direction:column;gap:12px;animation:fadeUp 0.35s ease both}
  .td-compose-head{display:flex;align-items:center;gap:10px}
  .td-compose-av{width:34px;height:34px;border-radius:10px;flex-shrink:0;background:#0B0B0C;border:1px solid rgba(200,169,106,0.2);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#C8A96A}
  .td-compose-label{font-size:12.5px;font-weight:700;color:#9A8A70}
  .td-textarea{width:100%;border:1.5px solid rgba(200,169,106,0.15);border-radius:11px;padding:11px 14px;font-size:16px;/* ≥16px prevents iOS auto-zoom */font-family:'Cairo',Tajawal,sans-serif;resize:none;outline:none;color:#0B0B0C;background:#F6F4EE;transition:border-color 0.18s,box-shadow 0.18s;line-height:1.65}
  .td-textarea:focus{border-color:rgba(200,169,106,0.35);background:#FFFDF8;box-shadow:0 0 0 3px rgba(200,169,106,0.08)}
  .td-textarea::placeholder{color:#B0A090}
  .td-compose-foot{display:flex;align-items:center;justify-content:space-between}
  .td-char-count{font-size:11px;color:#B0A090}
  .td-post-btn{display:flex;align-items:center;gap:7px;background:#0B0B0C;color:#C8A96A;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;font-family:'Cairo',Tajawal,sans-serif;border:none;cursor:pointer;transition:all 0.18s}
  .td-post-btn:hover:not(:disabled){background:#C8A96A;color:#0B0B0C;transform:translateY(-1px);box-shadow:0 4px 14px rgba(200,169,106,0.3)}
  .td-post-btn:disabled{opacity:0.4;cursor:not-allowed}
  .td-spin{width:12px;height:12px;border:2px solid rgba(200,169,106,0.3);border-top-color:#C8A96A;border-radius:50%;animation:spin 0.6s linear infinite}

  /* ── Announcements list ── */
  .td-ann-list{display:flex;flex-direction:column;gap:10px}
  .td-ann-empty{background:#FFFDF8;border:1px dashed rgba(200,169,106,0.18);border-radius:18px;padding:44px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;color:rgba(200,169,106,0.3);animation:fadeUp 0.35s ease both}
  .td-ann-empty p{font-size:14px;font-weight:700;color:#3D2E10}
  .td-ann-empty span{font-size:12px;color:#9A8A70}
  .td-ann-item{background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);border-radius:15px;padding:15px 16px;display:flex;align-items:flex-start;gap:12px;animation:fadeUp 0.3s ease both;transition:border-color 0.15s,box-shadow 0.15s}
  .td-ann-item:hover{border-color:rgba(200,169,106,0.28);box-shadow:0 3px 12px rgba(8,11,12,0.06)}
  .td-ann-item.deleting{animation:fadeOut 0.3s ease forwards}
  .td-ann-bar{width:3px;min-height:36px;background:linear-gradient(180deg,#C8A96A,#E5B93C);border-radius:99px;flex-shrink:0;margin:2px 0}
  .td-ann-body{flex:1;display:flex;flex-direction:column;gap:7px}
  .td-ann-meta-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
  .td-ann-av{width:24px;height:24px;border-radius:6px;flex-shrink:0;background:#0B0B0C;border:1px solid rgba(200,169,106,0.2);display:flex;align-items:center;justify-content:center;font-size:8.5px;font-weight:900;color:#C8A96A}
  .td-ann-author{font-size:12px;font-weight:700;color:#0B0B0C}
  .td-ann-sep{color:rgba(200,169,106,0.3);font-size:10px}
  .td-ann-date{font-size:11px;color:#9A8A70}
  .td-ann-content{font-size:14px;color:#3D2E10;line-height:1.65}
  .td-del-btn{display:flex;align-items:center;gap:4px;background:none;border:1px solid rgba(200,169,106,0.18);color:#9A8A70;padding:5px 10px;border-radius:7px;font-size:11.5px;font-weight:700;font-family:'Cairo',Tajawal,sans-serif;cursor:pointer;flex-shrink:0;transition:all 0.15s;white-space:nowrap;margin-top:1px}
  .td-del-btn:hover:not(:disabled){border-color:rgba(200,169,106,0.35);color:#A8863E;background:rgba(200,169,106,0.06)}
  .td-del-btn:disabled{opacity:0.4;cursor:not-allowed}

  /* ── Empty state ── */
  .td-empty{background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);border-radius:22px;padding:60px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;animation:fadeUp 0.4s ease both}
  .td-empty-icon{color:rgba(200,169,106,0.35)}
  .td-empty h2{font-size:17px;font-weight:800;color:#0B0B0C}
  .td-empty p{font-size:13px;color:#9A8A70}

  /* ── Skeletons ── */
  .td-sk{background:rgba(200,169,106,0.12);border-radius:10px;animation:pulse 1.6s ease-in-out infinite}
  .sk-banner{height:112px;border-radius:22px}
  .sk-cls{height:55px;border-radius:13px}
  .sk-compose{height:120px;border-radius:18px}
  .sk-ann{height:78px;border-radius:15px}
  .td-sk-col{display:flex;flex-direction:column;gap:10px}

  @media(max-width:600px){
    .td-inner{padding:16px 16px 40px;gap:16px}
    .td-banner{padding:18px 20px}
    .td-banner-name{font-size:20px}
    .td-banner-stats{display:none}
    .td-empty{padding:36px 20px}
    .td-ann-empty{padding:32px 20px}
    .td-post-btn{padding:11px 16px;font-size:14px}
    .td-compose{padding:14px 15px}
    .td-textarea{font-size:16px}
  }
  @media(max-width:400px){
    .td-banner{padding:14px 16px}
    .td-banner-name{font-size:17px}
    .td-banner-greeting{font-size:11px}
    .td-banner-sub{font-size:12px}
    .td-empty{padding:28px 16px}
    .td-empty h2{font-size:15px}
    .td-ann-empty{padding:24px 16px}
  }
`;
