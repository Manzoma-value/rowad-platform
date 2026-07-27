"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, Clock3, Film, HelpCircle, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import { uploadWorkshopVideo } from "@/lib/upload-workshop-video";
import {
  formatFileSize,
  formatVideoTime,
  type WorkshopVideo,
  type WorkshopVideoQuestion,
} from "@/lib/workshop-videos";
import { VideoQuestionModal } from "./video-question-modal";
import { VideoResultsModal } from "./video-results-modal";

const T = {
  ar: {
    title: "الفيديوهات التفاعلية",
    help: "ارفع فيديو وثبّت عليه أسئلة اختيار من متعدد أو صح/خطأ. أثناء المشاهدة يتوقف الفيديو تلقائياً عند كل سؤال ولا يكمل حتى يجيب المعلم.",
    upload: "رفع فيديو",
    uploading: "جارٍ الرفع",
    titlePh: "عنوان الفيديو (اختياري)",
    noVideos: "لم تتم إضافة أي فيديو بعد.",
    noVideosHint: "اختر ملف فيديو لبدء أول فيديو تفاعلي في هذه الورشة.",
    questionCount: (n: number) => (n === 0 ? "بدون أسئلة" : n === 1 ? "سؤال واحد" : `${n} أسئلة`),
    noQuestionsWarn: "أضف سؤالاً واحداً على الأقل حتى يتوقف الفيديو أثناء المشاهدة.",
    addQuestion: "إضافة سؤال",
    editQuestion: "تعديل السؤال",
    deleteQuestion: "حذف السؤال",
    deleteVideo: "حذف الفيديو",
    results: "من شاهد وأجاب",
    mcq: "اختيار",
    tf: "صح/خطأ",
    confirmDeleteVideo: "سيتم حذف هذا الفيديو وكل أسئلته ونتائج المعلمين المرتبطة به. المتابعة؟",
    confirmDeleteQuestion: "حذف هذا السؤال؟",
    error: "حدث خطأ. حاول مرة أخرى.",
    tooLarge: "الملف كبير جداً (الحد الأقصى 350 ميجابايت).",
    mustBeVideo: "يجب اختيار ملف فيديو.",
    uploadFailed: "تعذر رفع الفيديو. تحقق من الاتصال وحاول مرة أخرى.",
  },
  sq: {
    title: "Videot interaktive",
    help: "Ngarko një video dhe vendos mbi të pyetje me shumë opsione ose të saktë/gabuar. Gjatë shikimit video ndalon te çdo pyetje dhe nuk vazhdon derisa mësuesi të përgjigjet.",
    upload: "Ngarko video",
    uploading: "Duke ngarkuar",
    titlePh: "Titulli i videos (opsional)",
    noVideos: "Nuk ka video ende.",
    noVideosHint: "Zgjidh një skedar video për të nisur videon e parë interaktive.",
    questionCount: (n: number) => (n === 0 ? "Pa pyetje" : n === 1 ? "1 pyetje" : `${n} pyetje`),
    noQuestionsWarn: "Shto të paktën një pyetje që video të ndalojë gjatë shikimit.",
    addQuestion: "Shto pyetje",
    editQuestion: "Modifiko pyetjen",
    deleteQuestion: "Fshi pyetjen",
    deleteVideo: "Fshi videon",
    results: "Kush e pa dhe u përgjigj",
    mcq: "Opsione",
    tf: "Saktë/Gabim",
    confirmDeleteVideo: "Kjo do të fshijë videon, pyetjet dhe rezultatet e mësuesve. Vazhdo?",
    confirmDeleteQuestion: "Ta fshijmë këtë pyetje?",
    error: "Ndodhi një gabim. Provo përsëri.",
    tooLarge: "Skedari është shumë i madh (max 350 MB).",
    mustBeVideo: "Duhet të zgjedhësh një skedar video.",
    uploadFailed: "Ngarkimi dështoi. Kontrollo lidhjen dhe provo përsëri.",
  },
} as const;

type QuestionModalState = { video: WorkshopVideo; question?: WorkshopVideoQuestion };

