"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Clock3, Film, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import type { WorkshopVideo, WorkshopVideoQuestion } from "@/lib/workshop-videos";
import { VideoQuestionModal } from "./video-question-modal";
import { VideoResultsModal } from "./video-results-modal";

const T = {
  ar: {
    title: "الفيديوهات التفاعلية",
    help: "ارفع فيديو وأضف أسئلة اختيار من متعدد أو صح/خطأ تظهر في لحظات محددة أثناء التشغيل. سيتوقف الفيديو تلقائياً عند كل سؤال حتى يجيب المعلم.",
    upload: "رفع فيديو",
    uploading: "جارٍ الرفع...",
    titlePh: "عنوان الفيديو",
    noVideos: "لم تتم إضافة أي فيديو بعد.",
    questions: (n: number) => `${n} سؤال`,
    addQuestion: "إضافة سؤال",
    editQuestion: "تعديل",
    deleteQuestion: "حذف",
    deleteVideo: "حذف الفيديو",
    results: "النتائج",
    at: "عند",
    mcq: "اختيار من متعدد",
    tf: "صح / خطأ",
    confirmDeleteVideo: "سيتم حذف هذا الفيديو وكل أسئلته ونتائج المعلمين المرتبطة به. المتابعة؟",
    confirmDeleteQuestion: "حذف هذا السؤال؟",
    error: "حدث خطأ. حاول مرة أخرى.",
    tooLarge: "الملف كبير جداً (الحد الأقصى 350MB).",
    mustBeVideo: "يجب اختيار ملف فيديو.",
  },
  sq: {
    title: "Videot interaktive",
    help: "Ngarko një video dhe shto pyetje me shumë opsione ose të saktë/gabuar që shfaqen në momente të caktuara. Video ndalon automatikisht te çdo pyetje derisa mësuesi të përgjigjet.",
    upload: "Ngarko video",
    uploading: "Duke ngarkuar...",
    titlePh: "Titulli i videos",
    noVideos: "Nuk ka video ende.",
    questions: (n: number) => `${n} pyetje`,
    addQuestion: "Shto pyetje",
    editQuestion: "Modifiko",
    deleteQuestion: "Fshi",
    deleteVideo: "Fshi videon",
    results: "Rezultatet",
    at: "te",
    mcq: "Shumë opsione",
    tf: "E saktë / E gabuar",
    confirmDeleteVideo: "Kjo do të fshijë videon, pyetjet dhe rezultatet e mësuesve. Vazhdo?",
    confirmDeleteQuestion: "Ta fshijmë këtë pyetje?",
    error: "Ndodhi një gabim. Provo përsëri.",
    tooLarge: "Skedari është shumë i madh (max 350MB).",
    mustBeVideo: "Duhet të zgjedhësh një skedar video.",
  },
} as const;

function fmtTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoManager({ workshopId, viewOnly, lang }: { workshopId: string; viewOnly: boolean; lang: "ar" | "sq" }) {
  const t = T[lang];
  const confirm = useConfirm();

  const [videos, setVideos] = useState<WorkshopVideo[] | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingTitle, setPendingTitle] = useState("");
  const [questionModal, setQuestionModal] = useState<{ videoId: string; question?: WorkshopVideoQuestion } | null>(null);
  const [resultsFor, setResultsFor] = useState<{ videoId: string; title: string } | null>(null);
  const [busyVideo, setBusyVideo] = useState<string | null>(null);
  const [busyQuestion, setBusyQuestion] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/school-admin/workshops/${workshopId}/videos`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setVideos(data.videos ?? []);
    } catch {
      setError(t.error);
    }
  }, [workshopId, t.error]);

  useEffect(() => { void load(); }, [load]);

  async function uploadVideo(file: File) {
    if (viewOnly) return;
    if (!file.type.startsWith("video/")) { setError(t.mustBeVideo); return; }
    if (file.size > 350 * 1024 * 1024) { setError(t.tooLarge); return; }
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", pendingTitle.trim() || file.name);
      const res = await fetch(`/api/school-admin/workshops/${workshopId}/videos`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "upload_failed");
      setVideos((cur) => [...(cur ?? []), data.video]);
      setPendingTitle("");
    } catch {
      setError(t.error);
    } finally {
      setUploading(false);
    }
  }

  async function deleteVideo(videoId: string) {
    if (viewOnly) return;
    const approved = await confirm({ message: t.confirmDeleteVideo });
    if (!approved) return;
    setBusyVideo(videoId);
    try {
      const res = await fetch(`/api/school-admin/workshops/${workshopId}/videos/${videoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      setVideos((cur) => (cur ?? []).filter((v) => v.id !== videoId));
    } catch {
      setError(t.error);
    } finally {
      setBusyVideo(null);
    }
  }

  async function deleteQuestion(videoId: string, questionId: string) {
    if (viewOnly) return;
    const approved = await confirm({ message: t.confirmDeleteQuestion });
    if (!approved) return;
    setBusyQuestion(questionId);
    try {
      const res = await fetch(`/api/school-admin/workshops/videos/questions/${questionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      setVideos((cur) => (cur ?? []).map((v) => v.id === videoId ? { ...v, questions: v.questions.filter((q) => q.id !== questionId) } : v));
    } catch {
      setError(t.error);
    } finally {
      setBusyQuestion(null);
    }
  }

  function onQuestionSaved(videoId: string, question: WorkshopVideoQuestion) {
    setVideos((cur) => (cur ?? []).map((v) => {
      if (v.id !== videoId) return v;
      const exists = v.questions.some((q) => q.id === question.id);
      const questions = exists
        ? v.questions.map((q) => q.id === question.id ? question : q)
        : [...v.questions, question];
      questions.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
      return { ...v, questions };
    }));
  }

  return (
    <section className="vm-card">
      <div className="vm-head">
        <div><h2>{t.title}</h2><p>{t.help}</p></div>
        {!viewOnly && (
          <div className="vm-upload">
            <input
              className="vm-title-input"
              placeholder={t.titlePh}
              value={pendingTitle}
              onChange={(e) => setPendingTitle(e.target.value)}
            />
            <label className="vm-upload-btn">
              <Upload size={14} />{uploading ? t.uploading : t.upload}
              <input hidden type="file" accept="video/*" disabled={uploading} onChange={(e) => e.target.files?.[0] && void uploadVideo(e.target.files[0])} />
            </label>
          </div>
        )}
      </div>

      {error && <p className="vm-error">{error}</p>}

      {!videos ? (
        <MandalaLoader />
      ) : videos.length === 0 ? (
        <div className="vm-empty"><Film size={22} />{t.noVideos}</div>
      ) : (
        <div className="vm-videos">
          {videos.map((video) => (
            <article key={video.id} className="vm-video">
              <div className="vm-video-head">
                <video src={video.url} controls preload="metadata" className="vm-preview" />
                <div className="vm-video-info">
                  <strong>{video.title}</strong>
                  <span>{t.questions(video.questions.length)}</span>
                </div>
                <div className="vm-video-actions">
                  <button className="vm-icon-btn" onClick={() => setResultsFor({ videoId: video.id, title: video.title })} title={t.results}>
                    <BarChart3 size={15} />
                  </button>
                  {!viewOnly && (
                    <button className="vm-icon-btn danger" onClick={() => void deleteVideo(video.id)} disabled={busyVideo === video.id} title={t.deleteVideo}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="vm-questions">
                {video.questions.map((question) => (
                  <div key={question.id} className="vm-question">
                    <span className="vm-question-time"><Clock3 size={12} />{fmtTime(question.timestamp_seconds)}</span>
                    <span className="vm-question-type">{question.type === "MCQ" ? t.mcq : t.tf}</span>
                    <p>{question.text}</p>
                    {!viewOnly && (
                      <div className="vm-question-actions">
                        <button onClick={() => setQuestionModal({ videoId: video.id, question })} title={t.editQuestion}><Pencil size={13} /></button>
                        <button onClick={() => void deleteQuestion(video.id, question.id)} disabled={busyQuestion === question.id} title={t.deleteQuestion}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
                {!viewOnly && (
                  <button className="vm-add-question" onClick={() => setQuestionModal({ videoId: video.id })}>
                    <Plus size={14} />{t.addQuestion}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {questionModal && (
        <VideoQuestionModal
          workshopId={workshopId}
          videoId={questionModal.videoId}
          question={questionModal.question}
          lang={lang}
          onClose={() => setQuestionModal(null)}
          onSaved={(question) => onQuestionSaved(questionModal.videoId, question)}
        />
      )}

      {resultsFor && (
        <VideoResultsModal
          workshopId={workshopId}
          videoId={resultsFor.videoId}
          videoTitle={resultsFor.title}
          lang={lang}
          onClose={() => setResultsFor(null)}
        />
      )}

      <style>{styles}</style>
    </section>
  );
}

const styles = `
.vm-card{background:#FFFBF5;border:1px solid rgba(184,155,94,.20);border-radius:22px;padding:clamp(15px,2.3vw,24px);box-shadow:0 16px 42px rgba(50,16,26,.075);margin-bottom:14px;font-family:'Cairo',sans-serif;color:#32101A}
.vm-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(184,155,94,.14)}
.vm-head h2{margin:0 0 4px;font-size:18px;font-weight:900}
.vm-head p{margin:0;max-width:640px;color:#655B53;font-size:12.5px;line-height:1.75}
.vm-upload{display:flex;gap:8px;flex-wrap:wrap}
.vm-title-input{border:1px solid #D9C9B0;border-radius:10px;padding:9px 11px;font:inherit;font-size:12px;min-width:180px}
.vm-upload-btn{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:11px;padding:10px 15px;background:linear-gradient(135deg,#32101A,#6B1E2D);color:#F7F3EB;font:800 12px 'Cairo',sans-serif;cursor:pointer;white-space:nowrap}
.vm-error{margin:0 0 12px;padding:9px 11px;border-radius:10px;background:rgba(107,30,45,.08);color:#6B1E2D;font-size:11.5px;font-weight:700}
.vm-empty{min-height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;border:1px dashed rgba(184,155,94,.34);border-radius:14px;color:#8C8274;font-weight:800;background:rgba(194,160,89,.04)}
.vm-videos{display:flex;flex-direction:column;gap:14px}
.vm-video{border:1px solid #E5E0D5;border-radius:16px;background:#fff;overflow:hidden}
.vm-video-head{display:grid;grid-template-columns:200px 1fr auto;gap:14px;align-items:center;padding:12px}
.vm-preview{width:200px;height:112px;border-radius:10px;background:#000;object-fit:cover}
.vm-video-info{min-width:0;display:flex;flex-direction:column;gap:4px}
.vm-video-info strong{font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vm-video-info span{font-size:11px;color:#796A62;font-weight:700}
.vm-video-actions{display:flex;gap:6px}
.vm-icon-btn{width:34px;height:34px;display:grid;place-items:center;border:1px solid #D9C9B0;border-radius:10px;background:#F7F3EB;color:#6B1E2D;cursor:pointer}
.vm-icon-btn.danger:hover{background:#6B1E2D;color:#fff}
.vm-icon-btn:disabled{opacity:.5;cursor:progress}
.vm-questions{border-top:1px solid #EFE9DC;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.vm-question{display:grid;grid-template-columns:64px 90px 1fr auto;gap:9px;align-items:center;padding:8px 10px;border-radius:9px;background:#F7F3EB}
.vm-question-time{display:inline-flex;align-items:center;gap:4px;font:800 10px ui-monospace,Consolas,monospace;color:#6B1E2D}
.vm-question-type{font-size:9px;font-weight:900;color:#8C8274;text-transform:uppercase}
.vm-question p{margin:0;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vm-question-actions{display:flex;gap:5px}
.vm-question-actions button{width:26px;height:26px;display:grid;place-items:center;border:0;border-radius:7px;background:#fff;color:#6B1E2D;cursor:pointer;border:1px solid #E5E0D5}
.vm-add-question{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;border:1px dashed rgba(107,30,45,.3);border-radius:10px;background:none;color:#6B1E2D;padding:8px 12px;font:800 11px 'Cairo',sans-serif;cursor:pointer;margin-top:2px}
@media(max-width:720px){.vm-video-head{grid-template-columns:1fr;}.vm-preview{width:100%;height:170px}.vm-question{grid-template-columns:1fr;gap:4px}}
`;
