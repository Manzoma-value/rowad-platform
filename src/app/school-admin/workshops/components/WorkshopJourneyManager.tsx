"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Award,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileQuestion,
  ListChecks,
  MessageSquareText,
  PenLine,
  PlayCircle,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useConfirm } from "@/lib/confirm-dialog";

type RequirementType = "VIDEO" | "QUIZ" | "MESSAGE" | "READING";
type QuestionType = "MCQ" | "TF" | "TEXT";

type Question = {
  id: string;
  type: QuestionType;
  text: string;
  correct_answer: string | null;
  options: Array<{ id: string; text: string }>;
};

type Requirement = {
  id: string;
  type: RequirementType;
  title: string;
  description: string | null;
  is_required: boolean;
  min_length: number;
  order: number;
  _count: { completions: number };
  quiz?: {
    id: string;
    title: string;
    description: string | null;
    passing_score: number;
    questions: Question[];
  } | null;
};

type Participant = {
  teacher_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  completed_at: string | null;
};

type PendingAnswer = {
  id: string;
  answer: string;
  question: string;
  teacher: string;
};

const requirementIcons = {
  VIDEO: PlayCircle,
  READING: BookOpenCheck,
  MESSAGE: MessageSquareText,
  QUIZ: FileQuestion,
} as const;

