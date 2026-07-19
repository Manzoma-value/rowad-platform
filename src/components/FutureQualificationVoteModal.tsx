"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, Send, ShieldCheck } from "lucide-react";

type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";
type AnswerKey = "coaching" | "consultation" | "evaluation" | "support" | "leader";
type Answers = {
  coaching: Frequency | null;
  consultation: Frequency | null;
  evaluation: Frequency | null;
  support: Frequency | null;
  leader: boolean | null;
};

type Question = {
  key: AnswerKey;
  eyebrow: string;
  title: string;
  description: string;
  prompt: string;
  options: Array<{ value: Frequency | boolean; label: string; hint: string }>;
};

const QUESTIONS: Question[] = [
  {
    key: "coaching",
    eyebrow: "Coaching individual",
    title: "Programi i mentorimit në vendin e punës",
    description: "Një program interaktiv me seanca individuale, ku mentori takohet veçmas me secilin mbikëqyrës për të kuptuar me saktësi karakteristikat dhe nevojat e grupit të tij.",
    prompt: "Cila është shpeshtësia më e përshtatshme për ty për një seancë individuale coaching?",
    options: [
      { value: "WEEKLY", label: "Një herë në javë", hint: "Mbështetje individuale çdo javë" },
      { value: "BIWEEKLY", label: "Një herë çdo dy javë", hint: "Mbështetje individuale dy herë në muaj" },
    ],
  },
  {
    key: "consultation",
    eyebrow: "Konsultim në grup",
    title: "Seancat e konsultimit në grup",
    description: "Takime me pesë mbikëqyrës nga e njëjta zonë gjeografike për të diskutuar zbatimin e modelit konsultativ, për ta përdorur atë në situata reale pune dhe për të shkëmbyer përvoja.",
    prompt: "Cila është shpeshtësia më e përshtatshme për zhvillimin e kësaj seance konsultimi?",
    options: [
      { value: "BIWEEKLY", label: "Një herë çdo dy javë", hint: "Dy seanca konsultimi në muaj" },
      { value: "MONTHLY", label: "Një herë në muaj", hint: "Një seancë e përbashkët çdo muaj" },
    ],
  },
  {
    key: "evaluation",
    eyebrow: "Vlerësim zhvillimor",
    title: "Seancat e vlerësimit zhvillimor",
    description: "Seanca për të studiuar një rast vlerësimi nga modeli i punës. Qëllimi nuk është vendosja e notave, por identifikimi i pikave për zhvillim dhe përdorimi i vlerësimit si mjet fuqizimi.",
    prompt: "Cila është shpeshtësia më e përshtatshme për zhvillimin e seancës së vlerësimit?",
    options: [
      { value: "WEEKLY", label: "Çdo javë", hint: "Rishikim dhe zhvillim i vazhdueshëm" },
      { value: "BIWEEKLY", label: "Një herë çdo dy javë", hint: "Dy seanca vlerësimi në muaj" },
      { value: "MONTHLY", label: "Një herë në muaj", hint: "Një seancë vlerësimi çdo muaj" },
    ],
  },
  {
    key: "support",
    eyebrow: "Mbështetje në terren",
    title: "Sistemi i mbështetjes në terren",
    description: "Një proces mbështetjeje ku një mbikëqyrës me përvojë viziton dhe mbështet një koleg tjetër gjatë seancave të tij, si dhe ndihmon në kapërcimin e sfidave në terren.",
    prompt: "Cila shpeshtësi do të ishte e përshtatshme për ty për këtë lloj mbështetjeje?",
    options: [
      { value: "WEEKLY", label: "Çdo javë", hint: "Mbështetje e afërt dhe e vazhdueshme" },
      { value: "BIWEEKLY", label: "Një herë çdo dy javë", hint: "Mbështetje dy herë në muaj" },
      { value: "MONTHLY", label: "Një herë në muaj", hint: "Mbështetje e planifikuar mujore" },
    ],
  },
  {
    key: "leader",
    eyebrow: "Udhëheqja e grupit",
    title: "Caktimi i një drejtuesi të grupit",
    description: "Drejtuesi i grupit e orienton punën gjatë një periudhe të caktuar, koordinon hapat dhe ndihmon në ruajtjen e vazhdimësisë së punës.",
    prompt: "A mendon se grupi yt aktual ka nevojë për një drejtues të caktuar për një periudhë të përcaktuar?",
    options: [
      { value: true, label: "Po, kemi nevojë për një drejtues", hint: "E mbështes aktivizimin dhe caktimin e këtij roli" },
      { value: false, label: "Jo, jo për momentin", hint: "Nuk e shoh të nevojshëm këtë rol në fazën aktuale" },
    ],
  },
];

