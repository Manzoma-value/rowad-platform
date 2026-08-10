"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity, ArrowLeft, Award, BookOpen, BrainCircuit, CheckCircle2, ChevronRight,
  CircleUserRound, ClipboardCheck, Clock3, Gamepad2, GraduationCap, Languages,
  Mail, MapPin, MessageCircleMore, Network, Phone, Radar, Search, Sparkles,
  Target, Trophy, UserRoundCheck, Users, WandSparkles,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import IdentityMandala from "@/components/IdentityMandala";
import TraitSpectrumPanel from "@/components/TraitSpectrumPanel";
import { seedFromString } from "@/lib/trait-spectrum";
import { canonicalizeDefaultTraits } from "@/lib/rowad-assessment";
import {
  CURRENT_ROLE_L, EXPERIENCE_RANGE_L, QUALIFICATION_L,
  type CurrentRole, type ExperienceRange, type Qualification,
} from "@/lib/teacher-application";

type Lang = "ar" | "sq" | "en";
type Tab = "overview" | "learning" | "community" | "spectrum" | "games" | "profile";
type Scores = number[];

type TeacherProfile = {
  id: string; created_at: string; onboarding_status: string;
  application_draft: Record<string, unknown> | null; application_draft_updated_at: string | null;
  profile: {
    id: string; created_at: string; full_name: string; email: string | null; avatar_url: string | null; is_active: boolean;
    posts: Array<{ id: string; content: string | null; image_url: string | null; reply_to_id: string | null; created_at: string; _count: { replies: number; reactions: number } }>;
    teacherGroupAnnouncements: Array<{ id: string; content: string; created_at: string; group: { id: string; name: string } }>;
    workshopMessages: Array<{ id: string; body: string; created_at: string; workshop: { id: string; title: string } }>;
    rowadGameSubmissions: Array<{ id: string; stage: string; score: number; total: number; created_at: string }>;
    miniGameSubmissions: Array<{ id: string; game: string; score: number; won: boolean; meta: unknown; created_at: string }>;
    rowadGameDrafts: Array<{ id: string; stage: string; updated_at: string }>;
  };
  application: null | Record<string, unknown> & {
    age: number; country: string; city: string; phone: string; email: string; gender: string;
    current_role: string; qualification: string; specialization: string; graduation_institution: string;
    years_of_experience: string; languages: unknown; submitted_at: string;
  };
  future_qualification_vote: null | Record<string, unknown>;
  classes: Array<{
    id: string; name: string; created_at: string;
    students: Array<{ id: string; created_at: string; onboarding_status: string; city: string | null; age: number | null; profile: { id: string; full_name: string; email: string | null; avatar_url: string | null; is_active: boolean } }>;
    _count: { students: number; lessons: number; quizzes: number; announcements: number };
  }>;
  group_memberships: Array<{ joined_at: string; group: { id: string; name: string; description: string | null; updated_at: string; _count: { members: number; assessments: number; announcements: number } } }>;
  lessons: Array<{ id: string; title: string; description: string | null; review_status: string; reviewer_notes: string | null; is_published: boolean; is_legacy: boolean; is_graded: boolean; created_at: string; updated_at: string; class: { id: string; name: string }; module: null | { id: string; title: string; stage: { id: string; title: string } }; _count: { contents: number; questions: number; attempts: number } }>;
  quizzes: Array<{ id: string; name: string; review_status: string; reviewer_notes: string | null; is_legacy: boolean; created_at: string; submitted_at: string | null; reviewed_at: string | null; class: { id: string; name: string }; module: null | { id: string; title: string; stage: { id: string; title: string } }; _count: { questions: number; attempts: number } }>;
  announcements: Array<{ id: string; content: string; created_at: string; class: { id: string; name: string } }>;
  workshop_signup: null | { id: string; title: string; status: string; start_date: string | null; end_date: string | null };
  workshop_enrollments: Array<{ id: string; source: string; status: string; enrolled_at: string; workshop: { id: string; title: string; status: string; start_date: string | null; end_date: string | null } }>;
  workshop_attendance: Array<{ id: string; day_date: string; checked_in_at: string; source: string; workshop: { id: string; title: string } }>;
  workshop_completions: Array<{ id: string; completed_at: string; workshop: { id: string; title: string } }>;
  ratings_received: Array<{ assessment_id: string; rater_teacher_id: string; scores: unknown; updated_at: string; rater: { id: string; profile: { id: string; full_name: string; avatar_url: string | null } }; assessment: { id: string; title: string; status: string; created_at: string; closed_at: string | null; traits: Array<{ position: number; label_ar: string; label_sq: string; statement_ar: string; statement_sq: string; color: string; kind: "TARGET" | "EARLY_OBSERVATION"; objective_ar: string | null; objective_sq: string | null }>; target_groups: Array<{ group: { id: string; name: string } }> } }>;
  ratings_given: Array<{ assessment_id: string; target_teacher_id: string; scores: unknown; updated_at: string; target: { id: string; profile: { id: string; full_name: string; avatar_url: string | null } }; assessment: { id: string; title: string } }>;
  traitAssessments: Array<{ id: string; general_note: string | null; observed_at: string; submitted_at: string; updated_at: string; student: { id: string; profile: { id: string; full_name: string; avatar_url: string | null } }; module: { id: string; title: string; stage: { id: string; title: string } }; trait_scores: Array<{ score: number; note: string | null; trait: { id: string; name: string; name_sq: string | null; maqsad: string } }> }>;
};

