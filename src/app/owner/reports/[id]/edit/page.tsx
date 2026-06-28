"use client";
export const dynamic = "force-dynamic";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import OwnerReportView from "@/components/OwnerReportView";
import {
  type BlockType, type ReportBlock, type ReportImage, type ReportFile,
  type ReportLink, emptyBlock,
} from "@/lib/owner-reports";

type ReportData = {
  id: string;
  school_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  report_date: string | null;
  introduction: string | null;
  closing_note: string | null;
  status: "DRAFT" | "PUBLISHED";
  blocks: ReportBlock[];
  images: ReportImage[];
  attachments: ReportFile[];
  links: ReportLink[];
  published_at: string | null;
  school: { id: string; name: string; name_alt: string | null };
  author: { id: string; full_name: string };
};
type School = { id: string; name: string; name_alt?: string | null };

const UI = {
  ar: {
    back: "← العودة لقائمة التقارير",
    statusDRAFT: "مسودة", statusPUBLISHED: "منشور",
    saveAuto: "محفوظ تلقائياً",
    saving: "جارٍ الحفظ…",
    saveErr: "تعذر الحفظ",
    preview: "معاينة",
    edit: "تحرير",
    publish: "نشر",
    unpublish: "إلغاء النشر",
    deleteBtn: "حذف",
    confirmDelete: "هل تريد حذف هذا التقرير نهائياً؟",
    confirmPublish: "نشر التقرير سيجعله مرئياً لإدارة المدرسة. متابعة؟",
    publishOk: "تم النشر بنجاح",
    publishErr: "تعذر النشر",
    metaTitle: "العنوان",
    metaSubtitle: "العنوان الفرعي",
    metaDescription: "وصف قصير (اختياري)",
    metaSchool: "المدرسة",
    metaDate: "تاريخ التقرير",
    metaIntro: "المقدمة التنفيذية",
    metaClosing: "الخاتمة",
    sectionContent: "محتوى التقرير",
    addBlock: "أضف قسماً",
    blockTEXT: "فقرة",
    blockHEADING: "عنوان قسم",
    blockHIGHLIGHT: "ملاحظة مهمة",
    blockBULLET_LIST: "قائمة نقاط",
    blockTitlePh: "عنوان القسم (اختياري)",
    blockBodyPh: "اكتب المحتوى هنا…",
    blockHighlightPh: "اكتب الملاحظة المهمة…",
    blockHeadingPh: "اكتب عنوان القسم…",
    listItemPh: "نقطة جديدة",
    addItem: "+ نقطة",
    moveUp: "↑",
    moveDown: "↓",
    removeBlock: "حذف",
    sectionImages: "الصور والمرفقات المرئية",
    uploadImage: "+ رفع صورة",
    uploadingImage: "جارٍ رفع الصورة…",
    captionPh: "وصف الصورة (اختياري)",
    sectionFiles: "ملفات قابلة للتنزيل",
    uploadFile: "+ رفع ملف",
    uploadingFile: "جارٍ رفع الملف…",
    sectionLinks: "روابط خارجية",
    addLink: "+ إضافة رابط",
    linkTitlePh: "عنوان الرابط",
    linkDescPh: "وصف قصير (اختياري)",
    linkUrlPh: "https://…",
  },
  sq: {
    back: "← Kthehu te lista",
    statusDRAFT: "Draft", statusPUBLISHED: "I publikuar",
    saveAuto: "U ruajt automatikisht",
    saving: "Po ruhet…",
    saveErr: "Ruajtja dështoi",
    preview: "Pamje paraprake",
    edit: "Redakto",
    publish: "Publiko",
    unpublish: "Hiq nga publikuar",
    deleteBtn: "Fshi",
    confirmDelete: "Të fshihet ky raport përfundimisht?",
    confirmPublish: "Publikimi do ta bëjë të dukshëm për administratorët e shkollës. Të vazhdohet?",
    publishOk: "U publikua",
    publishErr: "Publikimi dështoi",
    metaTitle: "Titulli",
    metaSubtitle: "Nëntitulli",
    metaDescription: "Përshkrim i shkurtër (opsional)",
    metaSchool: "Shkolla",
    metaDate: "Data e raportit",
    metaIntro: "Hyrja ekzekutive",
    metaClosing: "Përmbyllja",
    sectionContent: "Përmbajtja e raportit",
    addBlock: "Shto seksion",
    blockTEXT: "Paragraf",
    blockHEADING: "Titull seksioni",
    blockHIGHLIGHT: "Shënim i rëndësishëm",
    blockBULLET_LIST: "Listë me pika",
    blockTitlePh: "Titulli (opsional)",
    blockBodyPh: "Shkruaj përmbajtjen këtu…",
    blockHighlightPh: "Shkruaj shënimin…",
    blockHeadingPh: "Shkruaj titullin…",
    listItemPh: "Pikë e re",
    addItem: "+ Pikë",
    moveUp: "↑",
    moveDown: "↓",
    removeBlock: "Fshi",
    sectionImages: "Galeria",
    uploadImage: "+ Ngarko foto",
    uploadingImage: "Po ngarkohet…",
    captionPh: "Përshkrim (opsional)",
    sectionFiles: "Skedarë për shkarkim",
    uploadFile: "+ Ngarko skedar",
    uploadingFile: "Po ngarkohet…",
    sectionLinks: "Lidhje të jashtme",
    addLink: "+ Shto lidhje",
    linkTitlePh: "Titulli i lidhjes",
    linkDescPh: "Përshkrim (opsional)",
    linkUrlPh: "https://…",
  },
} as const;