export function WorkshopJourneyManager({ workshopId, viewOnly, lang }: { workshopId: string; viewOnly: boolean; lang: "ar" | "sq" }) {
  const confirm = useConfirm();
  const isAr = lang === "ar";
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedType, setSelectedType] = useState<RequirementType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minLength, setMinLength] = useState(50);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<QuestionType>("MCQ");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [passingScores, setPassingScores] = useState<Record<string, number>>({});

  const copy = isAr ? {
    eyebrow: "إعداد رحلة الورشة",
    title: "صمّم مسارًا واضحًا لإتمام الورشة",
    sub: "رتّب ما يجب على المشرف إنجازه، واكتب تعليمات بسيطة لكل خطوة، ثم تابع النتائج من نفس المكان.",
    setup: "إعداد المسار",
    requirements: "متطلبات",
    completed: "أتمّوا الورشة",
    pendingReview: "إجابات تنتظر المراجعة",
    guideTitle: "كيف تبني رحلة ناجحة؟",
    guide: ["اختر نوع المتطلب", "اكتب المطلوب بوضوح", "رتّب الخطوات وتابع الإنجاز"],
    addRequirement: "إضافة خطوة جديدة",
    closeBuilder: "إغلاق أداة الإضافة",
    chooseType: "1. اختر نوع الخطوة",
    chooseTypeSub: "كل نوع يُنجز بطريقة مختلفة. اختر الأنسب للهدف الذي تريد قياسه.",
    details: "2. اكتب تعليمات واضحة",
    detailsSub: "سيرى المشرف هذا العنوان والوصف داخل خريطة رحلته.",
    titleLabel: "عنوان الخطوة",
    titlePlaceholder: "مثال: شاهد فيديو التعريف كاملًا",
    instructionsLabel: "ماذا يجب أن يفعل المشرف؟",
    instructionsPlaceholder: "اكتب تعليمات قصيرة ومباشرة توضح المطلوب وشرط الإتمام...",
    minLength: "الحد الأدنى لعدد الأحرف",
    minHelp: "تُحتسب رسالة الانعكاس مكتملة عند بلوغ هذا العدد.",
    create: "إضافة الخطوة إلى الرحلة",
    creating: "جارٍ الإضافة...",
    roadmap: "خطوات رحلة الورشة",
    roadmapSub: "هذا هو الترتيب الذي سيراه المشرف. استخدم الأسهم لتغيير ترتيب الخطوات.",
    emptyTitle: "ابدأ ببناء رحلة الورشة",
    emptySub: "أضف مشاهدة الفيديوهات، ثم القراءة أو رسالة الانعكاس، واختم باختبار قصير.",
    required: "إلزامي",
    optional: "اختياري",
    completions: "أنجزوا هذه الخطوة",
    allVideos: "كل الفيديوهات والأسئلة",
    manualConfirm: "تأكيد القراءة",
    minChars: "حرفًا على الأقل",
    questionCount: "أسئلة",
    configure: "إعداد الاختبار والأسئلة",
    hideSettings: "إخفاء الإعدادات",
    quizWorkspace: "استوديو الاختبار",
    quizWorkspaceSub: "حدد درجة النجاح ثم أضف الأسئلة واحدًا تلو الآخر. يمكنك المزج بين الأنواع الثلاثة.",
    passScore: "درجة النجاح",
    saveScore: "حفظ درجة النجاح",
    questions: "أسئلة الاختبار",
    noQuestions: "لم تضف أسئلة بعد. ابدأ بالسؤال الأول أدناه.",
    addQuestion: "إضافة سؤال جديد",
    questionType: "نوع السؤال",
    questionText: "نص السؤال",
    questionPlaceholder: "اكتب سؤالًا واضحًا لا يحتمل أكثر من معنى...",
    choices: "خيارات الإجابة",
    choicePlaceholder: "الخيار",
    correctChoice: "الإجابة الصحيحة",
    chooseCorrect: "اختر الإجابة الصحيحة",
    true: "صح",
    false: "خطأ",
    writtenHelp: "الإجابة الكتابية لا تُصحح تلقائيًا. ستظهر لك في صندوق المراجعة لتحديد النتيجة.",
    saveQuestion: "حفظ السؤال وإضافته",
    reviewTitle: "مراجعة الإجابات الكتابية",
    reviewSub: "راجع إجابات المشرفين وحدد هل حققت المطلوب. بعد التصحيح يُعاد حساب نتيجة الاختبار تلقائيًا.",
    correct: "مقبولة",
    needsWork: "تحتاج تحسينًا",
    completionTitle: "متابعة إتمام الورشة",
    completionSub: "قائمة سريعة توضح من أنهى الرحلة كاملة ومن لا يزال يعمل عليها.",
    finished: "مكتملة",
    inProgress: "قيد الإنجاز",
    noParticipants: "لا يوجد مشرفون مسجلون في هذه الورشة بعد.",
    deleteConfirm: "هل تريد حذف هذه الخطوة وكل بياناتها؟",
    saveError: "تعذر حفظ التغيير. راجع البيانات وحاول مرة أخرى.",
    loading: "جارٍ تجهيز خريطة الرحلة...",
    alreadyAdded: "تمت إضافته",
    typeNames: { VIDEO: "إتمام الفيديوهات", READING: "قراءة المحتوى", MESSAGE: "رسالة انعكاس", QUIZ: "اختبار قصير" },
    typeDescriptions: {
      VIDEO: "يشاهد المشرف كل فيديو ويجيب عن جميع الأسئلة الموجودة داخله.",
      READING: "يقرأ المادة المطلوبة ثم يؤكد إتمامها من خريطة الرحلة.",
      MESSAGE: "يكتب ما تعلمه أو يشارك انعكاسه في نقاش الورشة.",
      QUIZ: "يجيب عن أسئلة اختيارية وصح/خطأ وكتابية ويحقق درجة النجاح.",
    },
  } : {
    eyebrow: "Workshop journey setup",
    title: "Design a clear workshop completion path",
    sub: "Arrange exactly what supervisors must finish, explain every step, and monitor completion from one workspace.",
    setup: "Journey setup", requirements: "Requirements", completed: "Completed", pendingReview: "Awaiting review",
    guideTitle: "How to build a successful journey", guide: ["Choose a requirement type", "Explain the expected action", "Order the steps and track completion"],
    addRequirement: "Add a new step", closeBuilder: "Close builder", chooseType: "1. Choose the step type", chooseTypeSub: "Each type is completed differently. Pick the one that matches your goal.",
    details: "2. Add clear instructions", detailsSub: "Supervisors will see this title and instruction inside their roadmap.", titleLabel: "Step title", titlePlaceholder: "Example: Watch the introduction video", instructionsLabel: "What should the supervisor do?", instructionsPlaceholder: "Write short, direct instructions and explain the completion condition...",
    minLength: "Minimum characters", minHelp: "The reflection is complete after reaching this length.", create: "Add step to journey", creating: "Adding...",
    roadmap: "Workshop journey steps", roadmapSub: "This is the order supervisors will see. Use the arrows to change it.", emptyTitle: "Start building the journey", emptySub: "Add videos, reading or reflection, then finish with a short quiz.", required: "Required", optional: "Optional", completions: "completed this step", configure: "Configure quiz and questions", hideSettings: "Hide settings",
    allVideos: "All videos and questions", manualConfirm: "Reading confirmation", minChars: "minimum characters", questionCount: "questions",
    quizWorkspace: "Quiz studio", quizWorkspaceSub: "Set the passing score, then add questions one by one. You can mix all three formats.", passScore: "Passing score", saveScore: "Save passing score", questions: "Quiz questions", noQuestions: "No questions yet. Start with the first one below.", addQuestion: "Add a question", questionType: "Question type", questionText: "Question text", questionPlaceholder: "Write one clear and unambiguous question...", choices: "Answer choices", choicePlaceholder: "Choice", correctChoice: "Correct answer", chooseCorrect: "Choose the correct answer", true: "True", false: "False", writtenHelp: "Written answers require manual review and will appear in the review inbox below.", saveQuestion: "Save and add question",
    reviewTitle: "Review written answers", reviewSub: "Review each response and decide whether it meets the requirement. The quiz result updates automatically.", correct: "Accepted", needsWork: "Needs improvement",
    completionTitle: "Workshop completion tracking", completionSub: "See who finished the complete journey and who is still working.", finished: "Completed", inProgress: "In progress", noParticipants: "No supervisors are enrolled in this workshop yet.", deleteConfirm: "Delete this step and all of its data?", saveError: "The change could not be saved. Check the fields and try again.", loading: "Preparing the journey map...",
    alreadyAdded: "Already added",
    typeNames: { VIDEO: "Complete videos", READING: "Read content", MESSAGE: "Reflection message", QUIZ: "Short quiz" },
    typeDescriptions: { VIDEO: "Watch every video and answer all embedded questions.", READING: "Read the assigned material and confirm completion.", MESSAGE: "Share a learning reflection in the workshop discussion.", QUIZ: "Answer MCQ, true/false, and written questions and reach the passing score." },
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [journeyResponse, answersResponse] = await Promise.all([
        fetch(`/api/school-admin/workshops/${workshopId}/journey`, { cache: "no-store" }),
        fetch(`/api/school-admin/workshops/${workshopId}/journey/quiz/answers`, { cache: "no-store" }),
      ]);
      if (!journeyResponse.ok) throw new Error("load_failed");
      const [journeyPayload, answersPayload] = await Promise.all([journeyResponse.json(), answersResponse.json()]);
      const nextRequirements = (journeyPayload.requirements ?? []) as Requirement[];
      setRequirements(nextRequirements);
      setParticipants(journeyPayload.teachers ?? []);
      setPendingAnswers(answersPayload.answers ?? []);
      setPassingScores(Object.fromEntries(nextRequirements.filter((item) => item.quiz).map((item) => [item.id, item.quiz!.passing_score])));
      setError("");
    } catch {
      setError(copy.saveError);
    } finally {
      setLoading(false);
    }
  }, [workshopId, copy.saveError]);

  useEffect(() => { void load(); }, [load]);

  const completedCount = useMemo(() => participants.filter((participant) => participant.completed_at).length, [participants]);

  function selectType(type: RequirementType) {
    setSelectedType(type);
    setTitle(copy.typeNames[type]);
    setDescription(copy.typeDescriptions[type]);
  }

  function resetBuilder() {
    setSelectedType(null);
    setTitle("");
    setDescription("");
    setMinLength(50);
  }

  async function addRequirement() {
    if (!selectedType || !title.trim() || !description.trim() || viewOnly) return;
    setBusy("create");
    setError("");
    try {
      const response = await fetch(`/api/school-admin/workshops/${workshopId}/journey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, title, description, min_length: minLength }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("create_failed");
      setExpandedId(payload.requirement?.id ?? null);
      resetBuilder();
      setShowCreate(false);
      await load();
    } catch {
      setError(copy.saveError);
    } finally {
      setBusy(null);
    }
  }

  async function patchRequirement(requirementId: string, data: Record<string, unknown>) {
    if (viewOnly) return;
    setBusy(requirementId);
    try {
      const response = await fetch(`/api/school-admin/workshops/${workshopId}/journey`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement_id: requirementId, ...data }),
      });
      if (!response.ok) throw new Error("patch_failed");
      await load();
    } catch {
      setError(copy.saveError);
    } finally {
      setBusy(null);
    }
  }

  async function moveRequirement(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= requirements.length) return;
    const current = requirements[index];
    const target = requirements[targetIndex];
    setBusy(`move-${current.id}`);
    try {
      const responses = await Promise.all([
        fetch(`/api/school-admin/workshops/${workshopId}/journey`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requirement_id: current.id, order: target.order }) }),
        fetch(`/api/school-admin/workshops/${workshopId}/journey`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requirement_id: target.id, order: current.order }) }),
      ]);
      if (responses.some((response) => !response.ok)) throw new Error("move_failed");
      await load();
    } catch {
      setError(copy.saveError);
    } finally {
      setBusy(null);
    }
  }

  async function deleteRequirement(id: string) {
    if (viewOnly || !await confirm({ message: copy.deleteConfirm, variant: "danger" })) return;
    setBusy(id);
    try {
      const response = await fetch(`/api/school-admin/workshops/${workshopId}/journey?requirement_id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete_failed");
      if (expandedId === id) setExpandedId(null);
      await load();
    } catch {
      setError(copy.saveError);
    } finally {
      setBusy(null);
    }
  }

  async function savePassingScore(requirement: Requirement) {
    if (!requirement.quiz || viewOnly) return;
    setBusy(`score-${requirement.id}`);
    try {
      const response = await fetch(`/api/school-admin/workshops/${workshopId}/journey/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settings", passing_score: passingScores[requirement.id] ?? 70 }),
      });
      if (!response.ok) throw new Error("score_failed");
      await load();
    } catch {
      setError(copy.saveError);
    } finally {
      setBusy(null);
    }
  }

  async function addQuestion(requirement: Requirement) {
    if (!requirement.quiz || !questionText.trim() || viewOnly) return;
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
    if (questionType === "MCQ" && (cleanOptions.length < 2 || !correctAnswer || !cleanOptions.includes(correctAnswer))) {
      setError(copy.saveError);
      return;
    }
    if (questionType === "TF" && !["true", "false"].includes(correctAnswer)) {
      setError(copy.saveError);
      return;
    }
    setBusy(`question-${requirement.id}`);
    setError("");
    try {
      const response = await fetch(`/api/school-admin/workshops/${workshopId}/journey/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: questionType, text: questionText, correct_answer: questionType === "TEXT" ? null : correctAnswer, options: cleanOptions }),
      });
      if (!response.ok) throw new Error("question_failed");
      setQuestionText("");
      setOptions(["", "", "", ""]);
      setCorrectAnswer("");
      await load();
      setExpandedId(requirement.id);
    } catch {
      setError(copy.saveError);
    } finally {
      setBusy(null);
    }
  }

  async function deleteQuestion(questionId: string, requirementId: string) {
    if (viewOnly) return;
    setBusy(questionId);
    try {
      const response = await fetch(`/api/school-admin/workshops/${workshopId}/journey/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", question_id: questionId }),
      });
      if (!response.ok) throw new Error("delete_failed");
      await load();
      setExpandedId(requirementId);
    } catch {
      setError(copy.saveError);
    } finally {
      setBusy(null);
    }
  }

  async function gradeAnswer(answerId: string, isCorrect: boolean) {
    if (viewOnly) return;
    setBusy(answerId);
    try {
      const response = await fetch(`/api/school-admin/workshops/${workshopId}/journey/quiz/answers/${answerId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_correct: isCorrect }),
      });
      if (!response.ok) throw new Error("grade_failed");
      await load();
    } catch {
      setError(copy.saveError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="journey-admin" dir={isAr ? "rtl" : "ltr"}>
      <header className="journey-admin__hero">
        <div>
          <span className="journey-admin__eyebrow"><Sparkles size={15}/>{copy.eyebrow}</span>
          <h2>{copy.title}</h2>
          <p>{copy.sub}</p>
        </div>
        <div className="journey-admin__stats" aria-label={copy.setup}>
          <div><ListChecks size={17}/><strong>{requirements.length}</strong><span>{copy.requirements}</span></div>
          <div><Award size={17}/><strong>{completedCount}</strong><span>{copy.completed}</span></div>
          <div><PenLine size={17}/><strong>{pendingAnswers.length}</strong><span>{copy.pendingReview}</span></div>
        </div>
      </header>

      <div className="journey-admin__guide">
        <div><CircleHelp size={20}/><strong>{copy.guideTitle}</strong></div>
        <ol>{copy.guide.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ol>
      </div>

      {!viewOnly && (
        <div className="journey-admin__create-toggle">
          <button type="button" onClick={() => setShowCreate((current) => !current)}>
            {showCreate ? <X size={17}/> : <Plus size={17}/>} {showCreate ? copy.closeBuilder : copy.addRequirement}
          </button>
          <span>{copy.chooseTypeSub}</span>
        </div>
      )}

      {showCreate && !viewOnly && (
        <div className="requirement-builder">
          <div className="requirement-builder__section">
            <div className="requirement-builder__heading"><span>1</span><div><h3>{copy.chooseType}</h3><p>{copy.chooseTypeSub}</p></div></div>
            <div className="requirement-type-grid">
              {(Object.keys(requirementIcons) as RequirementType[]).map((type) => {
                const Icon = requirementIcons[type];
                const alreadyAdded = type === "QUIZ" && requirements.some((requirement) => requirement.type === "QUIZ");
                return <button type="button" key={type} className={`${selectedType === type ? "selected" : ""}${alreadyAdded ? " already-added" : ""}`} onClick={() => selectType(type)} disabled={alreadyAdded}>
                  <span className="requirement-type-grid__icon"><Icon size={22}/>{selectedType === type && <i><Check size={12}/></i>}</span>
                  <strong>{copy.typeNames[type]}</strong>
                  <small>{copy.typeDescriptions[type]}</small>
                  {alreadyAdded && <em>{copy.alreadyAdded}</em>}
                </button>;
              })}
            </div>
          </div>

          {selectedType && (
            <div className="requirement-builder__section requirement-builder__details">
              <div className="requirement-builder__heading"><span>2</span><div><h3>{copy.details}</h3><p>{copy.detailsSub}</p></div></div>
              <div className="requirement-builder__fields">
                <label><span>{copy.titleLabel}</span><input value={title} maxLength={180} onChange={(event) => setTitle(event.target.value)} placeholder={copy.titlePlaceholder}/></label>
                <label className="wide"><span>{copy.instructionsLabel}</span><textarea rows={4} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={copy.instructionsPlaceholder}/><small>{description.length}/1000</small></label>
                {selectedType === "MESSAGE" && <label><span>{copy.minLength}</span><input type="number" min={1} max={4000} value={minLength} onChange={(event) => setMinLength(Number(event.target.value))}/><small>{copy.minHelp}</small></label>}
              </div>
              <button className="journey-primary" type="button" onClick={() => void addRequirement()} disabled={busy === "create" || !title.trim() || !description.trim()}>
                {busy === "create" ? copy.creating : <><Plus size={16}/>{copy.create}</>}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="journey-admin__error" role="alert">{error}</p>}

      <div className="journey-admin__section-head">
        <div><span><ClipboardCheck size={16}/>{copy.setup}</span><h3>{copy.roadmap}</h3><p>{copy.roadmapSub}</p></div>
        <strong>{requirements.length}</strong>
      </div>

      {loading ? <div className="journey-admin__empty">{copy.loading}</div> : requirements.length === 0 ? (
        <div className="journey-admin__empty"><ListChecks size={34}/><strong>{copy.emptyTitle}</strong><p>{copy.emptySub}</p></div>
      ) : (
        <div className="journey-requirements">
          {requirements.map((requirement, index) => {
            const Icon = requirementIcons[requirement.type];
            const isExpanded = expandedId === requirement.id;
            return <article className={`journey-requirement journey-requirement--${requirement.type.toLowerCase()}${isExpanded ? " expanded" : ""}`} key={requirement.id}>
              <div className="journey-requirement__number"><span>{index + 1}</span><i/></div>
              <div className="journey-requirement__content">
                <div className="journey-requirement__top">
                  <span className="journey-requirement__icon"><Icon size={21}/></span>
                  <div className="journey-requirement__title"><span>{copy.typeNames[requirement.type]}</span><h4>{requirement.title}</h4><p>{requirement.description}</p></div>
                  <div className="journey-requirement__badges"><span className={requirement.is_required ? "required" : "optional"}>{requirement.is_required ? copy.required : copy.optional}</span><span><CheckCircle2 size={13}/>{requirement.type === "VIDEO" ? copy.allVideos : requirement.type === "READING" ? copy.manualConfirm : requirement.type === "MESSAGE" ? `${requirement.min_length} ${copy.minChars}` : `${requirement.quiz?.questions.length ?? 0} ${copy.questionCount}`}</span></div>
                </div>
                <div className="journey-requirement__actions">
                  {!viewOnly && <>
                    <button type="button" onClick={() => void moveRequirement(index, -1)} disabled={index === 0 || !!busy} title="Move up"><ArrowUp size={15}/></button>
                    <button type="button" onClick={() => void moveRequirement(index, 1)} disabled={index === requirements.length - 1 || !!busy} title="Move down"><ArrowDown size={15}/></button>
                    <button type="button" className="text" onClick={() => void patchRequirement(requirement.id, { is_required: !requirement.is_required })}>{requirement.is_required ? copy.optional : copy.required}</button>
                  </>}
                  {requirement.type === "QUIZ" && <button type="button" className="configure" onClick={() => setExpandedId(isExpanded ? null : requirement.id)}><Settings2 size={15}/>{isExpanded ? copy.hideSettings : copy.configure}<ChevronDown size={15}/></button>}
                  {!viewOnly && <button type="button" className="danger" onClick={() => void deleteRequirement(requirement.id)} disabled={busy === requirement.id}><Trash2 size={15}/></button>}
                </div>

                {requirement.type === "QUIZ" && requirement.quiz && isExpanded && (
                  <div className="quiz-studio">
                    <header><div><span><Sparkles size={14}/>{copy.quizWorkspace}</span><h4>{copy.quizWorkspace}</h4><p>{copy.quizWorkspaceSub}</p></div><div className="quiz-studio__score"><label>{copy.passScore}<span><input type="number" min={0} max={100} value={passingScores[requirement.id] ?? requirement.quiz.passing_score} onChange={(event) => setPassingScores((current) => ({ ...current, [requirement.id]: Number(event.target.value) }))}/><b>%</b></span></label>{!viewOnly && <button type="button" onClick={() => void savePassingScore(requirement)} disabled={busy === `score-${requirement.id}`}><Save size={14}/>{copy.saveScore}</button>}</div></header>

                    <div className="quiz-studio__questions-head"><div><h5>{copy.questions}</h5><p>{requirement.quiz.questions.length} {copy.questions}</p></div><strong>{requirement.quiz.questions.length}</strong></div>
                    {requirement.quiz.questions.length === 0 ? <div className="quiz-studio__empty"><FileQuestion size={27}/><span>{copy.noQuestions}</span></div> : <div className="quiz-question-list">{requirement.quiz.questions.map((question, questionIndex) => <div key={question.id}><span>{questionIndex + 1}</span><div><b>{question.type === "MCQ" ? "MCQ" : question.type === "TF" ? "T / F" : isAr ? "كتابي" : "Written"}</b><strong>{question.text}</strong>{question.type !== "TEXT" && <small>{copy.correctChoice}: {question.correct_answer === "true" ? copy.true : question.correct_answer === "false" ? copy.false : question.correct_answer}</small>}</div>{!viewOnly && <button type="button" onClick={() => void deleteQuestion(question.id, requirement.id)} disabled={busy === question.id}><Trash2 size={14}/></button>}</div>)}</div>}

                    {!viewOnly && <div className="question-builder">
                      <div className="question-builder__head"><span><Plus size={14}/>{copy.addQuestion}</span><h5>{copy.addQuestion}</h5></div>
                      <label className="question-builder__label">{copy.questionType}</label>
                      <div className="question-type-tabs">
                        <button type="button" className={questionType === "MCQ" ? "selected" : ""} onClick={() => { setQuestionType("MCQ"); setCorrectAnswer(""); }}><ListChecks size={16}/>MCQ<small>{isAr ? "اختيار من متعدد" : "Multiple choice"}</small></button>
                        <button type="button" className={questionType === "TF" ? "selected" : ""} onClick={() => { setQuestionType("TF"); setCorrectAnswer(""); }}><CheckCircle2 size={16}/>{isAr ? "صح / خطأ" : "True / False"}<small>{isAr ? "إجابتان واضحتان" : "Two clear choices"}</small></button>
                        <button type="button" className={questionType === "TEXT" ? "selected" : ""} onClick={() => { setQuestionType("TEXT"); setCorrectAnswer(""); }}><PenLine size={16}/>{isAr ? "إجابة كتابية" : "Written"}<small>{isAr ? "تحتاج مراجعتك" : "Manual review"}</small></button>
                      </div>
                      <label className="question-builder__field"><span>{copy.questionText}</span><textarea rows={3} maxLength={1000} value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder={copy.questionPlaceholder}/><small>{questionText.length}/1000</small></label>

                      {questionType === "MCQ" && <div className="question-builder__choices"><label>{copy.choices}</label><div>{options.map((option, optionIndex) => <label key={optionIndex} className="question-choice"><input type="radio" name={`correct-${requirement.id}`} checked={!!option && correctAnswer === option} onChange={() => option && setCorrectAnswer(option)} aria-label={copy.correctChoice}/><span>{String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(event) => { const value = event.target.value; setOptions((current) => current.map((item, index) => index === optionIndex ? value : item)); if (correctAnswer === option) setCorrectAnswer(value); }} placeholder={`${copy.choicePlaceholder} ${optionIndex + 1}`}/></label>)}</div><small>{copy.chooseCorrect}</small></div>}
                      {questionType === "TF" && <div className="question-builder__tf"><label>{copy.correctChoice}</label><div><button type="button" className={correctAnswer === "true" ? "selected" : ""} onClick={() => setCorrectAnswer("true")}><Check size={16}/>{copy.true}</button><button type="button" className={correctAnswer === "false" ? "selected" : ""} onClick={() => setCorrectAnswer("false")}><X size={16}/>{copy.false}</button></div></div>}
                      {questionType === "TEXT" && <div className="question-builder__notice"><PenLine size={18}/><p>{copy.writtenHelp}</p></div>}
                      <button type="button" className="journey-primary" onClick={() => void addQuestion(requirement)} disabled={busy === `question-${requirement.id}` || !questionText.trim() || (questionType !== "TEXT" && !correctAnswer)}><Plus size={15}/>{copy.saveQuestion}</button>
                    </div>}
                  </div>
                )}
              </div>
            </article>;
          })}
        </div>
      )}

      {pendingAnswers.length > 0 && <section className="written-review"><header><span><PenLine size={18}/></span><div><h3>{copy.reviewTitle}</h3><p>{copy.reviewSub}</p></div><strong>{pendingAnswers.length}</strong></header><div>{pendingAnswers.map((answer) => <article key={answer.id}><div className="written-review__person"><span>{answer.teacher.slice(0, 1)}</span><strong>{answer.teacher}</strong></div><div className="written-review__answer"><small>{answer.question}</small><p>{answer.answer}</p></div>{!viewOnly && <div className="written-review__actions"><button type="button" className="accept" onClick={() => void gradeAnswer(answer.id, true)} disabled={busy === answer.id}><Check size={15}/>{copy.correct}</button><button type="button" onClick={() => void gradeAnswer(answer.id, false)} disabled={busy === answer.id}><X size={15}/>{copy.needsWork}</button></div>}</article>)}</div></section>}

      <section className="completion-board"><header><div><span><Users size={16}/>{copy.completionTitle}</span><h3>{copy.completionTitle}</h3><p>{copy.completionSub}</p></div><div><strong>{completedCount}</strong><span>/ {participants.length}</span></div></header>{participants.length === 0 ? <div className="completion-board__empty">{copy.noParticipants}</div> : <div className="completion-board__grid">{participants.map((participant) => <article key={participant.teacher_id} className={participant.completed_at ? "done" : ""}><span className="completion-board__avatar">{participant.full_name.slice(0, 1)}</span><div><strong>{participant.full_name}</strong><small>{participant.email || "—"}</small></div><b>{participant.completed_at ? <><CheckCircle2 size={14}/>{copy.finished}</> : copy.inProgress}</b></article>)}</div>}</section>

      <style>{styles}</style>
    </section>
  );
}

const styles = `
.journey-admin{margin:18px 0;padding:clamp(16px,2.4vw,28px);border:1px solid rgba(107,30,45,.14);border-radius:26px;background:linear-gradient(145deg,#FFFBF5,#F7F3EB);box-shadow:0 18px 50px rgba(50,16,26,.08);font-family:'Cairo','Tajawal',sans-serif;color:#32101A}
.journey-admin *{box-sizing:border-box}.journey-admin button,.journey-admin input,.journey-admin textarea,.journey-admin select{font-family:inherit}.journey-admin button{transition:transform .16s ease,box-shadow .16s ease,background .16s ease,border-color .16s ease}.journey-admin button:hover:not(:disabled){transform:translateY(-1px)}.journey-admin button:focus-visible,.journey-admin input:focus-visible,.journey-admin textarea:focus-visible{outline:3px solid rgba(107,30,45,.14);outline-offset:2px}
.journey-admin__hero{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}.journey-admin__hero>div:first-child{max-width:760px}.journey-admin__eyebrow,.journey-admin__section-head span,.completion-board header>div>span{display:flex;align-items:center;gap:7px;color:#6B1E2D;font-size:10.5px;font-weight:900}.journey-admin__hero h2{margin:7px 0 5px;font-size:clamp(22px,2.4vw,30px);line-height:1.35}.journey-admin__hero p,.journey-admin__section-head p,.completion-board header p{margin:0;color:#796A62;font-size:11.5px;line-height:1.8}
.journey-admin__stats{display:grid;grid-template-columns:repeat(3,minmax(92px,1fr));gap:8px;min-width:340px}.journey-admin__stats div{display:grid;grid-template-columns:20px auto;align-items:center;column-gap:6px;min-height:82px;padding:11px 12px;border:1px solid rgba(107,30,45,.09);border-radius:16px;background:rgba(255,255,255,.7)}.journey-admin__stats svg{color:#6B1E2D}.journey-admin__stats strong{font-size:20px}.journey-admin__stats span{grid-column:1/-1;color:#796A62;font-size:9px;font-weight:800}
.journey-admin__guide{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:18px;padding:13px 16px;border:1px solid #D9C9B0;border-radius:16px;background:#FFFFFF}.journey-admin__guide>div{display:flex;align-items:center;gap:8px;color:#6B1E2D}.journey-admin__guide>div strong{font-size:11px}.journey-admin__guide ol{display:flex;align-items:center;gap:10px;margin:0;padding:0;list-style:none}.journey-admin__guide li{display:flex;align-items:center;gap:6px;color:#655B53;font-size:9.5px;font-weight:800}.journey-admin__guide li:not(:last-child):after{content:'';width:22px;height:1px;margin-inline-start:4px;background:#D9C9B0}.journey-admin__guide li span{width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:#32101A;color:#fff;font-size:9px}
.journey-admin__create-toggle{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:16px}.journey-admin__create-toggle>button,.journey-primary{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:0 16px;border:0;border-radius:12px;background:linear-gradient(135deg,#4A0E1C,#6B1E2D);color:#fff;font-size:11px;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(107,30,45,.16)}.journey-admin__create-toggle>span{color:#8C8274;font-size:9.5px}.journey-primary:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
.requirement-builder{margin-top:12px;border:1px solid rgba(107,30,45,.15);border-radius:20px;overflow:hidden;background:#FFFFFF;box-shadow:0 12px 32px rgba(50,16,26,.06)}.requirement-builder__section{padding:18px}.requirement-builder__section+.requirement-builder__section{border-top:1px solid #E5E0D5;background:#FFFBF5}.requirement-builder__heading{display:flex;align-items:flex-start;gap:10px;margin-bottom:14px}.requirement-builder__heading>span{width:28px;height:28px;display:grid;place-items:center;flex:none;border-radius:9px;background:#32101A;color:#fff;font-size:11px;font-weight:900}.requirement-builder__heading h3{margin:1px 0 2px;font-size:14px}.requirement-builder__heading p{margin:0;color:#796A62;font-size:10px;line-height:1.6}
.requirement-type-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.requirement-type-grid>button{min-height:150px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;padding:15px;border:1.5px solid #E5E0D5;border-radius:15px;background:#FFFBF5;color:#32101A;text-align:start;cursor:pointer}.requirement-type-grid>button:hover{border-color:#B8A082;box-shadow:0 8px 20px rgba(50,16,26,.06)}.requirement-type-grid>button.selected{border-color:#6B1E2D;background:rgba(107,30,45,.055);box-shadow:0 0 0 3px rgba(107,30,45,.08)}.requirement-type-grid__icon{position:relative;width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#EFEAE0;color:#6B1E2D}.requirement-type-grid__icon i{position:absolute;inset-inline-end:-4px;top:-4px;width:18px;height:18px;display:grid;place-items:center;border-radius:50%;background:#1B5E20;color:#fff}.requirement-type-grid strong{font-size:12px}.requirement-type-grid small{color:#796A62;font-size:9.5px;line-height:1.7}
.requirement-type-grid>button.already-added{opacity:.64;cursor:not-allowed}.requirement-type-grid>button.already-added:hover{transform:none;box-shadow:none;border-color:#E5E0D5}.requirement-type-grid em{margin-top:auto;padding:3px 7px;border-radius:999px;background:rgba(27,94,32,.1);color:#1B5E20;font-size:8px;font-style:normal;font-weight:900}
.requirement-builder__fields{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(320px,1.2fr);gap:12px;margin-bottom:14px}.requirement-builder__fields label{position:relative;display:block}.requirement-builder__fields label>span,.question-builder__field>span,.question-builder__choices>label,.question-builder__tf>label,.question-builder__label{display:block;margin-bottom:6px;color:#4A0E1C;font-size:10px;font-weight:900}.requirement-builder__fields input,.requirement-builder__fields textarea,.question-builder__field textarea,.question-choice>input:last-child,.quiz-studio__score input{width:100%;border:1px solid #D9C9B0;border-radius:11px;background:#fff;padding:11px 12px;color:#32101A;font-size:11px;line-height:1.7;resize:vertical}.requirement-builder__fields label>small,.question-builder__field>small{display:block;margin-top:4px;color:#8C8274;font-size:8.5px}.requirement-builder__details>.journey-primary{margin-inline-start:auto}
.journey-admin__error{margin:12px 0 0;padding:10px 12px;border:1px solid rgba(107,30,45,.16);border-radius:11px;background:rgba(107,30,45,.07);color:#6B1E2D;font-size:10px;font-weight:800}.journey-admin__section-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:24px 0 12px;padding-top:20px;border-top:1px solid #D9C9B0}.journey-admin__section-head h3{margin:5px 0 2px;font-size:17px}.journey-admin__section-head>strong{min-width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#32101A;color:#fff;font-size:14px}
.journey-admin__empty{min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:20px;border:1px dashed #D9C9B0;border-radius:16px;background:rgba(255,255,255,.58);color:#796A62;text-align:center;font-size:11px}.journey-admin__empty svg{color:#6B1E2D}.journey-admin__empty strong{color:#32101A;font-size:13px}.journey-admin__empty p{margin:0;max-width:520px;font-size:10px;line-height:1.7}
.journey-requirements{display:grid;gap:10px}.journey-requirement{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px}.journey-requirement__number{display:flex;flex-direction:column;align-items:center}.journey-requirement__number>span{width:32px;height:32px;display:grid;place-items:center;border-radius:11px;background:#32101A;color:#fff;font-size:11px;font-weight:900}.journey-requirement__number>i{width:2px;flex:1;margin-top:5px;background:#D9C9B0}.journey-requirement:last-child .journey-requirement__number>i{display:none}.journey-requirement__content{min-width:0;padding:14px;border:1px solid #E5E0D5;border-radius:16px;background:#FFFFFF}.journey-requirement.expanded .journey-requirement__content{border-color:rgba(107,30,45,.28);box-shadow:0 12px 32px rgba(50,16,26,.07)}.journey-requirement__top{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:start;gap:11px}.journey-requirement__icon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#EFEAE0;color:#6B1E2D}.journey-requirement__title>span{display:block;color:#6B1E2D;font-size:8.5px;font-weight:900}.journey-requirement__title h4{margin:3px 0 2px;font-size:13px}.journey-requirement__title p{margin:0;color:#796A62;font-size:10px;line-height:1.7}.journey-requirement__badges{display:flex;align-items:flex-end;flex-direction:column;gap:6px}.journey-requirement__badges span{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:999px;background:#EFEAE0;color:#655B53;font-size:8.5px;font-weight:800;white-space:nowrap}.journey-requirement__badges .required{background:rgba(27,94,32,.11);color:#1B5E20}.journey-requirement__badges .optional{background:#EFEAE0;color:#796A62}.journey-requirement__actions{display:flex;align-items:center;gap:6px;margin-top:10px;padding-top:9px;border-top:1px solid #EFEAE0}.journey-requirement__actions button{height:32px;display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid #D9C9B0;border-radius:9px;background:#FFFBF5;color:#6B1E2D;padding:0 9px;font-size:9px;font-weight:900;cursor:pointer}.journey-requirement__actions button:disabled{opacity:.35;cursor:not-allowed}.journey-requirement__actions .configure{margin-inline-start:auto;background:#32101A;border-color:#32101A;color:#fff}.journey-requirement__actions .danger{background:rgba(107,30,45,.06);border-color:rgba(107,30,45,.12)}
.quiz-studio{margin-top:13px;border:1px solid #D9C9B0;border-radius:16px;overflow:hidden;background:#F7F3EB}.quiz-studio>header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:16px;background:linear-gradient(135deg,#32101A,#4A0E1C);color:#fff}.quiz-studio>header>div:first-child{max-width:650px}.quiz-studio>header span{display:flex;align-items:center;gap:5px;color:#D9C9B0;font-size:9px;font-weight:900}.quiz-studio>header h4{margin:4px 0 2px;font-size:16px}.quiz-studio>header p{margin:0;color:rgba(255,255,255,.7);font-size:9.5px;line-height:1.7}.quiz-studio__score{display:flex;align-items:flex-end;gap:7px;flex:none}.quiz-studio__score label{color:#D9C9B0;font-size:8.5px;font-weight:900}.quiz-studio__score label>span{display:flex;align-items:center;margin-top:4px;border-radius:9px;background:#fff;overflow:hidden}.quiz-studio__score input{width:70px;border:0;border-radius:0;padding:8px;color:#32101A;text-align:center}.quiz-studio__score b{padding:0 8px;color:#6B1E2D}.quiz-studio__score>button{height:36px;display:flex;align-items:center;gap:5px;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(255,255,255,.1);color:#fff;padding:0 10px;font-size:8.5px;font-weight:900;cursor:pointer}
.quiz-studio__questions-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px 8px}.quiz-studio__questions-head h5{margin:0;font-size:12px}.quiz-studio__questions-head p{margin:2px 0 0;color:#796A62;font-size:8.5px}.quiz-studio__questions-head>strong{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:#32101A;color:#fff;font-size:11px}.quiz-studio__empty{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 14px 12px;padding:20px;border:1px dashed #D9C9B0;border-radius:11px;background:#fff;color:#796A62;font-size:10px}.quiz-question-list{display:grid;gap:6px;padding:0 14px 13px}.quiz-question-list>div{display:grid;grid-template-columns:28px minmax(0,1fr) 30px;align-items:center;gap:9px;padding:9px;border:1px solid #E5E0D5;border-radius:10px;background:#fff}.quiz-question-list>div>span{width:27px;height:27px;display:grid;place-items:center;border-radius:8px;background:#EFEAE0;color:#6B1E2D;font-size:9px;font-weight:900}.quiz-question-list b,.quiz-question-list strong,.quiz-question-list small{display:block}.quiz-question-list b{color:#6B1E2D;font-size:7.5px}.quiz-question-list strong{margin-top:2px;font-size:10.5px}.quiz-question-list small{margin-top:2px;color:#1B5E20;font-size:8px}.quiz-question-list button{width:28px;height:28px;display:grid;place-items:center;border:0;border-radius:8px;background:rgba(107,30,45,.07);color:#6B1E2D;cursor:pointer}
.question-builder{margin:0 14px 14px;padding:14px;border:1px solid rgba(107,30,45,.15);border-radius:14px;background:#fff}.question-builder__head{margin-bottom:12px}.question-builder__head>span{display:flex;align-items:center;gap:5px;color:#6B1E2D;font-size:8.5px;font-weight:900}.question-builder__head h5{margin:4px 0 0;font-size:13px}.question-type-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px}.question-type-tabs button{display:grid;grid-template-columns:22px 1fr;align-items:center;gap:2px 6px;min-height:58px;padding:8px;border:1px solid #D9C9B0;border-radius:10px;background:#FFFBF5;color:#32101A;text-align:start;font-size:9.5px;font-weight:900;cursor:pointer}.question-type-tabs button svg{grid-row:1/3;color:#6B1E2D}.question-type-tabs button small{font-size:7.5px;color:#796A62}.question-type-tabs button.selected{border-color:#6B1E2D;background:rgba(107,30,45,.06);box-shadow:0 0 0 2px rgba(107,30,45,.07)}.question-builder__field{position:relative;display:block;margin-bottom:12px}.question-builder__field>small{text-align:end}.question-builder__choices>div{display:grid;grid-template-columns:1fr 1fr;gap:7px}.question-choice{display:grid;grid-template-columns:18px 28px minmax(0,1fr);align-items:center;gap:6px;padding:6px;border:1px solid #E5E0D5;border-radius:10px;background:#FFFBF5}.question-choice>input[type=radio]{accent-color:#6B1E2D}.question-choice>span{width:27px;height:27px;display:grid;place-items:center;border-radius:8px;background:#EFEAE0;color:#6B1E2D;font-size:9px;font-weight:900}.question-choice>input:last-child{padding:8px;border-radius:8px}.question-builder__choices>small{display:block;margin:5px 0 12px;color:#796A62;font-size:8px}.question-builder__tf>div{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:12px}.question-builder__tf button{height:42px;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid #D9C9B0;border-radius:10px;background:#FFFBF5;color:#32101A;font-size:10px;font-weight:900;cursor:pointer}.question-builder__tf button.selected{border-color:#6B1E2D;background:#EFEAE0;color:#6B1E2D}.question-builder__notice{display:flex;align-items:flex-start;gap:8px;margin-bottom:12px;padding:11px;border-radius:10px;background:#EFEAE0;color:#6B1E2D}.question-builder__notice p{margin:0;font-size:9px;line-height:1.7}.question-builder>.journey-primary{min-height:40px}
.written-review,.completion-board{margin-top:20px;padding-top:18px;border-top:1px solid #D9C9B0}.written-review>header,.completion-board>header{display:flex;align-items:center;gap:10px;margin-bottom:10px}.written-review>header>span{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#32101A;color:#fff}.written-review>header h3,.completion-board h3{margin:0;font-size:15px}.written-review>header p{margin:2px 0 0;color:#796A62;font-size:9.5px;line-height:1.7}.written-review>header>strong{margin-inline-start:auto;min-width:36px;height:36px;display:grid;place-items:center;border-radius:11px;background:#6B1E2D;color:#fff}.written-review>div{display:grid;gap:7px}.written-review article{display:grid;grid-template-columns:160px minmax(0,1fr) auto;align-items:center;gap:10px;padding:11px;border:1px solid #E5E0D5;border-radius:12px;background:#fff}.written-review__person{display:flex;align-items:center;gap:7px}.written-review__person>span{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:#32101A;color:#fff;font-size:11px;font-weight:900}.written-review__person strong{font-size:10px}.written-review__answer small{display:block;color:#6B1E2D;font-size:8px;font-weight:900}.written-review__answer p{margin:3px 0 0;color:#32101A;font-size:10px;line-height:1.7;white-space:pre-wrap}.written-review__actions{display:flex;gap:5px}.written-review__actions button{height:34px;display:flex;align-items:center;gap:4px;border:1px solid rgba(107,30,45,.16);border-radius:9px;background:rgba(107,30,45,.06);color:#6B1E2D;padding:0 9px;font-size:8.5px;font-weight:900;cursor:pointer}.written-review__actions .accept{border-color:rgba(27,94,32,.18);background:rgba(27,94,32,.08);color:#1B5E20}
.completion-board>header{justify-content:space-between}.completion-board>header>div:last-child{display:flex;align-items:baseline;gap:3px}.completion-board>header>div:last-child strong{font-size:22px}.completion-board>header>div:last-child span{color:#796A62;font-size:10px}.completion-board__empty{padding:20px;border:1px dashed #D9C9B0;border-radius:12px;text-align:center;color:#796A62;font-size:10px}.completion-board__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.completion-board__grid article{display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:9px;padding:10px;border:1px solid #E5E0D5;border-radius:12px;background:#fff}.completion-board__grid article.done{border-color:rgba(27,94,32,.2);background:rgba(27,94,32,.035)}.completion-board__avatar{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#32101A;color:#fff;font-size:12px;font-weight:900}.completion-board__grid strong,.completion-board__grid small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.completion-board__grid strong{font-size:10.5px}.completion-board__grid small{margin-top:2px;color:#796A62;font-size:8.5px}.completion-board__grid article>b{display:flex;align-items:center;gap:4px;padding:4px 7px;border-radius:999px;background:#EFEAE0;color:#796A62;font-size:8px;white-space:nowrap}.completion-board__grid article.done>b{background:rgba(27,94,32,.1);color:#1B5E20}
@media(max-width:1050px){.journey-admin__hero{flex-direction:column}.journey-admin__stats{width:100%;min-width:0}.requirement-type-grid{grid-template-columns:repeat(2,1fr)}.requirement-builder__fields{grid-template-columns:1fr}.written-review article{grid-template-columns:140px minmax(0,1fr)}.written-review__actions{grid-column:1/-1;justify-content:flex-end}}
@media(max-width:720px){.journey-admin{border-radius:20px;padding:15px}.journey-admin__stats{grid-template-columns:repeat(3,1fr)}.journey-admin__stats div{min-height:74px;padding:9px}.journey-admin__guide{align-items:flex-start;flex-direction:column}.journey-admin__guide ol{width:100%;display:grid;gap:7px}.journey-admin__guide li:not(:last-child):after{display:none}.journey-admin__create-toggle{align-items:stretch;flex-direction:column}.journey-admin__create-toggle>button{width:100%}.requirement-builder__section{padding:14px}.requirement-type-grid{grid-template-columns:1fr}.requirement-type-grid>button{min-height:0;display:grid;grid-template-columns:42px minmax(0,1fr);align-items:center}.requirement-type-grid__icon{grid-row:1/3}.requirement-type-grid small{grid-column:2}.journey-requirement{grid-template-columns:26px minmax(0,1fr);gap:7px}.journey-requirement__number>span{width:26px;height:26px;border-radius:8px}.journey-requirement__top{grid-template-columns:38px minmax(0,1fr)}.journey-requirement__icon{width:38px;height:38px}.journey-requirement__badges{grid-column:1/-1;align-items:flex-start;flex-direction:row;flex-wrap:wrap}.journey-requirement__actions{flex-wrap:wrap}.journey-requirement__actions .configure{order:-1;width:100%;margin-inline-start:0}.quiz-studio>header{flex-direction:column}.quiz-studio__score{width:100%;justify-content:space-between}.question-type-tabs{grid-template-columns:1fr}.question-builder__choices>div{grid-template-columns:1fr}.written-review article{grid-template-columns:1fr}.written-review__actions{justify-content:stretch}.written-review__actions button{flex:1;justify-content:center}.completion-board__grid{grid-template-columns:1fr}}
@media(max-width:420px){.journey-admin__stats{grid-template-columns:1fr}.journey-admin__stats div{grid-template-columns:20px auto 1fr;min-height:54px}.journey-admin__stats span{grid-column:auto;text-align:end}.journey-requirement__content{padding:11px}.quiz-studio{margin-inline:-4px}.question-builder{margin:0 9px 9px;padding:10px}.quiz-studio__score{align-items:stretch;flex-direction:column}.quiz-studio__score>button{justify-content:center}}
`;