export function VideoManager({ workshopId, viewOnly, lang }: { workshopId: string; viewOnly: boolean; lang: "ar" | "sq" }) {
  const t = T[lang];
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [videos, setVideos] = useState<WorkshopVideo[] | null>(null);
  const [error, setError] = useState("");
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [pendingTitle, setPendingTitle] = useState("");
  const [questionModal, setQuestionModal] = useState<QuestionModalState | null>(null);
  const [resultsFor, setResultsFor] = useState<WorkshopVideo | null>(null);
  const [busyVideo, setBusyVideo] = useState<string | null>(null);
  const [busyQuestion, setBusyQuestion] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/school-admin/workshops/${workshopId}/videos`, { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const payload = await response.json();
      setVideos(payload.videos ?? []);
    } catch {
      setVideos([]);
      setError(t.error);
    }
  }, [workshopId, t.error]);

  useEffect(() => { void load(); }, [load]);

  async function handleFile(file: File) {
    if (viewOnly) return;
    setError("");
    if (!file.type.startsWith("video/")) { setError(t.mustBeVideo); return; }
    setUploadPercent(0);
    try {
      const video = await uploadWorkshopVideo({
        workshopId,
        file,
        title: pendingTitle.trim() || file.name,
        onProgress: setUploadPercent,
      });
      setVideos((current) => [...(current ?? []), video]);
      setPendingTitle("");
    } catch (uploadError) {
      const code = uploadError instanceof Error ? uploadError.message : "";
      setError(code === "too_large" ? t.tooLarge : code === "not_video" ? t.mustBeVideo : t.uploadFailed);
    } finally {
      setUploadPercent(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteVideo(videoId: string) {
    if (viewOnly) return;
    if (!(await confirm({ message: t.confirmDeleteVideo }))) return;
    setBusyVideo(videoId);
    try {
      const response = await fetch(`/api/school-admin/workshops/${workshopId}/videos/${videoId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("failed");
      setVideos((current) => (current ?? []).filter((video) => video.id !== videoId));
    } catch {
      setError(t.error);
    } finally {
      setBusyVideo(null);
    }
  }

  async function deleteQuestion(videoId: string, questionId: string) {
    if (viewOnly) return;
    if (!(await confirm({ message: t.confirmDeleteQuestion }))) return;
    setBusyQuestion(questionId);
    try {
      const response = await fetch(`/api/school-admin/workshops/videos/questions/${questionId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("failed");
      setVideos((current) => (current ?? []).map((video) => video.id === videoId
        ? { ...video, questions: video.questions.filter((question) => question.id !== questionId) }
        : video));
    } catch {
      setError(t.error);
    } finally {
      setBusyQuestion(null);
    }
  }

  function onQuestionSaved(videoId: string, question: WorkshopVideoQuestion) {
    setVideos((current) => (current ?? []).map((video) => {
      if (video.id !== videoId) return video;
      const exists = video.questions.some((item) => item.id === question.id);
      const questions = exists
        ? video.questions.map((item) => (item.id === question.id ? question : item))
        : [...video.questions, question];
      return { ...video, questions: [...questions].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds) };
    }));
  }

  const uploading = uploadPercent !== null;

  return (
    <section className="vm-card">
      <header className="vm-head">
        <div className="vm-head-text">
          <h2><Film size={18} />{t.title}</h2>
          <p>{t.help}</p>
        </div>
        {!viewOnly && (
          <div className="vm-upload">
            <input
              className="vm-title-input"
              placeholder={t.titlePh}
              value={pendingTitle}
              onChange={(event) => setPendingTitle(event.target.value)}
              disabled={uploading}
            />
            <label className={`vm-upload-btn${uploading ? " busy" : ""}`}>
              <Upload size={15} />
              <span>{uploading ? `${t.uploading} ${uploadPercent}%` : t.upload}</span>
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept="video/*"
                disabled={uploading}
                onChange={(event) => event.target.files?.[0] && void handleFile(event.target.files[0])}
              />
            </label>
          </div>
        )}
      </header>

      {uploading && (
        <div className="vm-progress" role="progressbar" aria-valuenow={uploadPercent} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${uploadPercent}%` }} />
        </div>
      )}
      {error && <p className="vm-error" role="alert">{error}</p>}

      {!videos ? (
        <MandalaLoader />
      ) : videos.length === 0 ? (
        <div className="vm-empty">
          <Film size={26} />
          <strong>{t.noVideos}</strong>
          <p>{t.noVideosHint}</p>
        </div>
      ) : (
        <div className="vm-videos">
          {videos.map((video) => (
            <article key={video.id} className="vm-video">
              <div className="vm-video-top">
                <video src={video.url} controls playsInline preload="metadata" className="vm-preview" />
                <div className="vm-video-body">
                  <div className="vm-video-title">
                    <strong>{video.title}</strong>
                    <div className="vm-video-tags">
                      <span className={`vm-tag${video.questions.length === 0 ? " warn" : ""}`}>
                        <HelpCircle size={11} />{t.questionCount(video.questions.length)}
                      </span>
                      {video.duration_seconds ? <span className="vm-tag"><Clock3 size={11} />{formatVideoTime(video.duration_seconds)}</span> : null}
                      {video.size_bytes ? <span className="vm-tag">{formatFileSize(video.size_bytes)}</span> : null}
                    </div>
                  </div>
                  <div className="vm-video-actions">
                    <button className="vm-btn ghost" onClick={() => setResultsFor(video)}>
                      <BarChart3 size={14} /><span>{t.results}</span>
                    </button>
                    {!viewOnly && (
                      <>
                        <button className="vm-btn" onClick={() => setQuestionModal({ video })}>
                          <Plus size={14} /><span>{t.addQuestion}</span>
                        </button>
                        <button
                          className="vm-icon-btn danger"
                          onClick={() => void deleteVideo(video.id)}
                          disabled={busyVideo === video.id}
                          aria-label={t.deleteVideo}
                          title={t.deleteVideo}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {video.questions.length === 0 ? (
                <p className="vm-no-questions">{t.noQuestionsWarn}</p>
              ) : (
                <ol className="vm-questions">
                  {video.questions.map((question) => (
                    <li key={question.id} className="vm-question">
                      <span className="vm-q-time"><Clock3 size={11} />{formatVideoTime(question.timestamp_seconds)}</span>
                      <span className="vm-q-type">{question.type === "MCQ" ? t.mcq : t.tf}</span>
                      <p title={question.text}>{question.text}</p>
                      {!viewOnly && (
                        <span className="vm-q-actions">
                          <button onClick={() => setQuestionModal({ video, question })} aria-label={t.editQuestion} title={t.editQuestion}>
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => void deleteQuestion(video.id, question.id)}
                            disabled={busyQuestion === question.id}
                            aria-label={t.deleteQuestion}
                            title={t.deleteQuestion}
                          >
                            <Trash2 size={13} />
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </article>
          ))}
        </div>
      )}

      {questionModal && (
        <VideoQuestionModal
          workshopId={workshopId}
          videoId={questionModal.video.id}
          videoUrl={questionModal.video.url}
          videoDuration={questionModal.video.duration_seconds}
          question={questionModal.question}
          lang={lang}
          onClose={() => setQuestionModal(null)}
          onSaved={(question) => onQuestionSaved(questionModal.video.id, question)}
        />
      )}

      {resultsFor && (
        <VideoResultsModal
          workshopId={workshopId}
          videoId={resultsFor.id}
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
.vm-card{background:#FFFBF5;border:1px solid rgba(184,155,94,.2);border-radius:22px;padding:clamp(15px,2.3vw,24px);box-shadow:0 16px 42px rgba(50,16,26,.075);margin-bottom:14px;font-family:'Cairo',sans-serif;color:#32101A}
.vm-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px;padding-bottom:13px;border-bottom:1px solid rgba(184,155,94,.16)}
.vm-head-text{min-width:min(260px,100%);flex:1}
.vm-head h2{display:flex;align-items:center;gap:8px;margin:0 0 5px;font-size:18px;font-weight:900;color:#32101A}
.vm-head p{margin:0;max-width:620px;color:#655B53;font-size:12.5px;line-height:1.8}
.vm-upload{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.vm-title-input{min-width:190px;min-height:42px;border:1px solid #D7CBB9;border-radius:11px;background:#fff;padding:0 12px;font:inherit;font-size:12.5px;color:#32101A}
.vm-title-input:focus{outline:none;border-color:#6B1E2D;box-shadow:0 0 0 3px rgba(107,30,45,.1)}
.vm-upload-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;border-radius:11px;padding:0 16px;background:linear-gradient(135deg,#32101A,#6B1E2D);color:#F7F3EB;font:900 12.5px 'Cairo',sans-serif;cursor:pointer;white-space:nowrap}
.vm-upload-btn.busy{opacity:.75;cursor:progress}
.vm-progress{height:6px;border-radius:999px;background:#EFEAE0;overflow:hidden;margin-bottom:12px}
.vm-progress>div{height:100%;background:linear-gradient(90deg,#6B1E2D,#B8A082);transition:width .2s}
.vm-error{margin:0 0 12px;padding:10px 12px;border-radius:10px;background:rgba(107,30,45,.08);border:1px solid rgba(107,30,45,.16);color:#6B1E2D;font-size:12px;font-weight:800}

.vm-empty{min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;text-align:center;border:1px dashed rgba(184,155,94,.4);border-radius:16px;background:rgba(194,160,89,.04);padding:26px}
.vm-empty svg{color:#B8A082}
.vm-empty strong{font-size:13.5px;color:#32101A}
.vm-empty p{margin:0;font-size:11.5px;color:#8C8274;max-width:420px;line-height:1.75}

.vm-videos{display:flex;flex-direction:column;gap:14px}
.vm-video{border:1px solid #E5E0D5;border-radius:16px;background:#fff;overflow:hidden}
.vm-video-top{display:grid;grid-template-columns:236px minmax(0,1fr);gap:14px;padding:13px}
.vm-preview{width:100%;height:134px;border-radius:11px;background:#1A1A1A;object-fit:contain}
.vm-video-body{display:flex;flex-direction:column;justify-content:space-between;gap:11px;min-width:0}
.vm-video-title{min-width:0}
.vm-video-title strong{display:block;font-size:14px;color:#32101A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vm-video-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
.vm-tag{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 10px;background:#EFEAE0;color:#655B53;font-size:10px;font-weight:800}
.vm-tag.warn{background:rgba(107,30,45,.09);color:#6B1E2D}
.vm-video-actions{display:flex;flex-wrap:wrap;gap:7px}
.vm-btn{display:inline-flex;align-items:center;gap:6px;min-height:38px;border:0;border-radius:10px;padding:0 13px;background:#6B1E2D;color:#F7F3EB;font:800 11.5px 'Cairo',sans-serif;cursor:pointer}
.vm-btn.ghost{background:#fff;border:1px solid #D9C9B0;color:#6B1E2D}
.vm-icon-btn{width:38px;height:38px;flex:none;display:grid;place-items:center;border:1px solid #D9C9B0;border-radius:10px;background:#F7F3EB;color:#6B1E2D;cursor:pointer}
.vm-icon-btn.danger:hover{background:#6B1E2D;color:#fff;border-color:#6B1E2D}
.vm-icon-btn:disabled{opacity:.5;cursor:progress}

.vm-no-questions{margin:0;padding:11px 14px;border-top:1px solid #EFE9DC;background:rgba(107,30,45,.04);color:#6B1E2D;font-size:11.5px;font-weight:800}
.vm-questions{list-style:none;margin:0;padding:9px 13px 13px;border-top:1px solid #EFE9DC;display:flex;flex-direction:column;gap:6px}
.vm-question{display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 11px;border-radius:10px;background:#F7F3EB}
.vm-q-time{display:inline-flex;align-items:center;gap:4px;font:900 10.5px ui-monospace,Consolas,monospace;color:#6B1E2D;direction:ltr}
.vm-q-type{border-radius:999px;padding:3px 8px;background:#fff;font-size:9px;font-weight:900;color:#8C8274;white-space:nowrap}
.vm-question p{margin:0;font-size:12px;color:#32101A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vm-q-actions{display:flex;gap:5px}
.vm-q-actions button{width:30px;height:30px;display:grid;place-items:center;border:1px solid #E5E0D5;border-radius:8px;background:#fff;color:#6B1E2D;cursor:pointer}
.vm-q-actions button:disabled{opacity:.5;cursor:progress}

@media(max-width:860px){
  .vm-video-top{grid-template-columns:1fr}
  .vm-preview{height:190px}
}
@media(max-width:560px){
  .vm-card{border-radius:16px}
  .vm-head{gap:12px}
  .vm-upload{width:100%}
  .vm-title-input{flex:1;min-width:0}
  .vm-upload-btn{width:100%}
  .vm-video-actions .vm-btn{flex:1;justify-content:center}
  .vm-question{grid-template-columns:auto minmax(0,1fr) auto;row-gap:6px}
  .vm-q-type{grid-row:1;grid-column:2;justify-self:start}
  .vm-question p{grid-column:1/-1;white-space:normal}
}
`;