export default function EditOwnerReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { lang } = useLang();
  const confirm = useConfirm();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [saveState, setSaveState] = useState<"" | "saving" | "saved" | "err">("");

  // Debounced autosave
  const dirtyRef = useRef<Partial<ReportData> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/owner/reports/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d?.report ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    fetch("/api/owner/schools", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSchools(d?.schools ?? []))
      .catch(() => setSchools([]));
  }, [id]);

  const flush = useCallback(async () => {
    if (!dirtyRef.current) return;
    const body = dirtyRef.current;
    dirtyRef.current = null;
    setSaveState("saving");
    try {
      const r = await fetch(`/api/owner/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      const { report } = await r.json();
      setData(report);
      setSaveState("saved");
    } catch {
      setSaveState("err");
    }
  }, [id]);

  // Track changes — push into dirtyRef and schedule a flush.
  function patch(p: Partial<ReportData>) {
    setData((prev) => prev ? { ...prev, ...p } as ReportData : prev);
    dirtyRef.current = { ...(dirtyRef.current ?? {}), ...p };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 700);
  }

  // Helpers for blocks/images/files/links
  function setBlocks(next: ReportBlock[])   { patch({ blocks: next }); }
  function setImages(next: ReportImage[])   { patch({ images: next }); }
  function setFiles (next: ReportFile[])    { patch({ attachments: next }); }
  function setLinks (next: ReportLink[])    { patch({ links: next }); }

  async function publish() {
    const ok = await confirm({ title: T.publish, message: T.confirmPublish, confirmText: T.publish, cancelText: "—", variant: "normal" });
    if (!ok) return;
    await flush();
    try {
      const r = await fetch(`/api/owner/reports/${id}/publish`, { method: "POST" });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setData((prev) => prev ? { ...prev, status: d.report.status, published_at: d.report.published_at } : prev);
    } catch { alert(T.publishErr); }
  }

  async function unpublish() {
    const r = await fetch(`/api/owner/reports/${id}/unpublish`, { method: "POST" });
    if (r.ok) {
      const d = await r.json();
      setData((prev) => prev ? { ...prev, status: d.report.status } : prev);
    }
  }

  async function del() {
    const ok = await confirm({ title: T.deleteBtn, message: T.confirmDelete, confirmText: T.deleteBtn, cancelText: "—", variant: "danger" });
    if (!ok) return;
    await fetch(`/api/owner/reports/${id}`, { method: "DELETE" });
    router.push("/owner/reports");
  }

  // ── File / image upload helpers
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  async function uploadImage(file: File) {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("kind", "image");
      fd.append("file", file);
      const r = await fetch(`/api/owner/reports/${id}/upload`, { method: "POST", body: fd });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const next = [...(data?.images ?? []), { url: d.url, path: d.path, caption: "" } as ReportImage];
      setImages(next);
    } catch { /* swallow — UI shows nothing */ }
    finally { setUploadingImg(false); }
  }

  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  async function uploadFile(file: File) {
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("kind", "file");
      fd.append("file", file);
      const r = await fetch(`/api/owner/reports/${id}/upload`, { method: "POST", body: fd });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const next = [...(data?.attachments ?? []), {
        url: d.url, path: d.path, name: d.name, size: d.size, mime: d.mime,
      } as ReportFile];
      setFiles(next);
    } catch { /* swallow */ }
    finally { setUploadingFile(false); }
  }

  if (loading || !data) return <MandalaLoader />;

  if (tab === "preview") {
    return (
      <div className="oe-wrap">
        <div className="oe-toolbar" dir={dir}>
          <Link href="/owner/reports" className="oe-back">{T.back}</Link>
          <button className="oe-tab" onClick={() => setTab("edit")}>{T.edit}</button>
        </div>
        <OwnerReportView
          lang={L}
          report={{
            ...data,
            blocks: data.blocks,
            images: data.images,
            attachments: data.attachments,
            links: data.links,
            published_at: data.published_at,
          }}
        />
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="oe-wrap" dir={dir}>
      <div className="oe-toolbar">
        <Link href="/owner/reports" className="oe-back">{T.back}</Link>
        <span className={`oe-status oe-st-${data.status}`}>
          {data.status === "DRAFT" ? T.statusDRAFT : T.statusPUBLISHED}
        </span>
        <span className="oe-save">
          {saveState === "saving" ? T.saving : saveState === "err" ? T.saveErr : saveState === "saved" ? T.saveAuto : ""}
        </span>
        <div className="oe-spacer" />
        <button className="oe-tab" onClick={() => setTab("preview")}>{T.preview}</button>
        {data.status === "DRAFT"
          ? <button className="oe-publish" onClick={publish}>{T.publish}</button>
          : <button className="oe-tab" onClick={unpublish}>{T.unpublish}</button>}
        <button className="oe-del" onClick={del}>{T.deleteBtn}</button>
      </div>

      <div className="oe-grid">
        {/* ── Metadata column ── */}
        <section className="oe-section">
          <h3 className="oe-h">{T.metaSchool}</h3>
          <select className="oe-input" value={data.school_id} onChange={(e) => patch({ school_id: e.target.value })}>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{L !== "ar" && s.name_alt?.trim() ? s.name_alt : s.name}</option>
            ))}
          </select>

          <h3 className="oe-h">{T.metaTitle}</h3>
          <input className="oe-input" value={data.title} onChange={(e) => patch({ title: e.target.value })} />

          <h3 className="oe-h">{T.metaSubtitle}</h3>
          <input className="oe-input" value={data.subtitle ?? ""} onChange={(e) => patch({ subtitle: e.target.value })} />

          <h3 className="oe-h">{T.metaDescription}</h3>
          <textarea className="oe-input oe-ta" rows={2} value={data.description ?? ""} onChange={(e) => patch({ description: e.target.value })} />

          <h3 className="oe-h">{T.metaDate}</h3>
          <input className="oe-input" type="date" value={data.report_date ? data.report_date.slice(0, 10) : ""} onChange={(e) => patch({ report_date: e.target.value || null })} />

          <h3 className="oe-h">{T.metaIntro}</h3>
          <textarea className="oe-input oe-ta" rows={4} value={data.introduction ?? ""} onChange={(e) => patch({ introduction: e.target.value })} />
        </section>

        {/* ── Content blocks ── */}
        <section className="oe-section">
          <h3 className="oe-h">{T.sectionContent}</h3>
          <div className="oe-blocks">
            {data.blocks.map((b, i) => (
              <BlockEditor
                key={b.id}
                block={b}
                T={T}
                onChange={(nb) => setBlocks(data.blocks.map((x) => x.id === b.id ? nb : x))}
                onRemove={() => setBlocks(data.blocks.filter((x) => x.id !== b.id))}
                onMoveUp={i === 0 ? undefined : () => setBlocks(swap(data.blocks, i, i - 1))}
                onMoveDown={i === data.blocks.length - 1 ? undefined : () => setBlocks(swap(data.blocks, i, i + 1))}
              />
            ))}
          </div>
          <div className="oe-add-row">
            {(["TEXT", "HEADING", "HIGHLIGHT", "BULLET_LIST"] as BlockType[]).map((t) => (
              <button key={t} className="oe-add-btn" onClick={() => setBlocks([...data.blocks, emptyBlock(t)])}>
                + {t === "TEXT" ? T.blockTEXT : t === "HEADING" ? T.blockHEADING : t === "HIGHLIGHT" ? T.blockHIGHLIGHT : T.blockBULLET_LIST}
              </button>
            ))}
          </div>

          <h3 className="oe-h">{T.metaClosing}</h3>
          <textarea className="oe-input oe-ta" rows={3} value={data.closing_note ?? ""} onChange={(e) => patch({ closing_note: e.target.value })} />
        </section>

        {/* ── Media + files + links ── */}
        <section className="oe-section">
          <h3 className="oe-h">{T.sectionImages}</h3>
          <div className="oe-media-grid">
            {data.images.map((img, i) => (
              <div key={img.path} className="oe-media-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} className="oe-media-img" alt="" />
                <input
                  className="oe-input oe-cap"
                  placeholder={T.captionPh}
                  value={img.caption ?? ""}
                  onChange={(e) => {
                    const next = data.images.map((x, j) => j === i ? { ...x, caption: e.target.value } : x);
                    setImages(next);
                  }}
                />
                <button className="oe-x" onClick={() => setImages(data.images.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
          <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
          <button className="oe-upload" onClick={() => imgInputRef.current?.click()} disabled={uploadingImg}>
            {uploadingImg ? T.uploadingImage : T.uploadImage}
          </button>

          <h3 className="oe-h">{T.sectionFiles}</h3>
          <div className="oe-files">
            {data.attachments.map((f, i) => (
              <div key={f.path} className="oe-file-row">
                <span className="oe-file-name">{f.name}</span>
                <span className="oe-file-size">{f.size ? `${Math.round(f.size / 1024)} KB` : ""}</span>
                <button className="oe-x" onClick={() => setFiles(data.attachments.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
          <input ref={fileInputRef} type="file" style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          <button className="oe-upload" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}>
            {uploadingFile ? T.uploadingFile : T.uploadFile}
          </button>

          <h3 className="oe-h">{T.sectionLinks}</h3>
          <div className="oe-links">
            {data.links.map((l, i) => (
              <div key={i} className="oe-link-row">
                <input className="oe-input" placeholder={T.linkTitlePh} value={l.title}
                  onChange={(e) => setLinks(data.links.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                <input className="oe-input" placeholder={T.linkDescPh} value={l.description ?? ""}
                  onChange={(e) => setLinks(data.links.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                <input className="oe-input" placeholder={T.linkUrlPh} value={l.url}
                  onChange={(e) => setLinks(data.links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
                <button className="oe-x" onClick={() => setLinks(data.links.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
          <button className="oe-upload" onClick={() => setLinks([...data.links, { title: "", description: "", url: "" }])}>
            {T.addLink}
          </button>
        </section>
      </div>

      <style>{styles}</style>
    </div>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  const a = [...arr];
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}

function BlockEditor({
  block, T, onChange, onRemove, onMoveUp, onMoveDown,
}: {
  block: ReportBlock;
  T: typeof UI.ar | typeof UI.sq;
  onChange: (b: ReportBlock) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div className={`oe-block oe-block-${block.type}`}>
      <div className="oe-block-head">
        <span className="oe-block-kind">
          {block.type === "TEXT" ? T.blockTEXT
           : block.type === "HEADING" ? T.blockHEADING
           : block.type === "HIGHLIGHT" ? T.blockHIGHLIGHT
           : T.blockBULLET_LIST}
        </span>
        <div className="oe-block-actions">
          {onMoveUp && <button className="oe-mini" onClick={onMoveUp}>{T.moveUp}</button>}
          {onMoveDown && <button className="oe-mini" onClick={onMoveDown}>{T.moveDown}</button>}
          <button className="oe-mini oe-mini-x" onClick={onRemove}>{T.removeBlock}</button>
        </div>
      </div>

      {block.type === "HEADING" ? (
        <input className="oe-input" placeholder={T.blockHeadingPh}
          value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      ) : block.type === "HIGHLIGHT" ? (
        <>
          <input className="oe-input" placeholder={T.blockTitlePh}
            value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <textarea className="oe-input oe-ta" rows={3} placeholder={T.blockHighlightPh}
            value={block.body ?? ""} onChange={(e) => onChange({ ...block, body: e.target.value })} />
        </>
      ) : block.type === "BULLET_LIST" ? (
        <>
          <input className="oe-input" placeholder={T.blockTitlePh}
            value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          {(block.items ?? []).map((it, i) => (
            <div key={i} className="oe-li-row">
              <input className="oe-input" placeholder={T.listItemPh} value={it}
                onChange={(e) => {
                  const next = [...(block.items ?? [])];
                  next[i] = e.target.value;
                  onChange({ ...block, items: next });
                }} />
              <button className="oe-x" onClick={() => {
                const next = (block.items ?? []).filter((_, j) => j !== i);
                onChange({ ...block, items: next });
              }}>×</button>
            </div>
          ))}
          <button className="oe-add-mini" onClick={() => onChange({ ...block, items: [...(block.items ?? []), ""] })}>
            {T.addItem}
          </button>
        </>
      ) : (
        <>
          <input className="oe-input" placeholder={T.blockTitlePh}
            value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <textarea className="oe-input oe-ta" rows={5} placeholder={T.blockBodyPh}
            value={block.body ?? ""} onChange={(e) => onChange({ ...block, body: e.target.value })} />
        </>
      )}
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
.oe-wrap { font-family: 'Cairo', sans-serif; padding-bottom: 60px; }
.oe-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; padding: 12px 16px; background: #FFFDF8; border: 1px solid rgba(8,11,12,0.07); border-radius: 12px; }
.oe-back { color:#6B4F1E; font-weight:800; font-size:13px; text-decoration:none; }
.oe-status { font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 99px; letter-spacing: 0.04em; }
.oe-st-DRAFT { background: rgba(8,11,12,0.08); color: #5E5A52; }
.oe-st-PUBLISHED { background: rgba(45,138,74,0.16); color: #1E5C2E; }
.oe-save { font-size: 12px; color: #8A8478; font-weight: 700; }
.oe-spacer { flex: 1; }
.oe-tab, .oe-publish, .oe-del { background: #FFF; border: 1.5px solid rgba(194,160,89,0.32); color: #5E4A20; padding: 8px 14px; border-radius: 9px; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
.oe-publish { background: linear-gradient(180deg,#2D8A4A,#1E5C2E); color: #FFF; border-color: transparent; }
.oe-del { background: linear-gradient(180deg,#A33333,#7A1E1E); color: #FFF; border-color: transparent; }

.oe-grid { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 16px; }
@media (max-width: 980px) { .oe-grid { grid-template-columns: 1fr; } }
.oe-section { background: #FFFDF8; border: 1px solid rgba(8,11,12,0.07); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 6px; }
.oe-h { font-size: 12px; font-weight: 800; color: #6B4F1E; letter-spacing: 0.04em; text-transform: uppercase; margin: 14px 0 6px; }
.oe-h:first-child { margin-top: 0; }
.oe-input { width: 100%; padding: 10px 13px; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 9px; font-family: inherit; font-size: 13.5px; background: #FFF; outline: none; }
.oe-input:focus { border-color: #B89B5E; }
.oe-ta { resize: vertical; min-height: 60px; line-height: 1.7; }

.oe-blocks { display: flex; flex-direction: column; gap: 12px; }
.oe-block { background: rgba(194,160,89,0.05); border: 1px solid rgba(194,160,89,0.25); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.oe-block-HEADING { background: rgba(122,30,30,0.04); border-color: rgba(122,30,30,0.18); }
.oe-block-HIGHLIGHT { background: rgba(229,185,60,0.10); border-color: rgba(229,185,60,0.42); }
.oe-block-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.oe-block-kind { font-size: 11px; font-weight: 800; color: #6B4F1E; letter-spacing: 0.04em; text-transform: uppercase; }
.oe-block-actions { display: flex; gap: 4px; }
.oe-mini { background: rgba(8,11,12,0.06); border: none; color: #5E4A20; font-family: inherit; font-size: 11px; font-weight: 800; padding: 4px 9px; border-radius: 6px; cursor: pointer; }
.oe-mini-x { background: rgba(139,26,26,0.10); color: #7A1E1E; }

.oe-add-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.oe-add-btn { background: linear-gradient(180deg,#1E2329,#11151A); color: #E5B93C; border: none; padding: 7px 12px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
.oe-add-mini { background: rgba(194,160,89,0.16); color: #6B4F1E; border: 1px dashed rgba(194,160,89,0.5); padding: 6px 12px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; align-self: flex-start; }

.oe-media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px,1fr)); gap: 8px; margin-bottom: 8px; }
.oe-media-card { position: relative; background: #FFF; border: 1px solid rgba(194,160,89,0.32); border-radius: 10px; padding: 6px; display: flex; flex-direction: column; gap: 4px; }
.oe-media-img { width: 100%; height: 100px; object-fit: cover; border-radius: 7px; }
.oe-cap { font-size: 11px; padding: 5px 8px; }
.oe-x { position: absolute; top: 6px; inset-inline-end: 6px; background: rgba(139,26,26,0.85); border: none; color: #FFF; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.oe-upload { background: #FFF; border: 1.5px dashed rgba(194,160,89,0.55); color: #6B4F1E; padding: 9px 14px; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
.oe-upload:disabled { opacity: 0.55; cursor: progress; }

.oe-files { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.oe-file-row { position: relative; display: flex; align-items: center; gap: 10px; background: #FFF; border: 1px solid rgba(194,160,89,0.32); border-radius: 10px; padding: 9px 36px 9px 12px; font-size: 13px; }
.oe-file-name { font-weight: 800; color: #1B1810; flex: 1; word-break: break-word; }
.oe-file-size { color: #8B6915; font-size: 11.5px; font-weight: 700; }
.oe-links { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.oe-link-row { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #FFF; border: 1px solid rgba(194,160,89,0.32); border-radius: 10px; padding: 9px 36px 9px 12px; }
.oe-link-row .oe-input { font-size: 12.5px; padding: 7px 10px; }
.oe-link-row .oe-input:nth-child(3) { grid-column: 1 / -1; }
.oe-li-row { position: relative; }
.oe-li-row .oe-x { top: 7px; }
`;
