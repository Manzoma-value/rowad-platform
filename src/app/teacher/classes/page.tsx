"use client";
export const dynamic = "force-dynamic";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";

import { useEffect, useState, useCallback } from "react";

type Student = { id: string; profile: { full_name: string } };
type ClassItem = { id: string; name: string; students: Student[] };
type TeacherData = { classes: ClassItem[] };
type Announcement = {
  id: string;
  content: string;
  created_at: string;
  teacher: { profile: { full_name: string } };
};

export default function TeacherClassesPage() {
  const [data, setData] = useState<TeacherData | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [annLoading, setAnnLoading] = useState(false);

  const loadAnnouncements = useCallback(async (classId: string) => {
    setAnnLoading(true);
    const data = await cachedFetch<Announcement[]>(`/api/teacher/announcements?classId=${classId}`, 30_000);
    setAnnouncements(data);
    setAnnLoading(false);
  }, []);

  const selectClass = useCallback(async (cls: ClassItem) => {
    setSelectedClass(cls);
    await loadAnnouncements(cls.id);
  }, [loadAnnouncements]);

  useEffect(() => {
    cachedFetch<TeacherData>("/api/teacher", 300_000).then((d) => {
      setData(d);
      if (d.classes?.length > 0) selectClass(d.classes[0]);
      setLoading(false);
    });
  }, [selectClass]);

  async function handlePost() {
    if (!newAnnouncement.trim() || !selectedClass) return;
    setPosting(true);
    await fetch("/api/teacher/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClass.id, content: newAnnouncement }),
    });
    setNewAnnouncement("");
    invalidateCache(`/api/teacher/announcements?classId=${selectedClass.id}`);
    await loadAnnouncements(selectedClass.id);
    setPosting(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/teacher/announcements?id=${id}`, { method: "DELETE" });
    invalidateCache(`/api/teacher/announcements?classId=${selectedClass?.id}`);
    if (selectedClass) await loadAnnouncements(selectedClass.id);
    setDeletingId(null);
  }

  if (loading) {
    return (
      <div className="tc-shell" dir="rtl">
        <div className="tc-loading">
          <div className="tc-spin" />
          <span>جارٍ التحميل...</span>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="tc-shell" dir="rtl">

      {/* ── Page header ── */}
      <div className="tc-page-header">
        <div>
          <p className="tc-eyebrow">فصولي الدراسية</p>
          <h1 className="tc-page-title">إدارة الفصول</h1>
        </div>
        <div className="tc-header-stat">
          <span className="tc-header-stat-num">{data?.classes.length ?? 0}</span>
          <span className="tc-header-stat-lbl">فصل</span>
        </div>
      </div>

      {!data?.classes.length ? (
        <div className="tc-empty">
          <div className="tc-empty-icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
            </svg>
          </div>
          <h3>لم يتم تعيينك في أي فصل بعد</h3>
          <p>تواصل مع مدير المدرسة</p>
        </div>
      ) : (
        <>
          {/* ── Class tabs ── */}
          <div className="tc-tabs">
            {data.classes.map((cls) => (
              <button key={cls.id} className={`tc-tab ${selectedClass?.id === cls.id ? "active" : ""}`} onClick={() => selectClass(cls)}>
                <span className="tc-tab-name">{cls.name}</span>
                <span className="tc-tab-count">{cls.students.length}</span>
              </button>
            ))}
          </div>

          {selectedClass && (
            <div className="tc-grid">

              {/* ── Students card ── */}
              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </div>
                  <h2 className="tc-card-title">الطلاب</h2>
                  <span className="tc-badge">{selectedClass.students.length}</span>
                </div>
                <div className="tc-students">
                  {selectedClass.students.length === 0 ? (
                    <div className="tc-inner-empty">لا يوجد طلاب في هذا الفصل</div>
                  ) : (
                    selectedClass.students.map((s, i) => (
                      <div key={s.id} className="tc-student-row" style={{ animationDelay: `${i * 33}ms` }}>
                        <div className="tc-student-av">{s.profile.full_name.charAt(0)}</div>
                        <span className="tc-student-name">{s.profile.full_name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── Announcements card ── */}
              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 01-3.46 0"/>
                    </svg>
                  </div>
                  <h2 className="tc-card-title">الإعلانات</h2>
                  <span className="tc-badge">{announcements.length}</span>
                </div>

                <div className="tc-composer">
                  <textarea
                    className="tc-textarea"
                    placeholder="اكتب إعلاناً للفصل..."
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    rows={3}
                    dir="rtl"
                  />
                  <button className="tc-post-btn" onClick={handlePost} disabled={posting || !newAnnouncement.trim()}>
                    {posting ? (
                      <><div className="tc-btn-spin" />جارٍ النشر...</>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        نشر الإعلان
                      </>
                    )}
                  </button>
                </div>

                <div className="tc-ann-list">
                  {annLoading ? (
                    <div className="tc-loading sm"><div className="tc-spin" /></div>
                  ) : announcements.length === 0 ? (
                    <div className="tc-inner-empty">لا توجد إعلانات بعد</div>
                  ) : (
                    announcements.map((a) => (
                      <div key={a.id} className={`tc-ann-item ${deletingId === a.id ? "deleting" : ""}`}>
                        <div className="tc-ann-bar" />
                        <div className="tc-ann-body">
                          <p className="tc-ann-text">{a.content}</p>
                          <div className="tc-ann-foot">
                            <div className="tc-ann-meta">
                              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                              {a.teacher.profile.full_name}
                              <span className="tc-ann-dot" />
                              {new Date(a.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                            </div>
                            <button className="tc-del-ann" onClick={() => handleDelete(a.id)} disabled={deletingId === a.id}>
                              {deletingId === a.id ? <div className="tc-spin sm" /> : "حذف"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes sp{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeOut{to{opacity:0;transform:scale(0.97)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}

  .tc-shell{display:flex;flex-direction:column;gap:20px;font-family:'Cairo',Tajawal,sans-serif;min-height:100%;background:#F6F4EE;padding:28px 24px}

  /* Loading */
  .tc-loading{display:flex;align-items:center;gap:10px;height:160px;justify-content:center;color:#9A8A70;font-size:14px}
  .tc-loading.sm{height:60px;justify-content:center}
  .tc-spin{width:18px;height:18px;border:2px solid rgba(200,169,106,0.2);border-top-color:#C8A96A;border-radius:50%;animation:sp 0.7s linear infinite;flex-shrink:0}
  .tc-spin.sm{width:13px;height:13px}

  /* Page header */
  .tc-page-header{
    background:#0B0B0C;border-radius:20px;padding:22px 28px;
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    position:relative;overflow:hidden;border:1px solid rgba(200,169,106,0.1);
    animation:fadeUp 0.42s ease both;
  }
  .tc-page-header::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#C8A96A 30%,#E5B93C 60%,transparent)}
  .tc-eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(200,169,106,0.5);margin-bottom:5px}
  .tc-page-title{font-size:22px;font-weight:900;color:#C8A96A;letter-spacing:-0.3px}
  .tc-header-stat{display:flex;flex-direction:column;align-items:center;gap:2px;background:rgba(200,169,106,0.08);border:1px solid rgba(200,169,106,0.14);border-radius:12px;padding:12px 18px}
  .tc-header-stat-num{font-size:26px;font-weight:900;color:#C8A96A;line-height:1}
  .tc-header-stat-lbl{font-size:11px;color:rgba(200,169,106,0.45);font-weight:600}

  /* Tabs */
  .tc-tabs{display:flex;gap:6px;flex-wrap:wrap}
  .tc-tab{display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:11px;border:1.5px solid rgba(200,169,106,0.16);background:#FFFDF8;cursor:pointer;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif;font-size:13.5px;font-weight:700;color:#3D2E10}
  .tc-tab:hover{border-color:rgba(200,169,106,0.35);background:rgba(200,169,106,0.05)}
  .tc-tab.active{background:#0B0B0C;border-color:#0B0B0C;color:#C8A96A;box-shadow:0 4px 14px rgba(8,11,12,0.18)}
  .tc-tab-count{font-size:11px;font-weight:800;padding:1px 7px;border-radius:99px;background:rgba(200,169,106,0.12);color:#A8863E}
  .tc-tab.active .tc-tab-count{background:rgba(200,169,106,0.14);color:#C8A96A}

  /* Grid */
  .tc-grid{display:grid;grid-template-columns:290px 1fr;gap:16px;align-items:start}
  @media(max-width:768px){.tc-grid{grid-template-columns:1fr}}

  /* Card */
  .tc-card{background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);border-radius:18px;overflow:hidden;animation:fadeUp 0.35s ease both}
  .tc-card-head{display:flex;align-items:center;gap:9px;padding:13px 17px;border-bottom:1px solid rgba(200,169,106,0.09);background:rgba(200,169,106,0.03)}
  .tc-card-icon{width:30px;height:30px;border-radius:8px;flex-shrink:0;background:#0B0B0C;border:1px solid rgba(200,169,106,0.18);display:flex;align-items:center;justify-content:center;color:#C8A96A}
  .tc-card-title{font-size:13.5px;font-weight:800;color:#0B0B0C;flex:1}
  .tc-badge{font-size:11px;font-weight:800;color:#A8863E;background:rgba(200,169,106,0.12);border:1px solid rgba(200,169,106,0.2);padding:2px 8px;border-radius:99px}

  /* Students list */
  .tc-students{padding:10px 12px;display:flex;flex-direction:column;gap:3px;max-height:400px;overflow-y:auto}
  .tc-student-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;transition:background 0.14s;animation:fadeUp 0.25s ease both}
  .tc-student-row:hover{background:rgba(200,169,106,0.06)}
  .tc-student-av{width:30px;height:30px;border-radius:50%;flex-shrink:0;background:rgba(200,169,106,0.1);border:1.5px solid rgba(200,169,106,0.18);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#A8863E}
  .tc-student-name{font-size:13px;font-weight:600;color:#3D2E10}
  .tc-inner-empty{text-align:center;color:#9A8A70;font-size:13px;padding:22px 0}

  /* Composer */
  .tc-composer{padding:14px 16px;border-bottom:1px solid rgba(200,169,106,0.09);display:flex;flex-direction:column;gap:10px}
  .tc-textarea{width:100%;padding:11px 13px;background:#F6F4EE;border:1.5px solid rgba(200,169,106,0.15);border-radius:10px;font-size:13px;font-family:'Cairo',Tajawal,sans-serif;color:#0B0B0C;outline:none;resize:none;line-height:1.65;transition:border-color 0.15s,box-shadow 0.15s}
  .tc-textarea:focus{border-color:rgba(200,169,106,0.35);background:#FFFDF8;box-shadow:0 0 0 3px rgba(200,169,106,0.07)}
  .tc-textarea::placeholder{color:#B0A090}
  .tc-post-btn{display:flex;align-items:center;justify-content:center;gap:7px;background:#0B0B0C;color:#C8A96A;padding:10px;border-radius:10px;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif}
  .tc-post-btn:hover:not(:disabled){background:#C8A96A;color:#0B0B0C}
  .tc-post-btn:disabled{opacity:0.4;cursor:not-allowed}
  .tc-btn-spin{width:13px;height:13px;border:2px solid rgba(200,169,106,0.3);border-top-color:#C8A96A;border-radius:50%;animation:sp 0.7s linear infinite}

  /* Ann list */
  .tc-ann-list{padding:8px 14px;display:flex;flex-direction:column;gap:0;max-height:420px;overflow-y:auto}
  .tc-ann-item{display:flex;gap:11px;padding:13px 0;border-bottom:1px solid rgba(200,169,106,0.07);animation:fadeUp 0.25s ease both;transition:opacity 0.3s}
  .tc-ann-item:last-child{border-bottom:none}
  .tc-ann-item.deleting{animation:fadeOut 0.3s ease forwards}
  .tc-ann-bar{width:3px;min-height:36px;background:linear-gradient(180deg,#C8A96A,#E5B93C);border-radius:99px;flex-shrink:0;margin:2px 0}
  .tc-ann-body{flex:1}
  .tc-ann-text{font-size:13.5px;color:#1A1208;line-height:1.65;margin-bottom:9px}
  .tc-ann-foot{display:flex;align-items:center;justify-content:space-between}
  .tc-ann-meta{display:flex;align-items:center;gap:5px;font-size:11px;color:#A8863E;font-weight:600}
  .tc-ann-dot{width:3px;height:3px;border-radius:50%;background:rgba(200,169,106,0.4)}
  .tc-del-ann{background:none;border:1px solid rgba(200,169,106,0.2);color:#9A8A70;font-size:12px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:7px;transition:all 0.14s;font-family:'Cairo',Tajawal,sans-serif;display:flex;align-items:center}
  .tc-del-ann:hover:not(:disabled){border-color:rgba(200,169,106,0.35);color:#A8863E;background:rgba(200,169,106,0.06)}
  .tc-del-ann:disabled{opacity:0.4;cursor:not-allowed}

  /* Empty */
  .tc-empty{background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);border-radius:18px;padding:56px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;animation:fadeUp 0.4s ease both}
  .tc-empty-icon{color:rgba(200,169,106,0.35)}
  .tc-empty h3{font-size:16px;font-weight:800;color:#0B0B0C}
  .tc-empty p{font-size:13px;color:#9A8A70}
`;
