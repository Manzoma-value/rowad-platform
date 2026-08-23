"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  CheckCircle2,
  HandCoins,
  HeartHandshake,
  Mail,
  Pencil,
  Phone,
  Plus,
  Save,
  Scale,
  Trash2,
  UserRoundCheck,
  X,
} from "lucide-react";
import {
  supportRoleKey,
  type StudentSupportCircle as StudentSupportCircleValue,
  type StudentSupportPerson,
  type StudentSupportRole,
} from "@/lib/student-support";
import { invalidateCache } from "@/lib/api-cache";

type Lang = "ar" | "sq" | "en";
type EditableRole = StudentSupportRole;
type Draft = { full_name: string; phone: string; email: string; relationship: string; notes: string };

const EMPTY_DRAFT: Draft = { full_name: "", phone: "", email: "", relationship: "", notes: "" };

const COPY = {
  ar: {
    eyebrow: "منظومة الإحاطة بالمستفيد",
    title: "دائرة الرعاية والمسؤولية",
    subtitle: "الأشخاص المرجعيون المحيطون بالمستفيد، وأدوارهم ووسائل التواصل معهم في مكان واحد.",
    completion: "اكتمال الدائرة",
    of: "من 4 أدوار",
    supervisor: "المشرف",
    supervisorDesc: "المتابعة التربوية وتنظيم فرص الممارسة وملاحظة الأداء.",
    guardian: "الولي / الوصي",
    guardianDesc: "السند الاجتماعي والشرعي الأقرب للمستفيد.",
    jurist: "الفقيه / المرجع الشرعي",
    juristDesc: "مرجع الأحكام والفتوى والتوجيه الشرعي.",
    sponsor: "الكفيل",
    sponsorDesc: "جهة أو شخص الكفالة والمتابعة والدعم.",
    missing: "لم يُحدّد بعد",
    missingHelp: "أضف بيانات هذا الدور لتكتمل دائرة الرعاية.",
    add: "إضافة البيانات",
    edit: "تعديل البيانات",
    assigned: "تم التعيين",
    group: "المجموعة التعليمية",
    fullName: "الاسم الكامل",
    fullNamePh: "اكتب الاسم الكامل",
    phone: "رقم الهاتف",
    phonePh: "+355 ...",
    email: "البريد الإلكتروني",
    emailPh: "name@example.com",
    relationship: "الصفة أو جهة الارتباط",
    relationshipPh: "مثال: والد، عم، مؤسسة كافلة...",
    notes: "ملاحظات مهمة",
    notesPh: "أي معلومات تساعد فريق المتابعة...",
    save: "حفظ البيانات",
    saving: "جارٍ الحفظ...",
    cancel: "إلغاء",
    remove: "إزالة بيانات الدور",
    confirmRemove: "هل تريد إزالة هذه البيانات؟ سيظهر الدور بعد ذلك بأنه غير محدد.",
    confirm: "نعم، إزالة",
    required: "الاسم الكامل مطلوب.",
    invalidEmail: "أدخل بريداً إلكترونياً صحيحاً.",
    saveError: "تعذر حفظ البيانات. حاول مرة أخرى.",
    supervisorManaged: "يُحدّد المشرف تلقائياً من المجموعة التعليمية المسندة للمستفيد.",
    readonly: "هذه البيانات يديرها المشرف وإدارة المنصة.",
  },
  sq: {
    eyebrow: "Rrethi mbështetës i pjesëmarrësit",
    title: "Rrethi i kujdesit dhe përgjegjësisë",
    subtitle: "Personat referues rreth pjesëmarrësit, rolet dhe të dhënat e kontaktit në një vend.",
    completion: "Plotësia e rrethit",
    of: "nga 4 role",
    supervisor: "Edukatori",
    supervisorDesc: "Ndjekja edukative, praktika dhe vëzhgimi i zhvillimit.",
    guardian: "Prindi / kujdestari",
    guardianDesc: "Mbështetja më e afërt shoqërore dhe ligjore.",
    jurist: "Juristi / referenca fetare",
    juristDesc: "Referenca për udhëzim dhe çështje fetare.",
    sponsor: "Garantuesi",
    sponsorDesc: "Personi ose institucioni i kujdesit dhe mbështetjes.",
    missing: "Ende i pacaktuar",
    missingHelp: "Shto të dhënat për ta plotësuar rrethin e kujdesit.",
    add: "Shto të dhënat",
    edit: "Ndrysho të dhënat",
    assigned: "I caktuar",
    group: "Grupi mësimor",
    fullName: "Emri i plotë",
    fullNamePh: "Shkruaj emrin e plotë",
    phone: "Telefoni",
    phonePh: "+355 ...",
    email: "Email",
    emailPh: "name@example.com",
    relationship: "Marrëdhënia ose institucioni",
    relationshipPh: "P.sh. baba, xhaxha, institucion...",
    notes: "Shënime të rëndësishme",
    notesPh: "Informacion që ndihmon ekipin...",
    save: "Ruaj të dhënat",
    saving: "Duke ruajtur...",
    cancel: "Anulo",
    remove: "Hiq të dhënat",
    confirmRemove: "Të hiqen këto të dhëna? Roli do të shfaqet si i pacaktuar.",
    confirm: "Po, hiqi",
    required: "Emri i plotë është i detyrueshëm.",
    invalidEmail: "Vendos një email të vlefshëm.",
    saveError: "Të dhënat nuk u ruajtën. Provo përsëri.",
    supervisorManaged: "Edukatori caktohet automatikisht nga grupi mësimor i pjesëmarrësit.",
    readonly: "Këto të dhëna menaxhohen nga edukatori dhe administrata.",
  },
  en: {
    eyebrow: "Beneficiary support system",
    title: "Care and responsibility circle",
    subtitle: "The key people around the beneficiary, their responsibilities, and contact details in one place.",
    completion: "Circle completion",
    of: "of 4 roles",
    supervisor: "Supervisor",
    supervisorDesc: "Educational follow-up, practice opportunities, and progress observation.",
    guardian: "Parent / guardian",
    guardianDesc: "The beneficiary's closest social and legal support.",
    jurist: "Jurist / religious reference",
    juristDesc: "Reference for rulings and religious guidance.",
    sponsor: "Sponsor",
    sponsorDesc: "The person or institution providing care and support.",
    missing: "Not assigned yet",
    missingHelp: "Add this role's details to complete the care circle.",
    add: "Add details",
    edit: "Edit details",
    assigned: "Assigned",
    group: "Learning group",
    fullName: "Full name",
    fullNamePh: "Enter the full name",
    phone: "Phone number",
    phonePh: "+355 ...",
    email: "Email",
    emailPh: "name@example.com",
    relationship: "Relationship or organization",
    relationshipPh: "For example: father, uncle, sponsoring organization...",
    notes: "Important notes",
    notesPh: "Anything that helps the support team...",
    save: "Save details",
    saving: "Saving...",
    cancel: "Cancel",
    remove: "Remove role details",
    confirmRemove: "Remove these details? The role will return to an unassigned state.",
    confirm: "Yes, remove",
    required: "Full name is required.",
    invalidEmail: "Enter a valid email address.",
    saveError: "Could not save the details. Please try again.",
    supervisorManaged: "The supervisor is assigned automatically through the beneficiary's learning group.",
    readonly: "These details are managed by the supervisor and platform administration.",
  },
} as const;