const INITIAL_ANSWERS: Answers = {
  coaching: null,
  consultation: null,
  evaluation: null,
  support: null,
  leader: null,
};

const MAX_NOTES_LENGTH = 1000;
// One extra, optional step after the five required questions, for a
// free-text comment.
const TOTAL_STEPS = QUESTIONS.length + 1;

export default function FutureQualificationVoteModal() {
  const [state, setState] = useState<"checking" | "required" | "submitting" | "success" | "error" | "done">("checking");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");
  const isNotesStep = step === QUESTIONS.length;
  const question = QUESTIONS[step] ?? null;
  const currentAnswer = question ? answers[question.key] : null;
  const isLast = step === TOTAL_STEPS - 1;
  const progress = useMemo(() => ((step + 1) / TOTAL_STEPS) * 100, [step]);

  const checkStatus = async () => {
    setState("checking");
    try {
      const response = await fetch("/api/teacher/future-qualification-vote", { cache: "no-store" });
      if (!response.ok) throw new Error("status");
      const data = await response.json() as { completed?: boolean };
      setState(data.completed ? "done" : "required");
    } catch {
      setState("error");
    }
  };

  useEffect(() => { void checkStatus(); }, []);

  useEffect(() => {
    if (state !== "required" && state !== "submitting" && state !== "success" && state !== "error") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [state]);

  const choose = (value: Frequency | boolean) => {
    setSubmitError("");
    setAnswers((current) => ({ ...current, [question.key]: value }));
  };

  const submit = async () => {
    if (Object.values(answers).some((answer) => answer === null)) return;
    setState("submitting");
    setSubmitError("");
    try {
      const response = await fetch("/api/teacher/future-qualification-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coaching_frequency: answers.coaching,
          consultation_frequency: answers.consultation,
          evaluation_frequency: answers.evaluation,
          field_support_frequency: answers.support,
          needs_group_leader: answers.leader,
          notes: notes.trim() || null,
        }),
      });
      if (!response.ok) throw new Error("submit");
      setState("success");
      window.setTimeout(() => setState("done"), 1400);
    } catch {
      setSubmitError("Dërgimi nuk u përfundua. Kontrollo lidhjen dhe provo përsëri.");
      setState("required");
    }
  };

  if (state === "checking" || state === "done") return null;

  return (
    <div className="fqv-overlay" role="dialog" aria-modal="true" aria-labelledby="fqv-title" dir="ltr">
      <div className="fqv-shell">
        {state === "error" ? (
          <div className="fqv-state">
            <ShieldCheck size={36} />
            <h2>Nuk mund të ngarkohej votimi</h2>
            <p>Ky votim është i detyrueshëm. Kontrollo lidhjen me internetin dhe provo përsëri.</p>
            <button type="button" onClick={() => void checkStatus()}>Provo përsëri</button>
          </div>
        ) : state === "success" ? (
          <div className="fqv-state success">
            <span className="fqv-success-icon"><Check size={34} /></span>
            <h2>Faleminderit për përgjigjet!</h2>
            <p>Mendimi yt është regjistruar me sukses dhe do të ndihmojë në planifikimin e fazës së ardhshme.</p>
          </div>
        ) : (
          <>
            <header className="fqv-head">
              <div className="fqv-brand"><ShieldCheck size={18} /><span>Al Rowad - Albania</span></div>
              <h1 id="fqv-title">Votim për proceset e ardhshme të zhvillimit profesional</h1>
              <p>Pas përfundimit të fazës së parë të trajnimit, duam të përcaktojmë së bashku mënyrën më të përshtatshme të mbështetjes në terren. Përgjigju pesë pyetjeve të shkurtra dhe, nëse dëshiron, shto një koment në fund.</p>
              <div className="fqv-progress-meta"><span>Pyetja {step + 1} nga {TOTAL_STEPS}</span><strong>{Math.round(progress)}%</strong></div>
              <div className="fqv-progress"><span style={{ width: `${progress}%` }} /></div>
            </header>

            <main className="fqv-body">
              {isNotesStep ? (
                <>
                  <span className="fqv-eyebrow">Shënime shtesë</span>
                  <h2>Diçka tjetër që dëshiron të shtosh?</h2>
                  <p className="fqv-description">Ky hap është plotësisht opsional. Nëse ke ndonjë koment, sugjerim, ose diçka tjetër që do të donim ta dinim para se t&apos;i dërgosh përgjigjet, na e shkruaj këtu.</p>
                  <h3>Koment <span className="fqv-optional-badge">Opsionale</span></h3>
                  <textarea
                    className="fqv-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value.slice(0, MAX_NOTES_LENGTH))}
                    placeholder="Shkruaj këtu... (nuk është e detyrueshme)"
                    rows={5}
                    maxLength={MAX_NOTES_LENGTH}
                    aria-label="Koment opsional"
                  />
                  <span className="fqv-notes-count">{notes.length}/{MAX_NOTES_LENGTH}</span>
                </>
              ) : question && (
                <>
                  <span className="fqv-eyebrow">{question.eyebrow}</span>
                  <h2>{question.title}</h2>
                  <p className="fqv-description">{question.description}</p>
                  <h3>{question.prompt}</h3>
                  <div className="fqv-options" role="radiogroup" aria-label={question.prompt}>
                    {question.options.map((option) => {
                      const selected = currentAnswer === option.value;
                      return (
                        <button
                          key={String(option.value)}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={selected ? "selected" : ""}
                          onClick={() => choose(option.value)}
                        >
                          <span className="fqv-radio">{selected && <Check size={14} />}</span>
                          <span><strong>{option.label}</strong><small>{option.hint}</small></span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {submitError && <p className="fqv-error" role="alert">{submitError}</p>}
            </main>

            <footer className="fqv-actions">
              <button type="button" className="secondary" disabled={step === 0 || state === "submitting"} onClick={() => setStep((current) => current - 1)}>
                <ChevronLeft size={17} />Kthehu
              </button>
              {isLast ? (
                <button type="button" className="primary" disabled={state === "submitting"} onClick={() => void submit()}>
                  {state === "submitting" ? <LoaderCircle className="fqv-spin" size={17} /> : <Send size={17} />}
                  {state === "submitting" ? "Duke dërguar..." : "Dërgo përgjigjet"}
                </button>
              ) : (
                <button type="button" className="primary" disabled={currentAnswer === null} onClick={() => setStep((current) => current + 1)}>
                  Vazhdo<ChevronRight size={17} />
                </button>
              )}
            </footer>
          </>
        )}
      </div>

      <style>{`
        .fqv-overlay{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:18px;background:rgba(26,26,26,.72);backdrop-filter:blur(10px);font-family:'Cairo','Tajawal',sans-serif;color:#32101A}
        .fqv-shell{width:min(760px,100%);max-height:calc(100dvh - 36px);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(217,201,176,.42);border-radius:18px;background:#FFFBF5;box-shadow:0 34px 110px rgba(26,26,26,.42)}
        .fqv-head{flex:none;padding:22px 26px 18px;background:linear-gradient(125deg,#32101A,#6B1E2D);color:#FFFBF5}
        .fqv-brand{display:flex;align-items:center;gap:7px;color:#D9C9B0;font-size:11px;font-weight:800}.fqv-head h1{margin:10px 0 6px;font-size:24px;line-height:1.45;letter-spacing:0}.fqv-head>p{max-width:660px;margin:0;color:rgba(247,243,235,.72);font-size:12px;line-height:1.75}
        .fqv-progress-meta{display:flex;align-items:center;justify-content:space-between;margin-top:16px;color:#D9C9B0;font-size:9.5px;font-weight:800}.fqv-progress{height:4px;margin-top:6px;overflow:hidden;background:rgba(255,255,255,.13)}.fqv-progress span{display:block;height:100%;background:#D9C9B0;transition:width .3s ease}
        .fqv-body{flex:1;min-height:0;overflow-y:auto;padding:24px 26px}.fqv-eyebrow{display:inline-block;color:#6B1E2D;font-size:10px;font-weight:900;text-transform:uppercase}.fqv-body h2{margin:5px 0 8px;font-size:21px;line-height:1.45}.fqv-description{margin:0;padding-bottom:17px;border-bottom:1px solid #E5E0D5;color:#655B53;font-size:12.5px;line-height:1.8}.fqv-body h3{margin:18px 0 12px;font-size:15px;line-height:1.65}
        .fqv-options{display:grid;gap:9px}.fqv-options>button{width:100%;display:grid;grid-template-columns:25px minmax(0,1fr);align-items:center;gap:11px;padding:13px 14px;border:1px solid #D9C9B0;border-radius:10px;background:#fff;color:#32101A;text-align:left;font:inherit;cursor:pointer;transition:.17s ease}.fqv-options>button:hover{border-color:#6B1E2D;background:#F7F3EB}.fqv-options>button.selected{border-color:#6B1E2D;background:rgba(107,30,45,.055);box-shadow:0 0 0 3px rgba(107,30,45,.07)}.fqv-radio{width:22px;height:22px;display:grid;place-items:center;border:1.5px solid #B8A082;border-radius:50%;color:#fff}.selected .fqv-radio{border-color:#6B1E2D;background:#6B1E2D}.fqv-options strong,.fqv-options small{display:block}.fqv-options strong{font-size:13px}.fqv-options small{margin-top:2px;color:#796A62;font-size:10px;line-height:1.5}.fqv-error{margin:12px 0 0;color:#6B1E2D;font-size:11px;font-weight:800}
        .fqv-optional-badge{display:inline-block;margin-inline-start:8px;padding:2px 9px;border-radius:99px;background:rgba(107,30,45,.08);color:#6B1E2D;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;vertical-align:middle}
        .fqv-notes{width:100%;min-height:120px;padding:12px 14px;border:1px solid #D9C9B0;border-radius:10px;background:#fff;color:#32101A;font:inherit;font-size:13px;line-height:1.7;resize:vertical;outline:none;transition:border-color .15s,box-shadow .15s}.fqv-notes:focus{border-color:#6B1E2D;box-shadow:0 0 0 3px rgba(107,30,45,.08)}.fqv-notes::placeholder{color:#8C8274}
        .fqv-notes-count{display:block;margin-top:6px;text-align:end;color:#8C8274;font-size:10px;font-weight:700}
        .fqv-actions{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 26px max(13px,env(safe-area-inset-bottom));border-top:1px solid #E5E0D5;background:#F7F3EB}.fqv-actions button,.fqv-state button{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:9px;padding:8px 16px;font:800 12px 'Cairo',sans-serif;cursor:pointer}.fqv-actions .secondary{border:1px solid #D9C9B0;background:#fff;color:#6B1E2D}.fqv-actions .primary,.fqv-state button{border:0;background:#6B1E2D;color:#fff}.fqv-actions button:disabled{opacity:.4;cursor:not-allowed}.fqv-spin{animation:fqv-spin .8s linear infinite}@keyframes fqv-spin{to{transform:rotate(360deg)}}
        .fqv-state{min-height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:34px;text-align:center}.fqv-state>svg{color:#6B1E2D}.fqv-state h2{margin:0;font-size:21px}.fqv-state p{max-width:460px;margin:0 0 8px;color:#655B53;font-size:12.5px;line-height:1.8}.fqv-success-icon{width:68px;height:68px;display:grid;place-items:center;border-radius:50%;background:#1B5E20;color:#fff;box-shadow:0 0 0 10px rgba(27,94,32,.08)}
        @media(max-width:600px){.fqv-overlay{padding:0;place-items:stretch}.fqv-shell{width:100%;max-height:100dvh;height:100dvh;border:0;border-radius:0}.fqv-head{padding:18px 17px 15px}.fqv-head h1{font-size:19px}.fqv-head>p{font-size:11px;line-height:1.65}.fqv-body{padding:20px 16px}.fqv-body h2{font-size:19px}.fqv-description{font-size:12px}.fqv-body h3{font-size:14px}.fqv-options>button{min-height:64px;padding:12px}.fqv-actions{padding-inline:14px}.fqv-actions button{min-height:46px;padding-inline:13px}}
        @media(max-width:360px){.fqv-head>p{display:none}.fqv-head h1{font-size:17px}.fqv-body{padding-top:16px}.fqv-actions button{font-size:11px}}
        @media(prefers-reduced-motion:reduce){.fqv-overlay *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
      `}</style>
    </div>
  );
}