const COPY = {
  ar: {
    back: "العودة إلى المشرفين", profile: "الملف الشامل للمشرف", active: "حساب مفعّل", inactive: "حساب معطّل",
    joined: "انضم إلى المنصة", overview: "نظرة عامة", learning: "التعليم والمستفيدون", community: "المجتمع والرسائل",
    spectrum: "الطيف والقياسات", games: "الألعاب والتفاعل", personal: "البيانات الشخصية",
    students: "المستفيدون", classes: "المجموعات التعليمية", lessons: "الدروس", quizzes: "الاختبارات",
    communities: "المجتمعات", messages: "المساهمات", gameRounds: "جولات اللعب", ratings: "قراءات مستلمة",
    professionalSnapshot: "البطاقة المهنية", currentRole: "الدور الحالي", qualification: "المؤهل", specialization: "التخصص",
    experience: "سنوات الخبرة", institution: "جهة التخرج", location: "الموقع", age: "العمر", phone: "الهاتف", email: "البريد",
    languages: "اللغات", noData: "لا توجد بيانات مسجلة بعد", recentActivity: "آخر النشاطات", viewAll: "عرض القسم كاملاً",
    classesTitle: "المجموعات والمستفيدون", classesSub: "المجموعات التعليمية المسندة للمشرف ومن يتابعهم داخل كل مجموعة.",
    authoredContent: "المحتوى الذي أنشأه", authoredSub: "الدروس والاختبارات وحالتها في مسار المراجعة.",
    communityTitle: "أثره في المجتمع", communitySub: "المنشورات والردود ورسائل مجتمعات المشرفين والورش.",
    publicPosts: "منشورات المجتمع العام", groupMessages: "رسائل مجتمعات المشرفين", classAnnouncements: "إعلانات المجموعات التعليمية", workshopMessages: "رسائل الورش",
    replies: "ردود", reactions: "تفاعلات", spectrumTitle: "البصمة السلوكية", spectrumSub: "متوسط القراءات التي تلقاها المشرف في كل نموذج قياس.",
    receivedFrom: (n: number) => `${n} قراءة من زملائه`, selectModel: "اختر نموذج القياس", noSpectrum: "لم يتلقَّ هذا المشرف أي قراءة طيفية بعد.",
    raters: "من قيّمه؟", ratedOthers: "من قيّمهم؟", lastUpdate: "آخر تحديث", gameTitle: "سجل الألعاب", gameSub: "كل محاولات اللعب والنتائج المسجلة لهذا المشرف.",
    bestScore: "أفضل نتيجة", plays: "مرات اللعب", wins: "مرات الفوز", cardGame: "لعبة النموذج", practiceGames: "الألعاب التدريبية", inProgress: "محاولة غير مكتملة",
    workshops: "الورش والتدريب", attendanceDays: "أيام حضور", completed: "مكتمل", enrolled: "مسجّل", professionalDetails: "كل البيانات المهنية والشخصية",
    groups: "مجتمعات المشرفين", futureVote: "تفضيلات التأهيل المستقبلي", evaluations: "تقييمات المستفيدين", created: "أُنشئ", updated: "حُدّث",
    review: "حالة المراجعة", attempts: "محاولات", questions: "أسئلة", content: "عناصر محتوى", openProfile: "عرض ملف المشرف",
    loadingError: "تعذّر تحميل ملف المشرف.", searchStudents: "ابحث عن مستفيد...", allStudents: "كل المستفيدين", teacherReading: "القراءة الحالية",
  },
  sq: {
    back: "Kthehu te edukatorët", profile: "Profili i plotë i edukatorit", active: "Llogari aktive", inactive: "Llogari jo aktive",
    joined: "U bashkua në platformë", overview: "Përmbledhje", learning: "Mësimi dhe pjesëmarrësit", community: "Komuniteti dhe mesazhet",
    spectrum: "Spektri dhe matjet", games: "Lojërat dhe angazhimi", personal: "Të dhënat personale",
    students: "Pjesëmarrës", classes: "Grupe mësimore", lessons: "Mësime", quizzes: "Kuize",
    communities: "Komunitete", messages: "Kontribute", gameRounds: "Raunde loje", ratings: "Lexime të marra",
    professionalSnapshot: "Karta profesionale", currentRole: "Roli aktual", qualification: "Kualifikimi", specialization: "Specializimi",
    experience: "Përvoja", institution: "Institucioni", location: "Vendndodhja", age: "Mosha", phone: "Telefoni", email: "Email", languages: "Gjuhët",
    noData: "Ende nuk ka të dhëna", recentActivity: "Aktiviteti i fundit", viewAll: "Shiko të gjithë seksionin",
    classesTitle: "Grupet dhe pjesëmarrësit", classesSub: "Grupet e caktuara dhe pjesëmarrësit që edukatori ndjek.",
    authoredContent: "Përmbajtja e krijuar", authoredSub: "Mësimet, kuizet dhe statusi i tyre në shqyrtim.",
    communityTitle: "Ndikimi në komunitet", communitySub: "Postimet, përgjigjet dhe mesazhet në komunitete e forume.",
    publicPosts: "Postime publike", groupMessages: "Mesazhe në grupet e edukatorëve", classAnnouncements: "Njoftime në grupet mësimore", workshopMessages: "Mesazhe në forume",
    replies: "përgjigje", reactions: "reagime", spectrumTitle: "Gjurma e tipareve", spectrumSub: "Mesatarja e leximeve të marra në çdo model matjeje.",
    receivedFrom: (n: number) => `${n} lexime nga kolegët`, selectModel: "Zgjidh modelin", noSpectrum: "Ky edukator nuk ka marrë ende lexim spektri.",
    raters: "Kush e vlerësoi?", ratedOthers: "Kë ka vlerësuar?", lastUpdate: "Përditësimi i fundit", gameTitle: "Historia e lojërave", gameSub: "Të gjitha raundet dhe rezultatet e ruajtura.",
    bestScore: "Rezultati më i mirë", plays: "Lojëra", wins: "Fitore", cardGame: "Loja e modelit", practiceGames: "Lojëra praktike", inProgress: "Përpjekje e papërfunduar",
    workshops: "Forumet dhe trajnimi", attendanceDays: "ditë pjesëmarrje", completed: "Përfunduar", enrolled: "I regjistruar", professionalDetails: "Të gjitha të dhënat personale dhe profesionale",
    groups: "Grupet e edukatorëve", futureVote: "Preferencat e zhvillimit", evaluations: "Vlerësime të pjesëmarrësve", created: "Krijuar", updated: "Përditësuar",
    review: "Shqyrtimi", attempts: "përpjekje", questions: "pyetje", content: "pjesë përmbajtjeje", openProfile: "Hap profilin",
    loadingError: "Profili nuk u ngarkua.", searchStudents: "Kërko pjesëmarrës...", allStudents: "Të gjithë pjesëmarrësit", teacherReading: "Leximi aktual",
  },
  en: {
    back: "Back to supervisors", profile: "Complete supervisor profile", active: "Active account", inactive: "Inactive account",
    joined: "Joined the platform", overview: "Overview", learning: "Learning & beneficiaries", community: "Community & messages",
    spectrum: "Spectrum & assessments", games: "Games & engagement", personal: "Personal information",
    students: "Beneficiaries", classes: "Learning groups", lessons: "Lessons", quizzes: "Quizzes", communities: "Communities", messages: "Contributions", gameRounds: "Game rounds", ratings: "Readings received",
    professionalSnapshot: "Professional card", currentRole: "Current role", qualification: "Qualification", specialization: "Specialization", experience: "Experience", institution: "Institution", location: "Location", age: "Age", phone: "Phone", email: "Email", languages: "Languages",
    noData: "No data recorded yet", recentActivity: "Recent activity", viewAll: "View full section", classesTitle: "Groups & beneficiaries", classesSub: "Assigned learning groups and their beneficiaries.",
    authoredContent: "Authored content", authoredSub: "Lessons, quizzes and their review status.", communityTitle: "Community impact", communitySub: "Posts, replies, group messages and workshop conversations.",
    publicPosts: "Public community posts", groupMessages: "Supervisor group messages", classAnnouncements: "Learning group announcements", workshopMessages: "Workshop messages", replies: "replies", reactions: "reactions",
    spectrumTitle: "Trait signature", spectrumSub: "Average peer readings received in each assessment model.", receivedFrom: (n: number) => `${n} peer readings`, selectModel: "Choose a model", noSpectrum: "This supervisor has not received a spectrum reading yet.", raters: "Who rated them?", ratedOthers: "Who did they rate?", lastUpdate: "Last update",
    gameTitle: "Game history", gameSub: "Every saved round and result for this supervisor.", bestScore: "Best score", plays: "Plays", wins: "Wins", cardGame: "Model game", practiceGames: "Practice games", inProgress: "Unfinished attempt",
    workshops: "Workshops & training", attendanceDays: "attendance days", completed: "Completed", enrolled: "Enrolled", professionalDetails: "All personal and professional information", groups: "Supervisor groups", futureVote: "Future development preferences", evaluations: "Beneficiary evaluations", created: "Created", updated: "Updated", review: "Review", attempts: "attempts", questions: "questions", content: "content items", openProfile: "Open profile",
    loadingError: "The supervisor profile could not be loaded.", searchStudents: "Search beneficiaries...", allStudents: "All beneficiaries", teacherReading: "Current reading",
  },
} as const;

const GAME_LABELS: Record<string, { ar: string; sq: string; en: string }> = {
  MEMORY: { ar: "تحدي الذاكرة", sq: "Sfida e kujtesës", en: "Memory Match" }, HUNTER: { ar: "صياد المقاصد", sq: "Gjuetari i qëllimeve", en: "Maqsad Hunter" },
  SPEED: { ar: "تحدي السرعة", sq: "Sfida e shpejtësisë", en: "Speed Drill" }, COLLECTOR: { ar: "جامع المقاصد", sq: "Mbledhësi i qëllimeve", en: "Maqsad Collector" },
  WORDRAIN: { ar: "مطر الكلمات", sq: "Shiu i fjalëve", en: "Word Rain" }, IMPACT_PATH: { ar: "مسار الأثر", sq: "Rruga e ndikimit", en: "Impact Path" },
};

