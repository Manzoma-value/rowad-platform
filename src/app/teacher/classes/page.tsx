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
    const data = await cachedFetch<Announcement[]>(
      `/api/teacher/announcements?classId=${classId}`,
      30_000,
    );
    setAnnouncements(data);
    setAnnLoading(false);
  }, []);

  const selectClass = useCallback(
    async (cls: ClassItem) => {
      setSelectedClass(cls);
      await loadAnnouncements(cls.id);
    },
    [loadAnnouncements],
  );

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
      body: JSON.stringify({
        classId: selectedClass.id,
        content: newAnnouncement,
      }),
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

  if (loading)
    return (
      <div className="tc-loading">
        <div className="spin" />
        جارٍ التحميل...<style>{styles}</style>
      </div>
    );

  return (
    <div className="tc-shell" dir="rtl">
      <div className="tc-header">
        <h1 className="tc-title">فصولي</h1>
        <p className="tc-sub">{data?.classes.length ?? 0} فصل مُعيَّن لك</p>
      </div>

      {!data?.classes.length ? (
        <div className="tc-empty">
          <div className="tc-empty-icon">📚</div>
          <h3>لم يتم تعيينك في أي فصل بعد</h3>
          <p>تواصل مع مدير المدرسة</p>
        </div>
      ) : (
        <>
          <div className="tc-tabs">
            {data.classes.map((cls) => (
              <button
                key={cls.id}
                className={`tc-tab ${selectedClass?.id === cls.id ? "active" : ""}`}
                onClick={() => selectClass(cls)}
              >
                <span className="tc-tab-name">{cls.name}</span>
                <span className="tc-tab-count">{cls.students.length}</span>
              </button>
            ))}
          </div>

          {selectedClass && (
            <div className="tc-grid">
              {/* Students */}
              <div className="tc-card">
                <div className="tc-card-header">
                  <div className="tc-card-icon">👥</div>
                  <h2 className="tc-card-title">الطلاب</h2>
                  <span className="tc-card-badge">
                    {selectedClass.students.length}
                  </span>
                </div>
                <div className="tc-students">
                  {selectedClass.students.length === 0 ? (
                    <div className="tc-inner-empty">
                      لا يوجد طلاب في هذا الفصل
                    </div>
                  ) : (
                    selectedClass.students.map((s, i) => (
                      <div
                        key={s.id}
                        className="tc-student-row"
                        style={{ animationDelay: `${i * 35}ms` }}
                      >
                        <div className="tc-student-avatar">
                          {s.profile.full_name.charAt(0)}
                        </div>
                        <span className="tc-student-name">
                          {s.profile.full_name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Announcements */}
              <div className="tc-card">
                <div className="tc-card-header">
                  <div className="tc-card-icon">📢</div>
                  <h2 className="tc-card-title">الإعلانات</h2>
                  <span className="tc-card-badge">{announcements.length}</span>
                </div>

                <div className="tc-ann-composer">
                  <textarea
                    className="tc-textarea"
                    placeholder="اكتب إعلاناً للفصل..."
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    rows={3}
                    dir="rtl"
                  />
                  <button
                    className="tc-post-btn"
                    onClick={handlePost}
                    disabled={posting || !newAnnouncement.trim()}
                  >
                    {posting ? (
                      <>
                        <div className="tc-btn-spin" />
                        جارٍ النشر...
                      </>
                    ) : (
                      "نشر الإعلان"
                    )}
                  </button>
                </div>

                <div className="tc-ann-list">
                  {annLoading ? (
                    <div className="tc-loading sm">
                      <div className="spin" />
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="tc-inner-empty">لا توجد إعلانات بعد</div>
                  ) : (
                    announcements.map((a) => (
                      <div
                        key={a.id}
                        className={`tc-ann-item ${deletingId === a.id ? "deleting" : ""}`}
                      >
                        <p className="tc-ann-content">{a.content}</p>
                        <div className="tc-ann-footer">
                          <div className="tc-ann-meta">
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
                            {a.teacher.profile.full_name}
                            <span className="tc-ann-dot" />
                            {new Date(a.created_at).toLocaleDateString(
                              "ar-SA",
                              { month: "short", day: "numeric" },
                            )}
                          </div>
                          <button
                            className="tc-del-ann-btn"
                            onClick={() => handleDelete(a.id)}
                            disabled={deletingId === a.id}
                          >
                            {deletingId === a.id ? (
                              <div className="spin sm" />
                            ) : (
                              "حذف"
                            )}
                          </button>
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
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes sp{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeOut{to{opacity:0;transform:scale(0.97)}}
  .tc-shell{display:flex;flex-direction:column;gap:20px;font-family:Tajawal,sans-serif}
  .tc-loading{display:flex;align-items:center;gap:10px;height:160px;justify-content:center;color:#6b7280;font-size:14px}
  .tc-loading.sm{height:60px;justify-content:center}
  .spin{width:18px;height:18px;border:2px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:sp 0.7s linear infinite;flex-shrink:0}
  .spin.sm{width:13px;height:13px}
  .tc-header{display:flex;flex-direction:column;gap:2px}
  .tc-title{font-size:21px;font-weight:800;color:var(--text)}
  .tc-sub{font-size:13px;color:var(--text2)}
  .tc-tabs{display:flex;gap:6px;flex-wrap:wrap}
  .tc-tab{display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:10px;border:1.5px solid #e5e7eb;background:white;cursor:pointer;transition:all 0.15s;font-family:Tajawal,sans-serif;font-size:13.5px;font-weight:600;color:#374151}
  .tc-tab:hover{border-color:#9ca3af}
  .tc-tab.active{background:#111827;border-color:#111827;color:white}
  .tc-tab-count{font-size:11px;font-weight:700;padding:1px 7px;border-radius:99px;background:rgba(255,255,255,0.15);color:inherit}
  .tc-tab:not(.active) .tc-tab-count{background:#f1f3f6;color:#6b7280}
  .tc-grid{display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start}
  @media(max-width:768px){.tc-grid{grid-template-columns:1fr}}
  .tc-card{background:white;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden}
  .tc-card-header{display:flex;align-items:center;gap:9px;padding:14px 18px;border-bottom:1px solid #f1f3f6}
  .tc-card-icon{font-size:18px}
  .tc-card-title{font-size:14px;font-weight:800;color:var(--text,#111827);flex:1}
  .tc-card-badge{font-size:11px;font-weight:700;color:#6b7280;background:#f1f3f6;padding:2px 8px;border-radius:99px}
  .tc-students{padding:10px 14px;display:flex;flex-direction:column;gap:4px;max-height:400px;overflow-y:auto}
  .tc-student-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;transition:background 0.15s;animation:fadeUp 0.25s ease both}
  .tc-student-row:hover{background:#f7f8fa}
  .tc-student-avatar{width:30px;height:30px;border-radius:8px;flex-shrink:0;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white}
  .tc-student-name{font-size:13px;font-weight:600;color:#374151}
  .tc-ann-composer{padding:14px 16px;border-bottom:1px solid #f1f3f6;display:flex;flex-direction:column;gap:10px}
  .tc-textarea{width:100%;padding:10px 12px;background:#f7f8fa;border:1.5px solid #e5e7eb;border-radius:9px;font-size:13px;font-family:Tajawal,sans-serif;color:#111827;outline:none;resize:none;line-height:1.6;transition:border-color 0.15s}
  .tc-textarea:focus{border-color:#2563eb;background:white}
  .tc-post-btn{display:flex;align-items:center;justify-content:center;gap:7px;background:#111827;color:white;padding:10px;border-radius:9px;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:Tajawal,sans-serif}
  .tc-post-btn:hover:not(:disabled){background:#1f2937}
  .tc-post-btn:disabled{opacity:0.4;cursor:not-allowed}
  .tc-btn-spin{width:13px;height:13px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:sp 0.7s linear infinite}
  .tc-ann-list{padding:10px 14px;display:flex;flex-direction:column;gap:8px;max-height:420px;overflow-y:auto}
  .tc-ann-item{padding:13px 14px;border-radius:11px;border:1px solid #f1f3f6;background:#fafafa;animation:fadeUp 0.25s ease both;transition:border-color 0.15s}
  .tc-ann-item:hover{border-color:#e5e7eb}
  .tc-ann-item.deleting{animation:fadeOut 0.3s ease forwards}
  .tc-ann-content{font-size:13.5px;color:#111827;line-height:1.65;margin-bottom:10px}
  .tc-ann-footer{display:flex;align-items:center;justify-content:space-between}
  .tc-ann-meta{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#9ca3af;font-weight:500}
  .tc-ann-dot{width:3px;height:3px;border-radius:50%;background:#d1d5db}
  .tc-del-ann-btn{background:none;border:none;color:#ef4444;font-size:12px;font-weight:600;cursor:pointer;padding:3px 8px;border-radius:6px;transition:background 0.15s;font-family:Tajawal,sans-serif;display:flex;align-items:center}
  .tc-del-ann-btn:hover:not(:disabled){background:rgba(239,68,68,0.08)}
  .tc-del-ann-btn:disabled{opacity:0.4;cursor:not-allowed}
  .tc-empty{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:52px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
  .tc-empty-icon{font-size:38px}
  .tc-empty h3{font-size:16px;font-weight:800;color:#111827}
  .tc-empty p{font-size:13px;color:#6b7280}
  .tc-inner-empty{text-align:center;color:#9ca3af;font-size:13px;padding:20px 0}
`;