function draftOf(person: StudentSupportPerson | null): Draft {
  return person ? {
    full_name: person.full_name,
    phone: person.phone ?? "",
    email: person.email ?? "",
    relationship: person.relationship ?? "",
    notes: person.notes ?? "",
  } : { ...EMPTY_DRAFT };
}

export default function StudentSupportCircle({
  value,
  lang,
  editable = false,
  endpoint,
  invalidateUrl,
  onChange,
}: {
  value: StudentSupportCircleValue;
  lang: Lang;
  editable?: boolean;
  endpoint?: string;
  invalidateUrl?: string;
  onChange?: (value: StudentSupportCircleValue) => void;
}) {
  const t = COPY[lang];
  const [editing, setEditing] = useState<EditableRole | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const completeCount = [value.supervisor, value.guardian, value.religious_reference, value.sponsor].filter(Boolean).length;
  const progress = completeCount * 25;

  const roles: Array<{
    key: keyof StudentSupportCircleValue;
    role?: EditableRole;
    title: string;
    description: string;
    icon: ReactNode;
  }> = [
    { key: "supervisor", title: t.supervisor, description: t.supervisorDesc, icon: <UserRoundCheck /> },
    { key: "guardian", role: "GUARDIAN", title: t.guardian, description: t.guardianDesc, icon: <HeartHandshake /> },
    { key: "religious_reference", role: "RELIGIOUS_REFERENCE", title: t.jurist, description: t.juristDesc, icon: <Scale /> },
    { key: "sponsor", role: "SPONSOR", title: t.sponsor, description: t.sponsorDesc, icon: <HandCoins /> },
  ];

  function openEditor(role: EditableRole) {
    const person = value[supportRoleKey(role)];
    setEditing(role);
    setDraft(draftOf(person));
    setError("");
    setConfirmingClear(false);
  }

  function closeEditor() {
    if (saving) return;
    setEditing(null);
    setError("");
    setConfirmingClear(false);
  }

  async function mutate(clear = false) {
    if (!editing || !endpoint || saving) return;
    if (!clear && !draft.full_name.trim()) { setError(t.required); return; }
    if (!clear && draft.email.trim() && !/^\S+@\S+\.\S+$/.test(draft.email.trim())) { setError(t.invalidEmail); return; }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editing, clear, ...draft }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Save failed");
      const key = supportRoleKey(editing);
      onChange?.({ ...value, [key]: payload.contact ?? null });
      if (invalidateUrl) invalidateCache(invalidateUrl);
      setEditing(null);
      setConfirmingClear(false);
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  const editorTitle = editing === "GUARDIAN" ? t.guardian : editing === "RELIGIOUS_REFERENCE" ? t.jurist : t.sponsor;
  const existing = editing ? value[supportRoleKey(editing)] : null;

  return <section className="ssc" dir={lang === "ar" ? "rtl" : "ltr"}>
    <header className="ssc-head">
      <div className="ssc-head-icon"><HeartHandshake /></div>
      <div className="ssc-head-copy"><span>{t.eyebrow}</span><h2>{t.title}</h2><p>{t.subtitle}</p></div>
      <div className="ssc-progress" title={`${t.completion}: ${progress}%`}>
        <div style={{ "--ssc-progress": `${progress * 3.6}deg` } as React.CSSProperties}><span>{progress}%</span></div>
        <p><strong>{completeCount}</strong> {t.of}</p>
      </div>
    </header>

    <div className="ssc-line" aria-hidden="true"><i/><span/><i/><span/><i/><span/><i/></div>
    <div className="ssc-grid">
      {roles.map((item, index) => {
        const person = value[item.key];
        return <article key={item.key} className={`ssc-card role-${index + 1}${person ? " complete" : " empty"}`} title={item.description}>
          <div className="ssc-role-head"><span>{item.icon}</span><div><small>0{index + 1}</small><h3>{item.title}</h3></div>{person && <em><Check size={11}/>{t.assigned}</em>}</div>
          <p className="ssc-role-desc">{item.description}</p>
          {person ? <div className="ssc-person">
            <strong>{person.full_name}</strong>
            {person.relationship && <small>{item.key === "supervisor" ? `${t.group}: ${person.relationship}` : person.relationship}</small>}
            <div>
              {person.phone && <a href={`tel:${person.phone}`} title={`${t.phone}: ${person.phone}`}><Phone size={13}/><span dir="ltr">{person.phone}</span></a>}
              {person.email && <a href={`mailto:${person.email}`} title={`${t.email}: ${person.email}`}><Mail size={13}/><span dir="ltr">{person.email}</span></a>}
            </div>
            {person.notes && <p title={person.notes}>{person.notes}</p>}
          </div> : <div className="ssc-missing"><span><Plus size={17}/></span><strong>{t.missing}</strong><small>{item.key === "supervisor" ? t.supervisorManaged : t.missingHelp}</small></div>}
          {editable && item.role && <button type="button" className="ssc-edit" onClick={() => openEditor(item.role!)} title={person ? t.edit : t.add}>{person ? <Pencil size={14}/> : <Plus size={14}/>} {person ? t.edit : t.add}</button>}
        </article>;
      })}
    </div>
    {!editable && <p className="ssc-readonly"><CheckCircle2 size={14}/>{t.readonly}</p>}

    {editing && typeof document !== "undefined" && createPortal(<div className="ssc-modal-back" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
      <div className="ssc-modal" role="dialog" aria-modal="true" aria-labelledby="ssc-editor-title" dir={lang === "ar" ? "rtl" : "ltr"}>
        <header><div><span>{t.eyebrow}</span><h3 id="ssc-editor-title">{existing ? t.edit : t.add}: {editorTitle}</h3></div><button type="button" onClick={closeEditor} aria-label={t.cancel}><X size={19}/></button></header>
        <div className="ssc-form">
          <label className="wide"><span>{t.fullName} *</span><input autoFocus value={draft.full_name} onChange={(event) => setDraft((current) => ({ ...current, full_name: event.target.value }))} placeholder={t.fullNamePh} /></label>
          <label><span>{t.phone}</span><input dir="ltr" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder={t.phonePh} /></label>
          <label><span>{t.email}</span><input type="email" dir="ltr" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder={t.emailPh} /></label>
          <label className="wide"><span>{t.relationship}</span><input value={draft.relationship} onChange={(event) => setDraft((current) => ({ ...current, relationship: event.target.value }))} placeholder={t.relationshipPh} /></label>
          <label className="wide"><span>{t.notes}</span><textarea rows={3} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder={t.notesPh} /></label>
          {error && <p className="ssc-error" role="alert">{error}</p>}
          {confirmingClear && <div className="ssc-confirm"><p>{t.confirmRemove}</p><div><button type="button" onClick={() => setConfirmingClear(false)}>{t.cancel}</button><button type="button" className="danger" onClick={() => void mutate(true)} disabled={saving}><Trash2 size={14}/>{t.confirm}</button></div></div>}
        </div>
        <footer>{existing && !confirmingClear && <button type="button" className="ssc-remove" onClick={() => setConfirmingClear(true)}><Trash2 size={14}/>{t.remove}</button>}<button type="button" className="ssc-cancel" onClick={closeEditor}>{t.cancel}</button><button type="button" className="ssc-save" onClick={() => void mutate(false)} disabled={saving}><Save size={15}/>{saving ? t.saving : t.save}</button></footer>
      </div>
    </div>, document.body)}
    <style>{styles}</style>
  </section>;
}