const ONBOARDING_LABELS: Record<string, { ar: string; sq: string; en: string }> = {
  PENDING_APPLICATION: { ar: "بانتظار التقديم", sq: "Në pritje të aplikimit", en: "Application pending" },
  UNDER_REVIEW: { ar: "قيد المراجعة", sq: "Në shqyrtim", en: "Under review" },
  WAITING_LIST: { ar: "قائمة الانتظار", sq: "Në listën e pritjes", en: "Waiting list" },
  ACTIVE: { ar: "مفعّل", sq: "Aktiv", en: "Active" },
  REJECTED: { ar: "غير مقبول", sq: "Nuk u pranua", en: "Not accepted" },
};

function onboardingLabel(status: string, lang: Lang) {
  return ONBOARDING_LABELS[status]?.[lang] ?? status.replaceAll("_", " ");
}

function date(value: string | null | undefined, lang: Lang, withTime = false) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : lang === "sq" ? "sq-AL" : "en-GB", withTime ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" });
}

function codeLabel(code: string | undefined, lang: Lang, kind: "qualification" | "experience" | "role") {
  if (!code) return "—";
  const source = kind === "qualification" ? QUALIFICATION_L[code as Qualification] : kind === "experience" ? EXPERIENCE_RANGE_L[code as ExperienceRange] : CURRENT_ROLE_L[code as CurrentRole];
  if (source && lang !== "en") return source[lang];
  return code.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function languagesText(value: unknown, lang: Lang) {
  if (!Array.isArray(value)) return "—";
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") return "";
    const item = entry as Record<string, unknown>;
    const code = String(item.lang ?? "");
    const names: Record<string, Record<Lang, string>> = { ar: { ar: "العربية", sq: "Arabisht", en: "Arabic" }, en: { ar: "الإنجليزية", sq: "Anglisht", en: "English" }, sq: { ar: "الألبانية", sq: "Shqip", en: "Albanian" }, tr: { ar: "التركية", sq: "Turqisht", en: "Turkish" }, fr: { ar: "الفرنسية", sq: "Frëngjisht", en: "French" } };
    return names[code]?.[lang] ?? code;
  }).filter(Boolean).join(lang === "ar" ? "، " : ", ") || "—";
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function scores(value: unknown): Scores { return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : []; }
function average(items: Scores[]) {
  if (!items.length) return [];
  const length = Math.max(...items.map((item) => item.length));
  return Array.from({ length }, (_, index) => Math.round((items.reduce((sum, item) => sum + (item[index] ?? 0), 0) / items.length) * 10) / 10);
}

function Avatar({ name, src, size = 54 }: { name: string; src?: string | null; size?: number }) {
  return src ? <Image src={src} alt={name} width={size} height={size} className="tp-avatar-img" /> : <span className="tp-avatar-fallback" style={{ width: size, height: size }}>{initials(name)}</span>;
}

function Metric({ icon, value, label }: { icon: ReactNode; value: number | string; label: string }) {
  return <div className="tp-metric"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function Empty({ children }: { children: ReactNode }) { return <div className="tp-empty"><Sparkles size={20} />{children}</div>; }
function Status({ value, lang }: { value: string; lang: Lang }) {
  const labels: Record<string, Record<Lang, string>> = {
    APPROVED: { ar: "معتمد", sq: "Miratuar", en: "Approved" }, PENDING_REVIEW: { ar: "بانتظار المراجعة", sq: "Në shqyrtim", en: "Pending review" },
    DRAFT: { ar: "مسودة", sq: "Draft", en: "Draft" }, REJECTED: { ar: "يحتاج تعديلاً", sq: "Kërkon ndryshim", en: "Needs changes" }, OPEN: { ar: "مفتوح", sq: "I hapur", en: "Open" }, CLOSED: { ar: "مغلق", sq: "I mbyllur", en: "Closed" },
  };
  return <span className={`tp-status tp-status-${value.toLowerCase()}`}>{labels[value]?.[lang] ?? value}</span>;
}

export default function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang: rawLang } = useLang();
  const lang = (rawLang === "sq" ? "sq" : rawLang === "en" ? "en" : "ar") as Lang;
  const T = COPY[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedSpectrum, setSelectedSpectrum] = useState("");
  const [studentQuery, setStudentQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/school-admin/teachers/${id}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => { if (active) setTeacher(payload.teacher ?? null); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const students = useMemo(() => teacher?.classes.flatMap((klass) => klass.students.map((student) => ({ ...student, className: klass.name }))) ?? [], [teacher]);
  const communityCount = (teacher?.profile.posts.length ?? 0) + (teacher?.profile.teacherGroupAnnouncements.length ?? 0) + (teacher?.announcements.length ?? 0) + (teacher?.profile.workshopMessages.length ?? 0);
  const gameCount = (teacher?.profile.rowadGameSubmissions.length ?? 0) + (teacher?.profile.miniGameSubmissions.length ?? 0);

  const spectrumModels = useMemo(() => {
    const map = new Map<string, TeacherProfile["ratings_received"]>();
    for (const rating of teacher?.ratings_received ?? []) {
      const list = map.get(rating.assessment_id) ?? [];
      list.push(rating);
      map.set(rating.assessment_id, list);
    }
    return Array.from(map.values()).map((ratings) => ({
      id: ratings[0].assessment.id,
      assessment: ratings[0].assessment,
      ratings,
      average: average(ratings.map((rating) => scores(rating.scores))),
    }));
  }, [teacher]);
  const selectedModelId = selectedSpectrum || spectrumModels[0]?.id || "";
  const activeSpectrum = spectrumModels.find((model) => model.id === selectedModelId) ?? spectrumModels[0];

  const activity = useMemo(() => {
    if (!teacher) return [];
    return [
      ...teacher.lessons.map((item) => ({ id: `lesson-${item.id}`, at: item.updated_at, icon: <BookOpen size={15} />, title: item.title, meta: `${T.lessons} · ${item.class.name}` })),
      ...teacher.profile.posts.map((item) => ({ id: `post-${item.id}`, at: item.created_at, icon: <MessageCircleMore size={15} />, title: item.content || T.publicPosts, meta: T.publicPosts })),
      ...teacher.profile.miniGameSubmissions.map((item) => ({ id: `game-${item.id}`, at: item.created_at, icon: <Gamepad2 size={15} />, title: GAME_LABELS[item.game]?.[lang] ?? item.game, meta: `${item.score} · ${T.gameRounds}` })),
      ...teacher.ratings_received.map((item) => ({ id: `rating-${item.assessment_id}-${item.rater_teacher_id}`, at: item.updated_at, icon: <Radar size={15} />, title: item.assessment.title, meta: `${T.ratings} · ${item.rater.profile.full_name}` })),
      ...teacher.workshop_attendance.map((item) => ({ id: `attendance-${item.id}`, at: item.checked_in_at, icon: <UserRoundCheck size={15} />, title: item.workshop.title, meta: T.attendanceDays })),
    ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 10);
  }, [teacher, T, lang]);

  if (loading) return <div className="tp-loading"><MandalaLoader /><style>{styles}</style></div>;
  if (error || !teacher) return <div className="tp-shell" dir={dir}><Link href="/school-admin/teachers" className="tp-back"><ArrowLeft size={16} />{T.back}</Link><div className="tp-error">{T.loadingError}</div><style>{styles}</style></div>;

  const app = teacher.application;
  const tabItems: Array<{ id: Tab; label: string; icon: ReactNode }> = [
    { id: "overview", label: T.overview, icon: <Activity size={16} /> }, { id: "learning", label: T.learning, icon: <BookOpen size={16} /> },
    { id: "community", label: T.community, icon: <MessageCircleMore size={16} /> }, { id: "spectrum", label: T.spectrum, icon: <Radar size={16} /> },
    { id: "games", label: T.games, icon: <Gamepad2 size={16} /> }, { id: "profile", label: T.personal, icon: <CircleUserRound size={16} /> },
  ];

  return (
    <main className="tp-shell" dir={dir}>
      <Link href="/school-admin/teachers" className="tp-back"><ArrowLeft size={16} />{T.back}</Link>

      <header className="tp-hero">
        <div className="tp-orbit tp-orbit-one" /><div className="tp-orbit tp-orbit-two" />
        <div className="tp-mandala"><IdentityMandala size={360} stroke="#B8A082" opacity={0.12} /></div>
        <div className="tp-hero-main">
          <div className="tp-avatar-wrap"><Avatar name={teacher.profile.full_name} src={teacher.profile.avatar_url} size={92} /><i className={teacher.profile.is_active ? "active" : ""} /></div>
          <div className="tp-hero-copy">
            <span className="tp-eyebrow"><WandSparkles size={14} />{T.profile}</span>
            <h1>{teacher.profile.full_name}</h1>
            <div className="tp-hero-meta">
              <span className={teacher.profile.is_active ? "is-active" : "is-inactive"}><i />{teacher.profile.is_active ? T.active : T.inactive}</span>
              {app && <span><GraduationCap size={13} />{codeLabel(app.current_role, lang, "role")}</span>}
              {app && <span><MapPin size={13} />{app.city}, {app.country}</span>}
            </div>
            <div className="tp-contact-row">
              {(teacher.profile.email || app?.email) && <a href={`mailto:${teacher.profile.email || app?.email}`}><Mail size={14} />{teacher.profile.email || app?.email}</a>}
              {app?.phone && <a href={`tel:${app.phone}`}><Phone size={14} />{app.phone}</a>}
            </div>
          </div>
        </div>
        <div className="tp-hero-side">
          <span>{T.joined}</span><strong>{date(teacher.created_at, lang)}</strong>
          <div className="tp-hero-score"><Sparkles size={16} /><b>{onboardingLabel(teacher.onboarding_status, lang)}</b></div>
        </div>
      </header>

      <section className="tp-metrics" aria-label={T.overview}>
        <Metric icon={<Users />} value={students.length} label={T.students} />
        <Metric icon={<Network />} value={teacher.classes.length} label={T.classes} />
        <Metric icon={<BookOpen />} value={teacher.lessons.length} label={T.lessons} />
        <Metric icon={<MessageCircleMore />} value={communityCount} label={T.messages} />
        <Metric icon={<Gamepad2 />} value={gameCount} label={T.gameRounds} />
        <Metric icon={<Radar />} value={teacher.ratings_received.length} label={T.ratings} />
      </section>

      <nav className="tp-tabs" aria-label={T.profile}>
        {tabItems.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={tab === item.id ? "active" : ""}>{item.icon}<span>{item.label}</span></button>)}
      </nav>

      <div className="tp-view" key={tab}>
        {tab === "overview" && <>
          <div className="tp-overview-grid">
            <section className="tp-panel tp-prof-card">
              <PanelHead icon={<GraduationCap />} title={T.professionalSnapshot} subtitle={T.professionalDetails} />
              {app ? <div className="tp-info-grid">
                <Info icon={<Award />} label={T.qualification} value={codeLabel(app.qualification, lang, "qualification")} />
                <Info icon={<Target />} label={T.specialization} value={app.specialization} />
                <Info icon={<Clock3 />} label={T.experience} value={codeLabel(app.years_of_experience, lang, "experience")} />
                <Info icon={<GraduationCap />} label={T.institution} value={app.graduation_institution} />
                <Info icon={<MapPin />} label={T.location} value={`${app.city}, ${app.country}`} />
                <Info icon={<Languages />} label={T.languages} value={languagesText(app.languages, lang)} />
              </div> : <Empty>{T.noData}</Empty>}
              <button className="tp-inline-link" onClick={() => setTab("profile")}>{T.viewAll}<ChevronRight size={15} /></button>
            </section>

            <section className="tp-panel tp-activity-card">
              <PanelHead icon={<Activity />} title={T.recentActivity} subtitle={T.lastUpdate} />
              {activity.length ? <div className="tp-timeline">{activity.map((item) => <article key={item.id}><span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.meta}</small></div><time>{date(item.at, lang)}</time></article>)}</div> : <Empty>{T.noData}</Empty>}
            </section>
          </div>

          <section className="tp-panel tp-feature-spectrum">
            <PanelHead icon={<BrainCircuit />} title={T.spectrumTitle} subtitle={T.spectrumSub} />
            {activeSpectrum ? <div className="tp-spectrum-overview">
              <div className="tp-spectrum-copy"><span>{T.teacherReading}</span><h2>{activeSpectrum.assessment.title}</h2><p>{T.receivedFrom(activeSpectrum.ratings.length)}</p><button onClick={() => setTab("spectrum")}>{T.viewAll}<ChevronRight size={15} /></button></div>
              <TraitSpectrumPanel traits={canonicalizeDefaultTraits(activeSpectrum.assessment.traits).map((trait, index) => ({ label: lang === "ar" ? trait.label_ar : trait.label_sq, color: trait.color, pct: activeSpectrum.average[index] ?? 0 }))} seed={seedFromString(`${teacher.id}:${activeSpectrum.id}`)} lang={lang === "ar" ? "ar" : "sq"} summary />
            </div> : <Empty>{T.noSpectrum}</Empty>}
          </section>
        </>}

        {tab === "learning" && <LearningView teacher={teacher} lang={lang} T={T} students={students} query={studentQuery} setQuery={setStudentQuery} />}
        {tab === "community" && <CommunityView teacher={teacher} lang={lang} T={T} />}
        {tab === "spectrum" && <SpectrumView teacher={teacher} models={spectrumModels} active={activeSpectrum} selected={selectedModelId} setSelected={setSelectedSpectrum} lang={lang} T={T} />}
        {tab === "games" && <GamesView teacher={teacher} lang={lang} T={T} />}
        {tab === "profile" && <PersonalView teacher={teacher} lang={lang} T={T} />}
      </div>
      <style>{styles}</style>
    </main>
  );
}