const styles = `
.ssc,.ssc *{box-sizing:border-box}.ssc{position:relative;overflow:hidden;border:1px solid rgba(107,30,45,.13);border-radius:26px;background:linear-gradient(145deg,#FFFBF5,#F7F3EB);padding:clamp(17px,2.4vw,26px);color:#32101A;font-family:'Cairo',sans-serif;box-shadow:0 16px 42px rgba(107,30,45,.065)}.ssc:before{content:'';position:absolute;inset-inline-end:-90px;top:-110px;width:260px;height:260px;border:1px solid rgba(184,160,130,.13);border-radius:50%;box-shadow:0 0 0 28px rgba(184,160,130,.035),0 0 0 56px rgba(184,160,130,.025);pointer-events:none}.ssc-head{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px}.ssc-head-icon{width:52px;height:52px;display:grid;place-items:center;border-radius:17px;background:linear-gradient(145deg,#4A0E1C,#6B1E2D);color:#FFFBF5;box-shadow:0 9px 22px rgba(107,30,45,.18)}.ssc-head-icon svg{width:24px}.ssc-head-copy span{color:#8F765B;font-size:9px;font-weight:900;letter-spacing:.1em}.ssc-head-copy h2{margin:2px 0;font-size:clamp(17px,2vw,22px)}.ssc-head-copy p{max-width:720px;margin:0;color:#796A62;font-size:10.5px;font-weight:700;line-height:1.75}.ssc-progress{display:flex;align-items:center;gap:9px}.ssc-progress>div{--ssc-progress:0deg;width:56px;height:56px;display:grid;place-items:center;border-radius:50%;background:conic-gradient(#6B1E2D var(--ssc-progress),#E5E0D5 0)}.ssc-progress>div:before{content:'';grid-area:1/1;width:44px;height:44px;border-radius:50%;background:#FFFBF5}.ssc-progress>div span{position:relative;grid-area:1/1;font-size:9px;font-weight:900}.ssc-progress p{margin:0;color:#796A62;font-size:9px;font-weight:800}.ssc-progress strong{color:#32101A;font-size:16px}.ssc-line{display:grid;grid-template-columns:12px 1fr 12px 1fr 12px 1fr 12px;align-items:center;width:calc(75% + 12px);margin:20px auto -7px}.ssc-line i{height:12px;border:3px solid #FFFBF5;border-radius:50%;background:#6B1E2D;box-shadow:0 0 0 1px rgba(107,30,45,.22)}.ssc-line span{height:1px;background:linear-gradient(90deg,rgba(107,30,45,.13),rgba(184,160,130,.55),rgba(107,30,45,.13))}.ssc-grid{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ssc-card{position:relative;min-width:0;min-height:255px;display:flex;flex-direction:column;padding:14px;border:1px solid rgba(107,30,45,.11);border-radius:18px;background:rgba(255,255,255,.72);transition:transform .18s,border-color .18s,box-shadow .18s}.ssc-card:hover{transform:translateY(-3px);border-color:rgba(107,30,45,.26);box-shadow:0 14px 28px rgba(107,30,45,.08)}.ssc-card:before{content:'';position:absolute;top:0;inset-inline:14px;height:3px;border-radius:0 0 9px 9px;background:#6B1E2D}.ssc-card.role-2:before{background:#8F765B}.ssc-card.role-3:before{background:#1A1A1A}.ssc-card.role-4:before{background:#B8A082}.ssc-role-head{display:flex;align-items:center;gap:9px;margin-top:3px}.ssc-role-head>span{width:36px;height:36px;display:grid;place-items:center;flex:none;border-radius:11px;background:#F7F3EB;color:#6B1E2D}.ssc-role-head>span svg{width:17px}.ssc-role-head>div{min-width:0}.ssc-role-head small{display:block;color:#B8A082;font:900 8px ui-monospace,monospace}.ssc-role-head h3{margin:0;font-size:12px;line-height:1.5}.ssc-role-head em{display:inline-flex;align-items:center;gap:3px;margin-inline-start:auto;padding:3px 6px;border-radius:999px;background:rgba(27,94,32,.09);color:#1B5E20;font-size:7.5px;font-style:normal;font-weight:900;white-space:nowrap}.ssc-role-desc{min-height:45px;margin:8px 0;padding-bottom:8px;border-bottom:1px dashed rgba(107,30,45,.12);color:#796A62;font-size:8.8px;font-weight:700;line-height:1.7}.ssc-person{display:flex;flex:1;flex-direction:column;min-width:0}.ssc-person>strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.ssc-person>small{margin-top:2px;color:#8F765B;font-size:8.5px;font-weight:800}.ssc-person>div{display:flex;flex-direction:column;gap:5px;margin-top:8px}.ssc-person a{display:flex;align-items:center;gap:5px;overflow:hidden;color:#655B53;font-size:8.5px;font-weight:700;text-decoration:none}.ssc-person a span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ssc-person a svg{flex:none;color:#8F765B}.ssc-person>p{display:-webkit-box;overflow:hidden;margin:7px 0 0;color:#796A62;font-size:8px;line-height:1.6;-webkit-line-clamp:2;-webkit-box-orient:vertical}.ssc-missing{display:grid;place-items:center;align-content:center;flex:1;text-align:center}.ssc-missing>span{width:32px;height:32px;display:grid;place-items:center;border:1px dashed rgba(107,30,45,.22);border-radius:11px;color:#8F765B}.ssc-missing strong{margin-top:7px;color:#655B53;font-size:10px}.ssc-missing small{max-width:170px;margin-top:3px;color:#8C8274;font-size:7.8px;line-height:1.55}.ssc-edit{width:100%;min-height:34px;display:flex;align-items:center;justify-content:center;gap:5px;margin-top:9px;border:1px solid rgba(107,30,45,.14);border-radius:10px;background:#F7F3EB;color:#6B1E2D;font:900 8.5px 'Cairo',sans-serif;cursor:pointer}.ssc-edit:hover{background:#6B1E2D;color:#FFFBF5}.ssc-readonly{display:flex;align-items:center;justify-content:center;gap:6px;margin:14px 0 0;color:#796A62;font-size:8.5px;font-weight:800}.ssc-readonly svg{color:#1B5E20}
.ssc-modal-back{position:fixed;inset:0;z-index:6000;display:grid;place-items:center;padding:16px;background:rgba(26,26,26,.68);backdrop-filter:blur(9px);font-family:'Cairo',sans-serif}.ssc-modal{width:min(680px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(217,201,176,.4);border-radius:23px;background:#FFFBF5;box-shadow:0 30px 90px rgba(26,26,26,.42)}.ssc-modal>header{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:17px 20px;background:linear-gradient(135deg,#32101A,#6B1E2D);color:#FFFBF5}.ssc-modal>header span{color:#D9C9B0;font-size:8px;font-weight:900}.ssc-modal>header h3{margin:2px 0 0;font-size:17px}.ssc-modal>header button{width:37px;height:37px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:11px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer}.ssc-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;overflow-y:auto;padding:20px}.ssc-form label{display:flex;flex-direction:column;gap:5px}.ssc-form label.wide,.ssc-error,.ssc-confirm{grid-column:1/-1}.ssc-form label>span{color:#655B53;font-size:9px;font-weight:900}.ssc-form input,.ssc-form textarea{width:100%;border:1px solid #D9C9B0;border-radius:11px;background:#FFFFFF;padding:10px 12px;color:#32101A;font:700 11px 'Cairo',sans-serif;outline:0}.ssc-form input{height:44px}.ssc-form textarea{resize:vertical;line-height:1.75}.ssc-form input:focus,.ssc-form textarea:focus{border-color:#6B1E2D;box-shadow:0 0 0 3px rgba(107,30,45,.08)}.ssc-error{margin:0;padding:9px 11px;border-radius:9px;background:rgba(107,30,45,.08);color:#6B1E2D;font-size:9px;font-weight:900}.ssc-confirm{padding:12px;border:1px solid rgba(107,30,45,.16);border-radius:12px;background:#F7F3EB}.ssc-confirm p{margin:0;color:#655B53;font-size:9.5px;font-weight:800;line-height:1.7}.ssc-confirm>div{display:flex;justify-content:flex-end;gap:7px;margin-top:9px}.ssc-confirm button{min-height:34px;border:1px solid #D9C9B0;border-radius:9px;background:#fff;padding:0 11px;color:#655B53;font:800 8.5px 'Cairo',sans-serif;cursor:pointer}.ssc-confirm button.danger{display:flex;align-items:center;gap:5px;border-color:#6B1E2D;background:#6B1E2D;color:#fff}.ssc-modal>footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:13px 20px;border-top:1px solid #E5E0D5}.ssc-modal>footer button{min-height:40px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;padding:0 15px;font:900 9.5px 'Cairo',sans-serif;cursor:pointer}.ssc-save{border:0;background:#6B1E2D;color:#fff}.ssc-save:disabled{opacity:.55;cursor:wait}.ssc-cancel{border:1px solid #D9C9B0;background:#fff;color:#655B53}.ssc-remove{margin-inline-end:auto;border:1px solid rgba(107,30,45,.2);background:#fff;color:#6B1E2D}
@media(max-width:1000px){.ssc-grid{grid-template-columns:1fr 1fr}.ssc-line{display:none}}@media(max-width:620px){.ssc-head{grid-template-columns:auto 1fr}.ssc-progress{grid-column:1/-1;justify-content:flex-start}.ssc-grid{grid-template-columns:1fr}.ssc-card{min-height:225px}.ssc-form{grid-template-columns:1fr;padding:16px}.ssc-form label,.ssc-form label.wide,.ssc-error,.ssc-confirm{grid-column:1}.ssc-modal-back{padding:0}.ssc-modal{height:100dvh;max-height:none;border:0;border-radius:0}.ssc-modal>footer{flex-wrap:wrap}.ssc-modal>footer button{flex:1}.ssc-remove{order:3;flex-basis:100%!important;margin:0}}
@media(prefers-reduced-motion:reduce){.ssc-card,.ssc-edit{transition:none}.ssc-card:hover{transform:none}}
`;