function PanelHead({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) { return <header className="tp-panel-head"><span>{icon}</span><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></header>; }
function Info({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) { return <div className="tp-info"><span>{icon}</span><div><small>{label}</small><strong>{value || "—"}</strong></div></div>; }

function LearningView({ teacher, lang, T, students, query, setQuery }: { teacher: TeacherProfile; lang: Lang; T: typeof COPY[Lang]; students: Array<TeacherProfile["classes"][number]["students"][number] & { className: string }>; query: string; setQuery: (value: string) => void }) {
  const visible = students.filter((student) => student.profile.full_name.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="tp-stack">
    <section className="tp-panel"><PanelHead icon={<Users />} title={T.classesTitle} subtitle={T.classesSub} />
      <div className="tp-class-grid">{teacher.classes.map((klass) => <article className="tp-class-card" key={klass.id}><header><span><Network size={17} /></span><div><h3>{klass.name}</h3><small>{klass._count.students} {T.students}</small></div></header><div className="tp-class-stats"><span>{klass._count.lessons} {T.lessons}</span><span>{klass._count.quizzes} {T.quizzes}</span><span>{klass._count.announcements} {T.messages}</span></div><div className="tp-avatar-stack">{klass.students.slice(0, 7).map((student) => <span title={student.profile.full_name} key={student.id}><Avatar name={student.profile.full_name} src={student.profile.avatar_url} size={34} /></span>)}{klass.students.length > 7 && <b>+{klass.students.length - 7}</b>}</div></article>)}</div>
      {!teacher.classes.length && <Empty>{T.noData}</Empty>}
    </section>
    <section className="tp-panel"><div className="tp-list-toolbar"><PanelHead icon={<CircleUserRound />} title={T.allStudents} /><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T.searchStudents} /></label></div>
      {visible.length ? <div className="tp-people-grid">{visible.map((student) => <article key={`${student.className}-${student.id}`}><Avatar name={student.profile.full_name} src={student.profile.avatar_url} size={44} /><div><strong>{student.profile.full_name}</strong><span>{student.className}</span><small>{student.profile.email || student.city || "—"}</small></div></article>)}</div> : <Empty>{T.noData}</Empty>}
    </section>
    <section className="tp-panel"><PanelHead icon={<BookOpen />} title={T.authoredContent} subtitle={T.authoredSub} /><div className="tp-content-columns"><ContentList title={T.lessons} items={teacher.lessons.map((item) => ({ id: item.id, title: item.title, className: item.class.name, status: item.review_status, date: item.updated_at, facts: [`${item._count.contents} ${T.content}`, `${item._count.questions} ${T.questions}`, `${item._count.attempts} ${T.attempts}`] }))} lang={lang} T={T} /><ContentList title={T.quizzes} items={teacher.quizzes.map((item) => ({ id: item.id, title: item.name, className: item.class.name, status: item.review_status, date: item.created_at, facts: [`${item._count.questions} ${T.questions}`, `${item._count.attempts} ${T.attempts}`] }))} lang={lang} T={T} /></div></section>
    <section className="tp-panel"><PanelHead icon={<ClipboardCheck />} title={T.evaluations} />{teacher.traitAssessments.length ? <div className="tp-eval-list">{teacher.traitAssessments.map((evaluation) => <article key={evaluation.id}><Avatar name={evaluation.student.profile.full_name} src={evaluation.student.profile.avatar_url} size={42} /><div><strong>{evaluation.student.profile.full_name}</strong><span>{evaluation.module.title} · {evaluation.module.stage.title}</span><small>{evaluation.trait_scores.map((score) => `${lang === "sq" ? score.trait.name_sq || score.trait.name : score.trait.name}: ${score.score}`).join(" · ")}</small></div><time>{date(evaluation.updated_at, lang)}</time></article>)}</div> : <Empty>{T.noData}</Empty>}</section>
  </div>;
}

function ContentList({ title, items, lang, T }: { title: string; items: Array<{ id: string; title: string; className: string; status: string; date: string; facts: string[] }>; lang: Lang; T: typeof COPY[Lang] }) {
  return <div className="tp-content-list"><h3>{title}<b>{items.length}</b></h3>{items.length ? items.map((item) => <article key={item.id}><div><strong>{item.title}</strong><span>{item.className}</span></div><Status value={item.status} lang={lang} /><div className="tp-content-facts">{item.facts.map((fact) => <small key={fact}>{fact}</small>)}</div><time>{T.updated}: {date(item.date, lang)}</time></article>) : <Empty>{T.noData}</Empty>}</div>;
}

function CommunityView({ teacher, lang, T }: { teacher: TeacherProfile; lang: Lang; T: typeof COPY[Lang] }) {
  const blocks = [
    { title: T.publicPosts, icon: <MessageCircleMore />, items: teacher.profile.posts.map((item) => ({ id: item.id, text: item.content || "—", meta: `${item._count.reactions} ${T.reactions} · ${item._count.replies} ${T.replies}`, at: item.created_at })) },
    { title: T.groupMessages, icon: <Users />, items: teacher.profile.teacherGroupAnnouncements.map((item) => ({ id: item.id, text: item.content, meta: item.group.name, at: item.created_at })) },
    { title: T.classAnnouncements, icon: <Network />, items: teacher.announcements.map((item) => ({ id: item.id, text: item.content, meta: item.class.name, at: item.created_at })) },
    { title: T.workshopMessages, icon: <Sparkles />, items: teacher.profile.workshopMessages.map((item) => ({ id: item.id, text: item.body, meta: item.workshop.title, at: item.created_at })) },
  ];
  return <div className="tp-stack"><section className="tp-panel"><PanelHead icon={<MessageCircleMore />} title={T.communityTitle} subtitle={T.communitySub} /><div className="tp-community-metrics">{blocks.map((block) => <Metric key={block.title} icon={block.icon} value={block.items.length} label={block.title} />)}</div></section><div className="tp-community-grid">{blocks.map((block) => <section className="tp-panel tp-feed" key={block.title}><PanelHead icon={block.icon} title={block.title} />{block.items.length ? block.items.map((item) => <article key={item.id}><p>{item.text}</p><footer><span>{item.meta}</span><time>{date(item.at, lang, true)}</time></footer></article>) : <Empty>{T.noData}</Empty>}</section>)}</div></div>;
}

function SpectrumView({ teacher, models, active, selected, setSelected, lang, T }: { teacher: TeacherProfile; models: Array<{ id: string; assessment: TeacherProfile["ratings_received"][number]["assessment"]; ratings: TeacherProfile["ratings_received"]; average: number[] }>; active: typeof models[number] | undefined; selected: string; setSelected: (value: string) => void; lang: Lang; T: typeof COPY[Lang] }) {
  return <div className="tp-stack"><section className="tp-panel"><PanelHead icon={<BrainCircuit />} title={T.spectrumTitle} subtitle={T.spectrumSub} />{models.length ? <div className="tp-model-pills" aria-label={T.selectModel}>{models.map((model) => <button key={model.id} className={selected === model.id ? "active" : ""} onClick={() => setSelected(model.id)}><span>{model.assessment.title}</span><small>{T.receivedFrom(model.ratings.length)}</small></button>)}</div> : <Empty>{T.noSpectrum}</Empty>}</section>{active && <section className="tp-panel tp-spectrum-full"><div className="tp-spectrum-heading"><div><Status value={active.assessment.status} lang={lang} /><h2>{active.assessment.title}</h2><p>{active.assessment.target_groups.map((group) => group.group.name).join(lang === "ar" ? "، " : ", ")}</p></div><strong>{active.ratings.length}<small>{T.ratings}</small></strong></div><TraitSpectrumPanel traits={canonicalizeDefaultTraits(active.assessment.traits).map((trait, index) => ({ label: lang === "ar" ? trait.label_ar : trait.label_sq, color: trait.color, pct: active.average[index] ?? 0 }))} seed={seedFromString(`${teacher.id}:${active.id}:full`)} lang={lang === "ar" ? "ar" : "sq"} /></section>}{active && <div className="tp-spectrum-people"><section className="tp-panel"><PanelHead icon={<Users />} title={T.raters} />{active.ratings.map((rating) => <article key={rating.rater_teacher_id}><Avatar name={rating.rater.profile.full_name} src={rating.rater.profile.avatar_url} size={38} /><div><strong>{rating.rater.profile.full_name}</strong><small>{T.lastUpdate}: {date(rating.updated_at, lang)}</small></div></article>)}</section><section className="tp-panel"><PanelHead icon={<UserRoundCheck />} title={T.ratedOthers} />{teacher.ratings_given.length ? teacher.ratings_given.map((rating) => <article key={`${rating.assessment_id}-${rating.target_teacher_id}`}><Avatar name={rating.target.profile.full_name} src={rating.target.profile.avatar_url} size={38} /><div><strong>{rating.target.profile.full_name}</strong><small>{rating.assessment.title} · {date(rating.updated_at, lang)}</small></div></article>) : <Empty>{T.noData}</Empty>}</section></div>}</div>;
}

function GamesView({ teacher, lang, T }: { teacher: TeacherProfile; lang: Lang; T: typeof COPY[Lang] }) {
  const mini = teacher.profile.miniGameSubmissions;
  const grouped = Object.entries(mini.reduce<Record<string, typeof mini>>((acc, item) => { (acc[item.game] ??= []).push(item); return acc; }, {}));
  const bestCard = teacher.profile.rowadGameSubmissions.reduce((best, item) => Math.max(best, item.score), 0);
  return <div className="tp-stack"><section className="tp-panel"><PanelHead icon={<Gamepad2 />} title={T.gameTitle} subtitle={T.gameSub} /><div className="tp-game-hero"><Metric icon={<Trophy />} value={bestCard} label={T.bestScore} /><Metric icon={<Gamepad2 />} value={gameCountOf(teacher)} label={T.plays} /><Metric icon={<CheckCircle2 />} value={mini.filter((item) => item.won).length} label={T.wins} /><Metric icon={<Clock3 />} value={teacher.profile.rowadGameDrafts.length} label={T.inProgress} /></div></section><section className="tp-panel"><PanelHead icon={<Award />} title={T.cardGame} />{teacher.profile.rowadGameSubmissions.length ? <div className="tp-game-history">{teacher.profile.rowadGameSubmissions.map((item) => <article key={item.id}><span><Trophy size={18} /></span><div><strong>{item.stage}</strong><small>{date(item.created_at, lang, true)}</small></div><b>{item.score}<em>/ {item.total}</em></b></article>)}</div> : <Empty>{T.noData}</Empty>}</section><section className="tp-panel"><PanelHead icon={<WandSparkles />} title={T.practiceGames} />{grouped.length ? <div className="tp-game-grid">{grouped.map(([game, items]) => <article key={game}><span><Gamepad2 /></span><h3>{GAME_LABELS[game]?.[lang] ?? game}</h3><div><strong>{items.length}<small>{T.plays}</small></strong><strong>{Math.max(...items.map((item) => item.score))}<small>{T.bestScore}</small></strong><strong>{items.filter((item) => item.won).length}<small>{T.wins}</small></strong></div></article>)}</div> : <Empty>{T.noData}</Empty>}</section></div>;
}
function gameCountOf(teacher: TeacherProfile) { return teacher.profile.rowadGameSubmissions.length + teacher.profile.miniGameSubmissions.length; }

function PersonalView({ teacher, lang, T }: { teacher: TeacherProfile; lang: Lang; T: typeof COPY[Lang] }) {
  const app = teacher.application;
  const rawEntries = app ? [
    [T.currentRole, codeLabel(app.current_role, lang, "role")], [T.qualification, codeLabel(app.qualification, lang, "qualification")], [T.specialization, app.specialization], [T.institution, app.graduation_institution],
    [T.experience, codeLabel(app.years_of_experience, lang, "experience")], [T.location, `${app.city}, ${app.country}`], [T.age, String(app.age)], [T.phone, app.phone], [T.email, app.email], [T.languages, languagesText(app.languages, lang)],
  ] : [];
  return <div className="tp-profile-layout"><section className="tp-panel"><PanelHead icon={<CircleUserRound />} title={T.professionalDetails} />{rawEntries.length ? <dl className="tp-definition-list">{rawEntries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <Empty>{T.noData}</Empty>}</section><div className="tp-stack"><section className="tp-panel"><PanelHead icon={<Users />} title={T.groups} />{teacher.group_memberships.length ? <div className="tp-group-list">{teacher.group_memberships.map((membership) => <article key={membership.group.id}><span><Users size={18} /></span><div><strong>{membership.group.name}</strong><p>{membership.group.description || "—"}</p><small>{membership.group._count.members} {T.students} · {membership.group._count.assessments} {T.ratings}</small></div></article>)}</div> : <Empty>{T.noData}</Empty>}</section><section className="tp-panel"><PanelHead icon={<Sparkles />} title={T.workshops} />{teacher.workshop_enrollments.length ? <div className="tp-workshops">{teacher.workshop_enrollments.map((entry) => { const attendance = teacher.workshop_attendance.filter((item) => item.workshop.id === entry.workshop.id).length; const done = teacher.workshop_completions.some((item) => item.workshop.id === entry.workshop.id); return <article key={entry.id}><div><strong>{entry.workshop.title}</strong><span>{attendance} {T.attendanceDays}</span></div><span className={done ? "done" : ""}>{done ? T.completed : T.enrolled}</span></article>; })}</div> : <Empty>{T.noData}</Empty>}</section>{teacher.future_qualification_vote && <section className="tp-panel"><PanelHead icon={<Target />} title={T.futureVote} /><dl className="tp-definition-list compact">{Object.entries(teacher.future_qualification_vote).filter(([key]) => !["id","teacher_id","school_id","submitted_at"].includes(key)).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{String(value ?? "—")}</dd></div>)}</dl></section>}</div></div>;
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
.tp-shell,.tp-loading{font-family:'Cairo',sans-serif}.tp-shell{max-width:1360px;margin:0 auto;padding:10px 0 70px;color:#32101A}.tp-loading{min-height:60vh;display:grid;place-items:center}.tp-back{display:inline-flex;align-items:center;gap:7px;margin-bottom:14px;color:#6B1E2D;font-size:12px;font-weight:900;text-decoration:none}.tp-shell[dir="rtl"] .tp-back svg{transform:scaleX(-1)}.tp-error{min-height:280px;display:grid;place-items:center;border:1px dashed rgba(107,30,45,.3);border-radius:24px;background:#FFFBF5;color:#6B1E2D;font-weight:900}
.tp-hero{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:28px;min-height:248px;padding:34px;border-radius:32px;background:radial-gradient(circle at 10% 0,rgba(217,201,176,.19),transparent 33%),linear-gradient(135deg,#32101A,#6B1E2D 68%,#4A0E1C);box-shadow:0 28px 62px rgba(74,14,28,.22)}.tp-hero:after{content:"";position:absolute;inset:10px;z-index:-1;border:1px solid rgba(217,201,176,.16);border-radius:24px}.tp-mandala{position:absolute;inset-inline-end:-70px;inset-block-end:-120px;z-index:-1;animation:tp-spin 42s linear infinite}.tp-orbit{position:absolute;border:1px solid rgba(217,201,176,.12);border-radius:50%;pointer-events:none}.tp-orbit-one{width:230px;height:230px;inset-inline-start:-100px;top:-90px}.tp-orbit-two{width:140px;height:140px;inset-inline-start:-38px;top:-45px}.tp-hero-main{display:flex;align-items:center;gap:22px;min-width:0}.tp-avatar-wrap{position:relative;flex:none;width:108px;height:108px;display:grid;place-items:center;border:1px solid rgba(217,201,176,.26);border-radius:30px;background:rgba(255,251,245,.08);box-shadow:inset 0 1px rgba(255,255,255,.14)}.tp-avatar-wrap>i{position:absolute;inset-inline-end:5px;inset-block-end:6px;width:18px;height:18px;border:4px solid #6B1E2D;border-radius:50%;background:#8F765B}.tp-avatar-wrap>i.active{background:#1B5E20}.tp-avatar-img{object-fit:cover;border-radius:24px}.tp-avatar-fallback{display:grid;place-items:center;border-radius:22px;background:linear-gradient(145deg,#4A0E1C,#1A1A1A);color:#D9C9B0;font-weight:900}.tp-eyebrow{display:flex;align-items:center;gap:7px;margin-bottom:7px;color:#D9C9B0;font-size:11px;font-weight:900;letter-spacing:.07em}.tp-hero-copy h1{margin:0;color:#FFFBF5;font-size:34px;line-height:1.25}.tp-hero-meta,.tp-contact-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:10px}.tp-hero-meta>span,.tp-contact-row a{display:inline-flex;align-items:center;gap:6px;color:rgba(255,251,245,.74);font-size:11px;font-weight:800;text-decoration:none}.tp-hero-meta>span:first-child{padding:5px 9px;border:1px solid rgba(217,201,176,.15);border-radius:999px;background:rgba(255,251,245,.07)}.tp-hero-meta i{width:7px;height:7px;border-radius:50%;background:#8F765B}.tp-hero-meta .is-active i{background:#1B5E20;box-shadow:0 0 0 4px rgba(27,94,32,.18)}.tp-contact-row a{padding:7px 10px;border-radius:10px;background:rgba(255,251,245,.06);transition:.15s}.tp-contact-row a:hover{background:rgba(255,251,245,.12);color:#FFFBF5}.tp-hero-side{position:relative;z-index:1;min-width:190px;padding:17px;border:1px solid rgba(217,201,176,.17);border-radius:18px;background:rgba(26,26,26,.16);backdrop-filter:blur(9px)}.tp-hero-side>span{display:block;color:rgba(255,251,245,.58);font-size:10px;font-weight:800}.tp-hero-side>strong{display:block;margin-top:3px;color:#FFFBF5;font-size:13px}.tp-hero-score{display:flex;align-items:center;gap:7px;margin-top:12px;padding-top:11px;border-top:1px solid rgba(217,201,176,.14);color:#D9C9B0}.tp-hero-score b{font-size:9px;letter-spacing:.04em}
.tp-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:14px 0}.tp-metric{display:flex;align-items:center;gap:10px;min-width:0;min-height:82px;padding:13px;border:1px solid rgba(107,30,45,.12);border-radius:17px;background:#FFFBF5;box-shadow:0 10px 26px rgba(107,30,45,.045);transition:.18s}.tp-metric:hover{transform:translateY(-2px);border-color:rgba(107,30,45,.32);box-shadow:0 15px 32px rgba(107,30,45,.08)}.tp-metric>span{width:36px;height:36px;flex:none;display:grid;place-items:center;border-radius:12px;background:#F7F3EB;color:#6B1E2D}.tp-metric svg{width:17px}.tp-metric div{min-width:0}.tp-metric strong{display:block;color:#32101A;font-size:20px;line-height:1}.tp-metric small{display:block;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#796A62;font-size:9px;font-weight:800}
.tp-tabs{position:sticky;top:8px;z-index:20;display:flex;gap:6px;overflow-x:auto;margin:0 0 16px;padding:7px;border:1px solid rgba(107,30,45,.12);border-radius:17px;background:rgba(255,251,245,.92);box-shadow:0 12px 30px rgba(107,30,45,.08);backdrop-filter:blur(14px);scrollbar-width:none}.tp-tabs button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:43px;flex:1;padding:0 13px;border:0;border-radius:12px;background:transparent;color:#655B53;font:800 10.5px 'Cairo',sans-serif;white-space:nowrap;cursor:pointer;transition:.16s}.tp-tabs button:hover{background:#F7F3EB;color:#6B1E2D}.tp-tabs button.active{background:#6B1E2D;color:#FFFBF5;box-shadow:0 8px 18px rgba(107,30,45,.18)}.tp-view{animation:tp-in .32s ease both}.tp-stack{display:grid;gap:14px}.tp-panel{overflow:hidden;border:1px solid rgba(107,30,45,.12);border-radius:24px;background:#FFFBF5;padding:20px;box-shadow:0 14px 34px rgba(107,30,45,.055)}.tp-panel-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:16px}.tp-panel-head>span{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:12px;background:#F7F3EB;color:#6B1E2D}.tp-panel-head svg{width:18px}.tp-panel-head h2{margin:0;color:#32101A;font-size:16px}.tp-panel-head p{margin:3px 0 0;color:#796A62;font-size:10.5px;line-height:1.65;font-weight:700}.tp-empty{min-height:130px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1px dashed rgba(107,30,45,.22);border-radius:16px;background:#F7F3EB;color:#8F765B;text-align:center;font-size:11px;font-weight:800}
.tp-overview-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:14px;margin-bottom:14px}.tp-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.tp-info{display:flex;align-items:center;gap:10px;min-width:0;padding:11px;border-radius:14px;background:#F7F3EB}.tp-info>span{width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:9px;background:#FFFBF5;color:#8F765B}.tp-info svg{width:14px}.tp-info small{display:block;color:#8F765B;font-size:8.5px;font-weight:900}.tp-info strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#32101A;font-size:11px}.tp-inline-link,.tp-spectrum-copy button{display:inline-flex;align-items:center;gap:5px;margin-top:14px;border:0;background:transparent;color:#6B1E2D;font:900 10px 'Cairo',sans-serif;cursor:pointer}.tp-shell[dir="rtl"] .tp-inline-link svg,.tp-shell[dir="rtl"] .tp-spectrum-copy button svg{transform:scaleX(-1)}.tp-timeline{display:grid}.tp-timeline article{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 0}.tp-timeline article:not(:last-child):after{content:"";position:absolute;inset-inline-start:16px;top:39px;bottom:-5px;width:1px;background:rgba(107,30,45,.12)}.tp-timeline article>span{width:34px;height:34px;z-index:1;display:grid;place-items:center;border-radius:11px;background:#F7F3EB;color:#6B1E2D}.tp-timeline strong,.tp-timeline small{display:block}.tp-timeline strong{font-size:10.5px}.tp-timeline small,.tp-timeline time{color:#8F765B;font-size:8.5px;font-weight:700}.tp-feature-spectrum{padding:22px}.tp-spectrum-overview{display:grid;grid-template-columns:minmax(220px,.62fr) minmax(480px,1.38fr);gap:20px;align-items:center}.tp-spectrum-copy{padding:14px}.tp-spectrum-copy>span{color:#8F765B;font-size:9px;font-weight:900;letter-spacing:.08em}.tp-spectrum-copy h2{margin:6px 0;color:#32101A;font-size:22px}.tp-spectrum-copy p{margin:0;color:#796A62;font-size:11px}
.tp-class-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}.tp-class-card{padding:15px;border:1px solid rgba(107,30,45,.12);border-radius:18px;background:linear-gradient(145deg,#FFFBF5,#F7F3EB);transition:.17s}.tp-class-card:hover{transform:translateY(-2px);border-color:rgba(107,30,45,.34)}.tp-class-card header{display:flex;align-items:center;gap:10px}.tp-class-card header>span{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#6B1E2D;color:#FFFBF5}.tp-class-card h3{margin:0;font-size:13px}.tp-class-card header small{color:#8F765B;font-size:9px;font-weight:800}.tp-class-stats{display:flex;gap:5px;flex-wrap:wrap;margin:12px 0}.tp-class-stats span{padding:4px 7px;border-radius:999px;background:#FFFBF5;color:#796A62;font-size:8.5px;font-weight:800}.tp-avatar-stack{display:flex;align-items:center;min-height:36px}.tp-avatar-stack>span{display:flex;margin-inline-end:-8px}.tp-avatar-stack .tp-avatar-img,.tp-avatar-stack .tp-avatar-fallback{border:2px solid #FFFBF5;border-radius:50%;font-size:8px}.tp-avatar-stack>b{display:grid;place-items:center;width:34px;height:34px;border:2px solid #FFFBF5;border-radius:50%;background:#D9C9B0;color:#6B1E2D;font-size:8px}.tp-list-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px}.tp-list-toolbar label{display:flex;align-items:center;gap:7px;min-width:240px;padding:0 11px;border:1px solid rgba(107,30,45,.16);border-radius:11px;background:#F7F3EB;color:#6B1E2D}.tp-list-toolbar input{width:100%;height:39px;border:0;outline:0;background:transparent;font:inherit;font-size:10px}.tp-people-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}.tp-people-grid article{display:flex;align-items:center;gap:10px;padding:11px;border:1px solid rgba(107,30,45,.1);border-radius:14px;background:#F7F3EB}.tp-people-grid article>div{min-width:0}.tp-people-grid strong,.tp-people-grid span,.tp-people-grid small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tp-people-grid strong{font-size:10.5px}.tp-people-grid span{color:#6B1E2D;font-size:9px;font-weight:800}.tp-people-grid small{color:#8F765B;font-size:8.5px}.tp-content-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.tp-content-list>h3{display:flex;align-items:center;justify-content:space-between;margin:0 0 9px;font-size:12px}.tp-content-list>h3 b{display:grid;place-items:center;min-width:25px;height:25px;border-radius:8px;background:#F7F3EB;color:#6B1E2D;font-size:9px}.tp-content-list>article{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 10px;padding:12px;border:1px solid rgba(107,30,45,.1);border-radius:14px;background:#F7F3EB}.tp-content-list>article+article{margin-top:7px}.tp-content-list strong,.tp-content-list span{display:block}.tp-content-list strong{font-size:10.5px}.tp-content-list span{color:#8F765B;font-size:8.5px;font-weight:700}.tp-status{align-self:start;padding:4px 7px;border-radius:999px;background:#D9C9B0;color:#655B53;font-size:7.5px;font-weight:900}.tp-status-approved,.tp-status-open{background:rgba(27,94,32,.1);color:#1B5E20}.tp-status-rejected{background:rgba(107,30,45,.1);color:#6B1E2D}.tp-content-facts{grid-column:1/-1;display:flex;gap:5px;flex-wrap:wrap}.tp-content-facts small{padding:3px 6px;border-radius:999px;background:#FFFBF5;color:#796A62;font-size:7.5px;font-weight:800}.tp-content-list time{grid-column:1/-1;color:#8F765B;font-size:8px}.tp-eval-list{display:grid;gap:7px}.tp-eval-list article,.tp-spectrum-people article{display:flex;align-items:center;gap:10px;padding:10px;border-radius:13px;background:#F7F3EB}.tp-eval-list article>div,.tp-spectrum-people article>div{min-width:0;flex:1}.tp-eval-list strong,.tp-eval-list span,.tp-eval-list small,.tp-spectrum-people strong,.tp-spectrum-people small{display:block}.tp-eval-list strong,.tp-spectrum-people strong{font-size:10.5px}.tp-eval-list span{color:#6B1E2D;font-size:9px;font-weight:800}.tp-eval-list small,.tp-spectrum-people small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#796A62;font-size:8.5px}.tp-eval-list time{color:#8F765B;font-size:8px}
.tp-community-metrics,.tp-game-hero{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.tp-community-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.tp-feed article{padding:13px;border:1px solid rgba(107,30,45,.1);border-radius:15px;background:#F7F3EB}.tp-feed article+article{margin-top:8px}.tp-feed p{margin:0;color:#32101A;font-size:10.5px;line-height:1.8;white-space:pre-wrap}.tp-feed footer{display:flex;justify-content:space-between;gap:8px;margin-top:9px;padding-top:7px;border-top:1px dashed rgba(107,30,45,.14);color:#8F765B;font-size:8px;font-weight:800}
.tp-model-pills{display:flex;gap:7px;overflow-x:auto;padding-bottom:3px}.tp-model-pills button{min-width:210px;padding:11px;border:1px solid rgba(107,30,45,.14);border-radius:13px;background:#F7F3EB;color:#32101A;text-align:start;font:800 10px 'Cairo',sans-serif;cursor:pointer}.tp-model-pills button span,.tp-model-pills button small{display:block}.tp-model-pills button small{margin-top:3px;color:#8F765B;font-size:8px}.tp-model-pills button.active{border-color:#6B1E2D;background:#6B1E2D;color:#FFFBF5}.tp-model-pills button.active small{color:#D9C9B0}.tp-spectrum-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:14px}.tp-spectrum-heading h2{margin:8px 0 3px;font-size:20px}.tp-spectrum-heading p{margin:0;color:#796A62;font-size:10px}.tp-spectrum-heading>strong{display:flex;flex-direction:column;align-items:center;min-width:72px;padding:10px;border-radius:14px;background:#F7F3EB;color:#6B1E2D;font-size:22px}.tp-spectrum-heading>strong small{color:#8F765B;font-size:7px}.tp-spectrum-people{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.tp-spectrum-people section{display:grid;align-content:start;gap:7px}
.tp-game-history{display:grid;gap:7px}.tp-game-history article{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border-radius:14px;background:#F7F3EB}.tp-game-history article>span{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:#6B1E2D;color:#D9C9B0}.tp-game-history strong,.tp-game-history small{display:block}.tp-game-history strong{font-size:10px}.tp-game-history small{color:#8F765B;font-size:8px}.tp-game-history b{color:#6B1E2D;font-size:18px}.tp-game-history em{color:#8F765B;font-size:8px;font-style:normal}.tp-game-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.tp-game-grid article{padding:15px;border:1px solid rgba(107,30,45,.1);border-radius:17px;background:linear-gradient(145deg,#FFFBF5,#F7F3EB)}.tp-game-grid article>span{width:40px;height:40px;display:grid;place-items:center;border-radius:13px;background:#6B1E2D;color:#D9C9B0}.tp-game-grid h3{margin:10px 0;font-size:12px}.tp-game-grid article>div{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.tp-game-grid strong{display:flex;flex-direction:column;color:#32101A;font-size:16px}.tp-game-grid small{color:#8F765B;font-size:7px}
.tp-profile-layout{display:grid;grid-template-columns:1.1fr .9fr;gap:14px}.tp-definition-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0}.tp-definition-list>div{padding:11px;border-radius:13px;background:#F7F3EB}.tp-definition-list dt{color:#8F765B;font-size:8.5px;font-weight:900;text-transform:capitalize}.tp-definition-list dd{margin:4px 0 0;color:#32101A;font-size:11px;font-weight:800;overflow-wrap:anywhere}.tp-definition-list.compact{grid-template-columns:1fr}.tp-group-list,.tp-workshops{display:grid;gap:7px}.tp-group-list article{display:flex;align-items:flex-start;gap:10px;padding:12px;border-radius:14px;background:#F7F3EB}.tp-group-list article>span{width:35px;height:35px;flex:none;display:grid;place-items:center;border-radius:11px;background:#6B1E2D;color:#D9C9B0}.tp-group-list strong,.tp-group-list small{display:block;font-size:10px}.tp-group-list p{margin:2px 0;color:#796A62;font-size:8.5px}.tp-group-list small{color:#8F765B;font-size:8px}.tp-workshops article{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px;border-radius:13px;background:#F7F3EB}.tp-workshops strong,.tp-workshops span{display:block}.tp-workshops strong{font-size:10px}.tp-workshops div span{color:#8F765B;font-size:8px}.tp-workshops article>span{padding:4px 7px;border-radius:999px;background:#D9C9B0;color:#655B53;font-size:8px;font-weight:900}.tp-workshops article>span.done{background:rgba(27,94,32,.1);color:#1B5E20}
@keyframes tp-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes tp-spin{to{transform:rotate(360deg)}}
@media(max-width:1100px){.tp-metrics{grid-template-columns:repeat(3,1fr)}.tp-spectrum-overview{grid-template-columns:1fr}.tp-community-metrics,.tp-game-hero{grid-template-columns:repeat(2,1fr)}}
@media(max-width:820px){.tp-hero{align-items:flex-start;flex-direction:column}.tp-hero-side{width:100%}.tp-overview-grid,.tp-community-grid,.tp-profile-layout,.tp-spectrum-people,.tp-content-columns{grid-template-columns:1fr}.tp-game-grid{grid-template-columns:repeat(2,1fr)}.tp-tabs button{flex:none}.tp-tabs span{display:none}.tp-tabs button{width:44px;padding:0}.tp-tabs button.active{width:auto;padding:0 14px}.tp-tabs button.active span{display:inline}.tp-spectrum-overview{grid-template-columns:1fr}}
@media(max-width:560px){.tp-shell{padding-inline:2px}.tp-hero{min-height:auto;padding:24px 18px;border-radius:24px}.tp-hero-main{align-items:flex-start;flex-direction:column}.tp-avatar-wrap{width:82px;height:82px}.tp-avatar-wrap .tp-avatar-img,.tp-avatar-wrap .tp-avatar-fallback{width:70px!important;height:70px!important}.tp-hero-copy h1{font-size:25px}.tp-metrics{grid-template-columns:repeat(2,1fr)}.tp-metric{min-height:70px;padding:9px}.tp-info-grid,.tp-definition-list{grid-template-columns:1fr}.tp-panel{padding:14px;border-radius:19px}.tp-list-toolbar{align-items:stretch;flex-direction:column}.tp-list-toolbar label{min-width:0}.tp-community-metrics,.tp-game-hero,.tp-game-grid{grid-template-columns:1fr}.tp-feed footer{flex-direction:column}.tp-spectrum-heading{flex-direction:column}.tp-model-pills button{min-width:180px}}
@media(prefers-reduced-motion:reduce){.tp-view,.tp-mandala{animation:none!important}.tp-metric,.tp-class-card{transition:none}}
`;
