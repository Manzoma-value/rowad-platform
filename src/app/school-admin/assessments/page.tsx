"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLang } from "@/lib/language-context";
import { useViewOnly } from "@/lib/view-only-context";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import IdentityStar from "@/components/IdentityStar";
import IdentityMandala from "@/components/IdentityMandala";
import TraitSpectrumPanel from "@/components/TraitSpectrumPanel";
import { seedFromString, blendCmykWeighted } from "@/lib/trait-spectrum";
import {
  ASSESS_UI, derive, averageTuples, pickAssessLang, defaultTraitDrafts, canonicalizeDefaultTraits, DEFAULT_TRAITS,
  type ScoresTuple, type TraitDraft,
} from "@/lib/rowad-assessment";
import {
  SlidersHorizontal, X, Search, Plus, Pencil, Download, Lock, Unlock,
  Trash2, Users2, ClipboardList, Target, Layers3, Sparkles, CheckSquare,
  Globe2, History, ChevronLeft, ChevronRight, Activity, ChevronDown, Eye,
  ShieldCheck, Mail, KeyRound, CalendarClock, BarChart3, UserCheck,
} from "lucide-react";

// ── Types ──
type GroupRef = { id: string; name: string; _count?: { members: number } };
type AssessmentRow = {
  id: string;
  title: string;
  status: "OPEN" | "CLOSED";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  groups: GroupRef[];
  _count: { ratings: number; traits: number };
};

type Trait = {
  id: string; position: number; label_ar: string; label_sq: string;
  statement_ar: string; statement_sq: string; color: string;
  kind: "TARGET" | "EARLY_OBSERVATION";
  objective_ar: string | null; objective_sq: string | null;
};
type Member = { teacher_id: string; group_ids: string[]; profile: { id: string; full_name: string; email: string | null } };
type RatingRow = { rater_teacher_id: string; target_teacher_id: string; scores: ScoresTuple; updated_at: string };
type SpectrumAggregate = {
  group_id: string | null; group_name: string; member_count: number;
  rating_count: number; expected_count: number; completion_pct: number;
  participating_raters: number; average: ScoresTuple | null;
};
type RatingRevision = {
  id: string; rater_name: string; target_name: string;
  scores: ScoresTuple; replacement_scores: ScoresTuple;
  original_updated_at: string; archived_at: string;
};
type AssessmentFull = {
  id: string;
  title: string;
  status: "OPEN" | "CLOSED";
  groups: GroupRef[];
  traits: Trait[];
  members: Member[];
  ratings: RatingRow[];
  history_count: number;
  group_spectra: SpectrumAggregate[];
  overall_spectrum: SpectrumAggregate;
};

function traitLabel(t: Trait, lang: "ar" | "sq") { return lang === "ar" ? t.label_ar : t.label_sq; }

// Lead with the five official canonical trait colors, followed by extra
// brand choices for fully custom trait sets.
const SWATCHES = [
  "#1A1A1A", "#B33A3A", "#9AA3AC", "#F2EFE6", "#F2B705", "#5C6670", "#A0522D", "#D97706",
  "#6B1E2D", "#B8A082", "#8F765B", "#4A0E1C", "#A55A68", "#1B5E20", "#32101A", "#D9C9B0",
];

const UI = {
  ar: {
    eyebrow: "لوحة النماذج",
    title: "نماذج القياس",
    sub: "تابع خرائط السمات النسبية لكل مجموعات المشرفين — 100 نقطة تصف نقطة البداية ولا تمنح حكم نجاح أو فشل.",
    metricModels: "نموذج",
    metricOpen: "مفتوح",
    metricClosed: "مغلق",
    metricRatings: "تقييم",
    create: "نموذج جديد",
    createHelpTitle: "أنشئ نموذجاً لكل المنصة أو لمجموعة محددة",
    createHelpSub: "اختر النطاق، عرّف السمات وعبارات الملاحظة، ثم افتحه للمشرفين. يجب توزيع 100 نقطة كاملة على السمات.",
    creating: "جارٍ الإنشاء…",
    filters: "تصفية النتائج",
    allGroups: "كل المجموعات",
    allStatuses: "كل الحالات",
    statusLbl: "الحالة",
    groupLbl: "المجموعة",
    search: "ابحث بعنوان النموذج أو اسم المجموعة…",
    resetFilters: "مسح التصفية",
    result: "نتيجة",
    listEmpty: "لا توجد نماذج قياس بعد.",
    noResults: "لا يوجد نموذج مطابق لخيارات التصفية الحالية.",
    statusOPEN: "مفتوح",
    statusCLOSED: "مغلق",
    ratingsCount: "تقييمات",
    dlgCreateTitle: "أنشئ نموذج قياس جديد",
    dlgEditTitle: "تعديل النموذج",
    titleLbl: "عنوان النموذج",
    titlePh: "مثال: نموذج قياس السمات (المرحلة الأولى) — مارس 2026",
    groupsPickLbl: "المجموعات المستهدفة",
    groupsPickSub: "كل مشرف يقيّم أعضاء مجموعته فقط، ثم يجمع النظام أطياف المجموعات في طيف عام واحد. الكل مُحدَّد افتراضياً.",
    scopeLbl: "نطاق التطبيق",
    scopeAll: "كل المجموعات",
    scopeAllSub: "تطبيق النموذج على جميع مجموعات المشرفين الحالية.",
    scopeSpecific: "مجموعات محددة",
    scopeSpecificSub: "اختر مجموعة واحدة أو أكثر لهذا النموذج فقط.",
    setupTitle: "إعداد النموذج",
    traitsCount: (n: number) => `${n} سمات`,
    selectedGroups: (n: number) => `${n} مجموعات محددة`,
    selectAll: "تحديد الكل",
    deselectAll: "إلغاء تحديد الكل",
    traitsLbl: "سمات النموذج",
    traitsSub: "عرّف ما نريد بناءه وعبارة الملاحظة لكل سمة. يبدأ النموذج بسمات الرواد دون تحويل السمات إلى مواد دراسية أو درجات نجاح.",
    traitLabelAr: "الاسم (عربي)",
    traitLabelSq: "الاسم (ألباني)",
    traitStatementAr: "عبارة التقييم (عربي)",
    traitStatementSq: "عبارة التقييم (ألباني)",
    addTrait: "+ إضافة سمة",
    removeTrait: "حذف السمة",
    traitDetails: "تحرير العبارة والمقصد",
    hideTraitDetails: "إغلاق التفاصيل",
    minTraitsWarn: "يلزم سمة واحدة على الأقل.",
    lockedEditNote: "بدأ المشرفون بالتقييم على هذا النموذج، لذا لا يمكن تعديل السمات أو المجموعات المستهدفة بعد الآن — يمكنك تغيير العنوان فقط. أنشئ نموذجاً جديداً لتخصيص مختلف.",
    cancel: "إلغاء",
    submit: "إنشاء",
    save: "حفظ",
    detailEmptyTitle: "اختر نموذجاً لعرض تفاصيله",
    detailEmptySub: "من القائمة على اليسار، اختر أي نموذج قياس لرؤية نتائجه الكاملة.",
    matrixOf: (n: number) => `${n} عضواً`,
    groupsOf: (n: number) => `${n} مجموعة`,
    raterCol: "المقَيِّم",
    targetCol: "الهدف",
    closeBtn: "إغلاق النموذج",
    reopenBtn: "إعادة فتح",
    deleteBtn: "حذف النموذج",
    exportBtn: "تصدير PDF",
    exporting: "جارٍ التصدير…",
    editBtn: "تعديل",
    confirmClose: "إغلاق هذا النموذج سيمنع المشرفين من تعديل تقييماتهم. متابعة؟",
    confirmReopen: "إعادة فتح هذا النموذج تسمح بالتعديل من جديد. متابعة؟",
    confirmDelete: "حذف هذا النموذج نهائيًا مع كل بياناته؟ هذا الإجراء لا يمكن التراجع عنه.",
    matrixHead: "المصفوفة الكاملة",
    matrixSub: "كل خانة تعرض درجات السمات التي أعطاها المقَيِّم للهدف.",
    showMatrix: "عرض المصفوفة الكاملة",
    hideMatrix: "إخفاء المصفوفة",
    aggHead: "نتائج الأعضاء",
    aggSub: "السمة الجوهرية والرابطة لكل عضو، مبنيّة على متوسط كل القراءات التي تلقّاها.",
    collectiveHead: "الأطياف الجماعية",
    collectiveSub: "قراءة مستقلة لكل مجموعة، ثم قراءة عامة موزونة من جميع التقييمات الحالية داخل المجموعتين.",
    overallSpectrum: "الطيف العام لكل المشرفين",
    completion: "اكتمال التقييم",
    submittedOf: (done: number, total: number) => `${done} من ${total} قراءة`,
    noSpectrum: "يظهر الطيف عند وصول أول تقييم مكتمل.",
    targetTrait: "سمة مستهدفة",
    earlyTrait: "مؤشر ملاحظة مبكر",
    objective: "المقصد",
    historyHead: "سجل تغييرات التقييمات",
    historySub: "يحفظ النظام القراءة السابقة تلقائياً عندما تُعدّل بعد مرور 24 ساعة، مع إظهار القراءة البديلة ووقت التغيير.",
    showHistory: "عرض سجل التغييرات",
    hideHistory: "إخفاء سجل التغييرات",
    historyEmpty: "لا توجد تغييرات مؤرشفة بعد.",
    before: "قبل",
    after: "بعد",
    changedBy: "المقيّم",
    changedFor: "المقيّم له",
    changedAt: "وقت التغيير",
    pageOf: (page: number, pages: number) => `صفحة ${page} من ${pages}`,
    teacherSearch: "ابحث عن مشرف داخل هذا النموذج…",
    memberGroupLbl: "مجموعة الأعضاء",
    allMemberGroups: "كل مجموعات الأعضاء",
    memberGroupHelp: "اعرض أعضاء مجموعة واحدة فقط داخل نتائج هذا النموذج.",
    evaluationStatusLbl: "حالة التقييم",
    allEvaluationStatuses: "كل الحالات",
    evaluatedOnly: "من قيّموا فقط",
    notEvaluated: "لم يقيّموا بعد",
    evaluationFilterHelp: "فلترة حسب المشرفين الذين أرسلوا تقييماً واحداً على الأقل في هذا النموذج.",
    memberGroupHelpMulti: "اختر مجموعة واحدة أو أكثر لعرض أعضائها معاً داخل نتائج هذا النموذج.",
    groupBreakdownHead: "حالة التقييم حسب المجموعة",
    groupBreakdownSub: "لكل مجموعة: من أرسل تقييماً على الأقل ومن لم يُرسل بعد — جاهزة للمتابعة المباشرة.",
    groupBreakdownOf: (done: number, total: number) => `${done} من ${total} قيّموا`,
    pendingListHead: "لم يقيّموا بعد",
    pendingListEmpty: "الجميع قيّم في هذه المجموعة 🎉",
    copyPendingNames: "نسخ الأسماء",
    copiedNames: "تم النسخ",
    exportReport: "تصدير التقرير (CSV)",
    exportReportHelp: "يصدّر الأعضاء الظاهرين حالياً بعد تطبيق البحث والمجموعات وحالة التقييم.",
    csvHeaderName: "الاسم",
    csvHeaderEmail: "البريد الإلكتروني",
    csvHeaderGroups: "المجموعات",
    csvHeaderStatus: "حالة التقييم",
    csvHeaderGiven: "تقييمات أرسلها",
    csvHeaderReceived: "تقييمات استلمها",
    detailMembers: "أعضاء النموذج",
    evaluators: "أجروا تقييماً",
    totalRatings: "إجمالي التقييمات",
    givenRatings: (n: number) => `أرسل ${n} تقييم${n === 1 ? "اً" : "ات"}`,
    membersShown: (shown: number, total: number) => `${shown} من ${total} أعضاء`,
    resultFilterAll: "كل السمات",
    perTraitHead: "متوسط كل سمة لكل عضو",
    noRating: "—",
    noMembersMatch: "لا يوجد عضو مطابق للبحث أو التصفية الحالية.",
    showDetails: "عرض التفاصيل",
    hideDetails: "إخفاء التفاصيل",
    receivedRatings: (n: number) => `استلم ${n} تقييم${n === 1 ? "" : "ات"}`,
    distinctRaters: "مقيّمون مختلفون",
    latestRating: "آخر تقييم",
    ratingActivity: "سجل التقييمات المباشر",
    ratingActivitySub: "يوضح كل تقييم: من قيّم، ومن تم تقييمه، ومتى، وكيف وُزّعت النقاط.",
    showAnalytics: "عرض التحليل الكامل",
    hideAnalytics: "إخفاء التحليل الكامل",
    ratingTime: "وقت التقييم",
    scoreDistribution: "توزيع النقاط",
    noEmail: "لا يوجد بريد مسجل",
    deleteDialogTitle: "تأكيد حذف النموذج",
    deleteDialogSub: "إجراء نهائي يمسح النموذج وكل تقييماته وسجل نتائجه. أدخل بريد حسابك وكلمة المرور للمتابعة.",
    emailLbl: "البريد الإلكتروني للحساب",
    emailPh: "اكتب بريدك الإلكتروني",
    passwordLbl: "كلمة المرور",
    passwordPh: "اكتب كلمة المرور",
    deleteVerify: "تحقق واحذف نهائياً",
    deleting: "جارٍ التحقق والحذف…",
    deleteError: "تعذر التحقق من بيانات الحساب أو حذف النموذج.",
    deleteInvalidCredentials: "البريد أو كلمة المرور غير صحيحين. استخدم بيانات حساب تسجيل الدخول الحالي.",
    deleteVerificationUnavailable: "خدمة التحقق غير متاحة حالياً. حاول مرة أخرى لاحقاً.",
    deleteIconHelp: "حذف النموذج — يتطلب تأكيد البريد وكلمة المرور",
    memberHelp: "افتح التفاصيل لمعرفة عدد التقييمات، أسماء المقيّمين، التوقيت، وتوزيع كل قراءة.",
    groupHelp: "هذه قراءة مجمعة. افتح التفاصيل لرؤية نسبة الاكتمال والمقيّمين وكل عمليات التقييم.",
    completionHelp: "نسبة التقييمات المستلمة من إجمالي التقييمات المتوقعة داخل هذا النطاق.",
    radarHelp: "خريطة رادارية تقارن أوزان السمات بصرياً؛ كل محور يمثل سمة.",
  },
  sq: {
    eyebrow: "Paneli i Modeleve",
    title: "Modelet e Matjes",
    sub: "Ndiq hartat relative të tipareve për të gjitha grupet e edukatorëve — 100 pikët përshkruajnë pikën e nisjes dhe nuk japin gjykim suksesi apo dështimi.",
    metricModels: "modele",
    metricOpen: "të hapura",
    metricClosed: "të mbyllura",
    metricRatings: "vlerësime",
    create: "Model i ri",
    createHelpTitle: "Krijo një model për gjithë platformën ose për grupe të caktuara",
    createHelpSub: "Zgjidh shtrirjen, përcakto tiparet dhe pohimet e vëzhgimit, pastaj hape. Çdo edukator duhet të shpërndajë plot 100 pikë.",
    creating: "Po krijohet…",
    filters: "Filtrimi",
    allGroups: "Të gjitha grupet",
    allStatuses: "Të gjitha statuset",
    statusLbl: "Statusi",
    groupLbl: "Grupi",
    search: "Kërko sipas titullit ose grupit…",
    resetFilters: "Pastro filtrat",
    result: "rezultate",
    listEmpty: "Nuk ka modele matjeje ende.",
    noResults: "Asnjë model nuk përputhet me filtrat aktualë.",
    statusOPEN: "I hapur",
    statusCLOSED: "I mbyllur",
    ratingsCount: "vlerësime",
    dlgCreateTitle: "Krijo model matjeje të ri",
    dlgEditTitle: "Modifiko modelin",
    titleLbl: "Titulli",
    titlePh: "Shembull: Modeli i Tipareve (Faza 1) — Mars 2026",
    groupsPickLbl: "Grupet e synuara",
    groupsPickSub: "Çdo edukator vlerëson vetëm anëtarët e grupit të vet; sistemi më pas bashkon spektrat e grupeve në një spektër të përgjithshëm. Të gjitha janë të zgjedhura si parazgjedhje.",
    scopeLbl: "Shtrirja e modelit",
    scopeAll: "Të gjitha grupet",
    scopeAllSub: "Zbatoje modelin në të gjitha grupet aktuale të edukatorëve.",
    scopeSpecific: "Grupe të caktuara",
    scopeSpecificSub: "Zgjidh një ose më shumë grupe vetëm për këtë model.",
    setupTitle: "Konfigurimi i modelit",
    traitsCount: (n: number) => `${n} tipare`,
    selectedGroups: (n: number) => `${n} grupe të zgjedhura`,
    selectAll: "Zgjidh të gjitha",
    deselectAll: "Hiq zgjedhjen",
    traitsLbl: "Tiparet e modelit",
    traitsSub: "Përcakto çfarë duam të ndërtojmë dhe pohimin e vëzhgimit për çdo tipar. Modeli nis me tiparet Rowad pa i kthyer ato në lëndë ose nota suksesi.",
    traitLabelAr: "Emri (arabisht)",
    traitLabelSq: "Emri (shqip)",
    traitStatementAr: "Pohimi (arabisht)",
    traitStatementSq: "Pohimi (shqip)",
    addTrait: "+ Shto tipar",
    removeTrait: "Fshi tiparin",
    traitDetails: "Ndrysho pohimin dhe qëllimin",
    hideTraitDetails: "Mbyll detajet",
    minTraitsWarn: "Duhet të paktën një tipar.",
    lockedEditNote: "Edukatorët kanë filluar të vlerësojnë në këtë model, kështu që tiparet ose grupet e synuara nuk mund të ndryshohen më — mund të ndryshosh vetëm titullin. Krijo një model të ri për personalizim tjetër.",
    cancel: "Anulo",
    submit: "Krijo",
    save: "Ruaj",
    detailEmptyTitle: "Zgjidh një model për të parë detajet",
    detailEmptySub: "Nga lista majtas, zgjidh çdo model matjeje për të parë rezultatet e plota.",
    matrixOf: (n: number) => `${n} anëtarë`,
    groupsOf: (n: number) => `${n} grupe`,
    raterCol: "Vlerësuesi",
    targetCol: "Synimi",
    closeBtn: "Mbyll modelin",
    reopenBtn: "Rihap",
    deleteBtn: "Fshi modelin",
    exportBtn: "Eksporto PDF",
    exporting: "Po eksportohet…",
    editBtn: "Modifiko",
    confirmClose: "Mbyllja do parandalojë edukatorët të redaktojnë. Të vazhdohet?",
    confirmReopen: "Rihapja do lejojë redaktimin sërish. Të vazhdohet?",
    confirmDelete: "Të fshihet ky model përfundimisht me të gjitha të dhënat? Ky veprim nuk mund të zhbëhet.",
    matrixHead: "Matrica e Plotë",
    matrixSub: "Çdo qelizë tregon pikët e tipareve që vlerësuesi i ka dhënë synimit.",
    showMatrix: "Shfaq matricën e plotë",
    hideMatrix: "Fshih matricën",
    aggHead: "Rezultatet e Anëtarëve",
    aggSub: "Tipari thelbësor dhe ndërlidhës për secilin, bazuar në mesataren e leximeve.",
    collectiveHead: "Spektrat e përbashkët",
    collectiveSub: "Një lexim i veçantë për çdo grup dhe një lexim i përgjithshëm i peshuar nga të gjitha vlerësimet aktuale brenda dy grupeve.",
    overallSpectrum: "Spektri i përgjithshëm i edukatorëve",
    completion: "Përfundimi i vlerësimit",
    submittedOf: (done: number, total: number) => `${done} nga ${total} lexime`,
    noSpectrum: "Spektri shfaqet pas vlerësimit të parë të plotë.",
    targetTrait: "Tipar i synuar",
    earlyTrait: "Tregues i hershëm vëzhgimi",
    objective: "Objektivi",
    historyHead: "Historiku i ndryshimeve",
    historySub: "Sistemi ruan automatikisht leximin e mëparshëm kur ndryshohet pas 24 orësh, bashkë me leximin e ri dhe kohën.",
    showHistory: "Shfaq historikun",
    hideHistory: "Fshih historikun",
    historyEmpty: "Ende nuk ka ndryshime të arkivuara.",
    before: "Para",
    after: "Pas",
    changedBy: "Vlerësuesi",
    changedFor: "I vlerësuari",
    changedAt: "Koha e ndryshimit",
    pageOf: (page: number, pages: number) => `Faqja ${page} nga ${pages}`,
    teacherSearch: "Kërko një edukator brenda këtij modeli…",
    memberGroupLbl: "Grupi i anëtarëve",
    allMemberGroups: "Të gjitha grupet e anëtarëve",
    memberGroupHelp: "Shfaq vetëm anëtarët e një grupi në rezultatet e këtij modeli.",
    evaluationStatusLbl: "Gjendja e vlerësimit",
    allEvaluationStatuses: "Të gjitha gjendjet",
    evaluatedOnly: "Ata që kanë vlerësuar",
    notEvaluated: "Nuk kanë vlerësuar ende",
    evaluationFilterHelp: "Filtro sipas edukatorëve që kanë dërguar të paktën një vlerësim në këtë model.",
    memberGroupHelpMulti: "Zgjidh një ose më shumë grupe për të parë anëtarët e tyre së bashku në rezultatet e këtij modeli.",
    groupBreakdownHead: "Gjendja e vlerësimit sipas grupit",
    groupBreakdownSub: "Për çdo grup: kush ka dërguar të paktën një vlerësim dhe kush jo — gati për ndjekje të drejtpërdrejtë.",
    groupBreakdownOf: (done: number, total: number) => `${done} nga ${total} kanë vlerësuar`,
    pendingListHead: "Nuk kanë vlerësuar ende",
    pendingListEmpty: "Të gjithë kanë vlerësuar në këtë grup 🎉",
    copyPendingNames: "Kopjo emrat",
    copiedNames: "U kopjua",
    exportReport: "Eksporto raportin (CSV)",
    exportReportHelp: "Eksporton anëtarët e shfaqur aktualisht pas kërkimit, grupeve dhe gjendjes së vlerësimit.",
    csvHeaderName: "Emri",
    csvHeaderEmail: "Email",
    csvHeaderGroups: "Grupet",
    csvHeaderStatus: "Gjendja e vlerësimit",
    csvHeaderGiven: "Vlerësime të dërguara",
    csvHeaderReceived: "Vlerësime të marra",
    detailMembers: "Anëtarë të modelit",
    evaluators: "Kanë vlerësuar",
    totalRatings: "Vlerësime gjithsej",
    givenRatings: (n: number) => `${n} vlerësim${n === 1 ? "" : "e"} të dërguara`,
    membersShown: (shown: number, total: number) => `${shown} nga ${total} anëtarë`,
    resultFilterAll: "Të gjitha tiparet",
    perTraitHead: "Mesatarja e çdo tipari për secilin anëtar",
    noRating: "—",
    noMembersMatch: "Asnjë anëtar nuk përputhet me kërkimin ose filtrin aktual.",
    showDetails: "Shfaq detajet",
    hideDetails: "Fshih detajet",
    receivedRatings: (n: number) => `${n} vlerësime të marra`,
    distinctRaters: "Vlerësues të ndryshëm",
    latestRating: "Vlerësimi i fundit",
    ratingActivity: "Regjistri i drejtpërdrejtë i vlerësimeve",
    ratingActivitySub: "Tregon çdo vlerësim: kush vlerësoi kë, kur dhe si u shpërndanë pikët.",
    showAnalytics: "Shfaq analizën e plotë",
    hideAnalytics: "Fshih analizën e plotë",
    ratingTime: "Koha e vlerësimit",
    scoreDistribution: "Shpërndarja e pikëve",
    noEmail: "Nuk ka email të regjistruar",
    deleteDialogTitle: "Konfirmo fshirjen e modelit",
    deleteDialogSub: "Ky veprim fshin përgjithmonë modelin, vlerësimet dhe historikun. Shkruaj emailin dhe fjalëkalimin e llogarisë për të vazhduar.",
    emailLbl: "Emaili i llogarisë",
    emailPh: "Shkruaj emailin",
    passwordLbl: "Fjalëkalimi",
    passwordPh: "Shkruaj fjalëkalimin",
    deleteVerify: "Verifiko dhe fshi përgjithmonë",
    deleting: "Po verifikohet dhe fshihet…",
    deleteError: "Nuk mund të verifikohej llogaria ose të fshihej modeli.",
    deleteInvalidCredentials: "Emaili ose fjalëkalimi nuk është i saktë. Përdor të dhënat e llogarisë aktive.",
    deleteVerificationUnavailable: "Shërbimi i verifikimit nuk është i disponueshëm tani. Provo përsëri më vonë.",
    deleteIconHelp: "Fshi modelin — kërkon emailin dhe fjalëkalimin",
    memberHelp: "Hap detajet për numrin e vlerësimeve, emrat e vlerësuesve, kohën dhe shpërndarjen e çdo leximi.",
    groupHelp: "Ky është lexim i përmbledhur. Hap detajet për progresin, vlerësuesit dhe çdo vlerësim.",
    completionHelp: "Përqindja e vlerësimeve të marra nga të gjitha vlerësimet e pritshme në këtë shtrirje.",
    radarHelp: "Harta radar krahason peshat e tipareve; çdo bosht përfaqëson një tipar.",
  },
} as const;

export default function AssessmentsHubPage() {
  const { lang } = useLang();
  const L = pickAssessLang(lang);
  const T = UI[L];
  const AT = ASSESS_UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const viewOnly = useViewOnly();
  const confirm = useConfirm();

  const [list, setList] = useState<AssessmentRow[]>([]);
  const [groups, setGroups] = useState<GroupRef[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AssessmentFull | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── List-level filters ──
  const [query, setQuery] = useState("");
  const [fGroup, setFGroup] = useState("");
  const [fStatus, setFStatus] = useState("");

  // ── Detail-level filters ──
  const [teacherSearch, setTeacherSearch] = useState("");
  // Multiple groups can be selected at once — a member matches when they
  // belong to ANY of the selected groups. Empty = every group.
  const [memberGroupFilters, setMemberGroupFilters] = useState<string[]>([]);
  const [evaluationFilter, setEvaluationFilter] = useState<"all" | "evaluated" | "pending">("all");
  const [traitFilter, setTraitFilter] = useState<number | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<RatingRevision[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);

  const [dlg, setDlg] = useState<{ mode: "create" | "edit" } | null>(null);
  const [form, setForm] = useState<{ title: string; groupIds: string[]; traits: TraitDraft[] }>({ title: "", groupIds: [], traits: [] });
  const [saving, setSaving] = useState(false);
  const [expandedTraitIndex, setExpandedTraitIndex] = useState<number | null>(0);
  const [dlgError, setDlgError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleteDlg, setDeleteDlg] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ email: "", password: "" });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const exportRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await fetch(`/api/school-admin/assessments`, { cache: "no-store" });
      const d = await r.json();
      const assessments = d?.assessments ?? [];
      setList(assessments);
      setGroups(d?.groups ?? []);
      setSelectedId((current) => current ?? assessments[0]?.id ?? null);
    } finally { setLoadingList(false); }
  }, []);

  const loadDetail = useCallback(async (aid: string) => {
    setLoadingDetail(true);
    try {
      const r = await fetch(`/api/school-admin/assessments/${aid}`, { cache: "no-store" });
      if (!r.ok) { setDetail(null); return; }
      const d = await r.json();
      const assessment = d?.assessment as AssessmentFull | undefined;
      setDetail(assessment ? { ...assessment, traits: canonicalizeDefaultTraits(assessment.traits) } : null);
    } finally { setLoadingDetail(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    if (!dlg && !deleteDlg) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [deleteDlg, dlg]);
  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    setTeacherSearch("");
    setMemberGroupFilters([]);
    setEvaluationFilter("all");
    setTraitFilter(null);
    setShowMatrix(false);
    setShowAnalytics(false);
    setShowHistory(false);
    setExpandedCards(new Set());
    setHistoryRows([]);
    setHistoryPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Pre-select a group from ?group= if present (deep link from the group page).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("group");
    if (g) setFGroup(g);
  }, []);

  const filteredList = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list.filter((a) => {
      if (fGroup && !a.groups.some((g) => g.id === fGroup)) return false;
      if (fStatus && a.status !== fStatus) return false;
      if (!needle) return true;
      return `${a.title} ${a.groups.map((g) => g.name).join(" ")}`.toLowerCase().includes(needle);
    });
  }, [list, query, fGroup, fStatus]);

  const totals = useMemo(() => ({
    models: list.length,
    open: list.filter((a) => a.status === "OPEN").length,
    closed: list.filter((a) => a.status === "CLOSED").length,
    ratings: list.reduce((sum, a) => sum + a._count.ratings, 0),
  }), [list]);

  const hasActiveFilters = Boolean(query.trim() || fGroup || fStatus);
  const resetFilters = () => { setQuery(""); setFGroup(""); setFStatus(""); };

  function openCreateDialog() {
    setForm({ title: "", groupIds: groups.map((g) => g.id), traits: defaultTraitDrafts() });
    setExpandedTraitIndex(0);
    setDlgError("");
    setDlg({ mode: "create" });
  }
  function openEditDialog() {
    if (!detail) return;
    setForm({
      title: detail.title,
      groupIds: detail.groups.map((g) => g.id),
      traits: detail.traits.map((t) => ({
        label_ar: t.label_ar, label_sq: t.label_sq,
        statement_ar: t.statement_ar, statement_sq: t.statement_sq,
        color: t.color, kind: t.kind,
        objective_ar: t.objective_ar ?? undefined,
        objective_sq: t.objective_sq ?? undefined,
      })),
    });
    setDlgError("");
    setExpandedTraitIndex(0);
    setDlg({ mode: "edit" });
  }

  const editLocked = dlg?.mode === "edit" && (detail?.ratings.length ?? 0) > 0;

  function toggleGroup(id: string) {
    setForm((f) => ({
      ...f,
      groupIds: f.groupIds.includes(id) ? f.groupIds.filter((g) => g !== id) : [...f.groupIds, id],
    }));
  }
  function updateTrait(idx: number, patch: Partial<TraitDraft>) {
    setForm((f) => ({ ...f, traits: f.traits.map((t, i) => (i === idx ? { ...t, ...patch } : t)) }));
  }
  function addTrait() {
    setExpandedTraitIndex(form.traits.length);
    setForm((f) => ({
      ...f,
      traits: [...f.traits, {
        label_ar: "", label_sq: "", statement_ar: "", statement_sq: "",
        color: SWATCHES[f.traits.length % SWATCHES.length], kind: "TARGET",
        objective_ar: "", objective_sq: "",
      }],
    }));
  }
  function removeTrait(idx: number) {
    setForm((f) => ({ ...f, traits: f.traits.filter((_, i) => i !== idx) }));
  }

  async function submitDialog() {
    if (!form.title.trim()) return;
    if (!editLocked) {
      if (form.groupIds.length === 0) { setDlgError(L === "ar" ? "اختر مجموعة واحدة على الأقل" : "Zgjidh të paktën një grup"); return; }
      const cleanTraits = form.traits.map((t) => ({ ...t, label_ar: t.label_ar.trim(), label_sq: t.label_sq.trim(), statement_ar: t.statement_ar.trim(), statement_sq: t.statement_sq.trim() }));
      if (cleanTraits.length === 0 || cleanTraits.some((t) => !t.label_ar || !t.label_sq || !t.statement_ar || !t.statement_sq)) {
        setDlgError(L === "ar" ? "أكمل اسم وعبارة كل سمة (عربي وألباني) قبل الحفظ" : "Plotëso emrin dhe pohimin e çdo tipari (arabisht dhe shqip) para se të ruash");
        return;
      }
    }
    setDlgError("");
    setSaving(true);
    try {
      if (dlg?.mode === "create") {
        const r = await fetch(`/api/school-admin/assessments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title, group_ids: form.groupIds, traits: form.traits }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setDlgError(d.error ?? ""); return; }
        setDlg(null);
        await loadList();
        setSelectedId(d?.assessment?.id ?? null);
      } else if (dlg?.mode === "edit" && selectedId) {
        const payload: Record<string, unknown> = { title: form.title };
        if (!editLocked) {
          payload.group_ids = form.groupIds;
          payload.traits = form.traits;
        }
        const r = await fetch(`/api/school-admin/assessments/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setDlgError(d.error ?? ""); return; }
        setDlg(null);
        await loadList();
        await loadDetail(selectedId);
      }
    } finally { setSaving(false); }
  }

  async function closeOrReopen(open: boolean) {
    if (!selectedId) return;
    const ok = await confirm({
      title: open ? T.reopenBtn : T.closeBtn,
      message: open ? T.confirmReopen : T.confirmClose,
      confirmText: open ? T.reopenBtn : T.closeBtn,
      cancelText: T.cancel,
      variant: "normal",
    });
    if (!ok) return;
    await fetch(`/api/school-admin/assessments/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: open ? "OPEN" : "CLOSED" }),
    });
    await loadList();
    await loadDetail(selectedId);
  }

  function openDeleteDialog() {
    setDeleteForm({ email: "", password: "" });
    setDeleteError("");
    setDeleteDlg(true);
  }

  async function deleteAssessment() {
    if (!selectedId || !deleteForm.email.trim() || !deleteForm.password) return;
    setDeleteError("");
    setDeleting(true);
    try {
      const response = await fetch(`/api/school-admin/assessments/${selectedId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteForm.email.trim(), password: deleteForm.password }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setDeleteError(
          result?.error === "invalid_credentials"
            ? T.deleteInvalidCredentials
            : result?.error === "verification_unavailable"
              ? T.deleteVerificationUnavailable
              : T.deleteError,
        );
        return;
      }
      setDeleteDlg(false);
      setSelectedId(null);
      setDetail(null);
      await loadList();
    } finally {
      setDeleting(false);
    }
  }

  function toggleCard(key: string) {
    setExpandedCards((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── Aggregation derived from the ratings rows ──
  const aggregation = useMemo(() => {
    if (!detail) return [];
    const byTarget = new Map<string, ScoresTuple[]>();
    const givenByRater = new Map<string, number>();
    for (const r of detail.ratings) {
      const arr = byTarget.get(r.target_teacher_id) ?? [];
      arr.push(r.scores);
      byTarget.set(r.target_teacher_id, arr);
      givenByRater.set(r.rater_teacher_id, (givenByRater.get(r.rater_teacher_id) ?? 0) + 1);
    }
    return detail.members.map((m) => {
      const tuples = byTarget.get(m.teacher_id) ?? [];
      const avg = averageTuples(tuples);
      const d = avg ? derive(avg) : null;
      return { member: m, count: tuples.length, givenCount: givenByRater.get(m.teacher_id) ?? 0, avg, derive: d };
    });
  }, [detail]);

  const visibleAggregation = useMemo(() => {
    const needle = teacherSearch.trim().toLowerCase();
    return aggregation.filter(({ member, derive: d, givenCount }) => {
      if (needle && !member.profile.full_name.toLowerCase().includes(needle)) return false;
      if (memberGroupFilters.length > 0 && !member.group_ids.some((id) => memberGroupFilters.includes(id))) return false;
      if (evaluationFilter === "evaluated" && givenCount === 0) return false;
      if (evaluationFilter === "pending" && givenCount > 0) return false;
      if (traitFilter !== null) {
        if (!d) return false;
        const resultIdx = d.hasCore && d.coreIdx !== null ? d.coreIdx : d.connectingIdx;
        if (resultIdx !== traitFilter) return false;
      }
      return true;
    });
  }, [aggregation, teacherSearch, memberGroupFilters, evaluationFilter, traitFilter]);

  // Per-group breakdown — for the currently selected groups (or every group
  // the model targets, when none are selected), who has sent at least one
  // rating and who hasn't yet. This is what the admin hands to whoever is
  // following up with supervisors before the deadline.
  const groupBreakdown = useMemo(() => {
    if (!detail) return [];
    const groups = memberGroupFilters.length > 0
      ? detail.groups.filter((group) => memberGroupFilters.includes(group.id))
      : detail.groups;
    return groups.map((group) => {
      const members = aggregation.filter((entry) => entry.member.group_ids.includes(group.id));
      const evaluated = members.filter((entry) => entry.givenCount > 0);
      const pending = members.filter((entry) => entry.givenCount === 0);
      return { group, total: members.length, evaluated, pending };
    });
  }, [detail, aggregation, memberGroupFilters]);

  const evaluatedMembers = useMemo(() => aggregation.filter((entry) => entry.givenCount > 0).length, [aggregation]);
  const hasDetailFilters = Boolean(teacherSearch.trim() || memberGroupFilters.length > 0 || evaluationFilter !== "all" || traitFilter !== null);
  const resetDetailFilters = () => {
    setTeacherSearch("");
    setMemberGroupFilters([]);
    setEvaluationFilter("all");
    setTraitFilter(null);
  };

  function toggleGroupFilter(groupId: string) {
    setMemberGroupFilters((current) => (
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
    ));
  }

  async function copyPendingNames(group: GroupRef, pendingNames: string[]) {
    if (pendingNames.length === 0) return;
    try {
      await navigator.clipboard.writeText(pendingNames.join("\n"));
      setCopiedGroupId(group.id);
      window.setTimeout(() => setCopiedGroupId((current) => (current === group.id ? null : current)), 1600);
    } catch {
      // Clipboard access can be blocked (permissions, insecure context) —
      // the button simply stays inert rather than throwing.
    }
  }

  // Exports exactly what's on screen right now — search, selected groups,
  // and evaluation status all apply — so the file always matches the view
  // the admin is looking at when they click it.
  function exportMembersCsv() {
    if (!detail) return;
    const groupNameById = new Map(detail.groups.map((group) => [group.id, group.name]));
    const header = [T.csvHeaderName, T.csvHeaderEmail, T.csvHeaderGroups, T.csvHeaderStatus, T.csvHeaderGiven, T.csvHeaderReceived];
    const rows = visibleAggregation.map(({ member, count, givenCount }) => [
      member.profile.full_name,
      member.profile.email ?? "",
      member.group_ids.map((id) => groupNameById.get(id) ?? "").filter(Boolean).join(" / "),
      givenCount > 0 ? T.evaluatedOnly : T.notEvaluated,
      String(givenCount),
      String(count),
    ]);
    const csv = [header, ...rows]
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${detail.title}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const visibleMemberIds = useMemo(() => new Set(visibleAggregation.map((a) => a.member.teacher_id)), [visibleAggregation]);
  const visibleRatings = useMemo(
    () => (detail?.ratings ?? []).filter((rating) => visibleMemberIds.has(rating.target_teacher_id)),
    [detail, visibleMemberIds],
  );
  const matrixMembers = useMemo(
    () => (detail?.members ?? []).filter((m) => visibleMemberIds.has(m.teacher_id)),
    [detail, visibleMemberIds],
  );

  const ratingFor = (raterId: string, targetId: string) =>
    detail?.ratings.find((r) => r.rater_teacher_id === raterId && r.target_teacher_id === targetId);

  const memberById = useMemo(
    () => new Map((detail?.members ?? []).map((member) => [member.teacher_id, member])),
    [detail],
  );

  const formatRatingDate = useCallback((value: string) => (
    new Intl.DateTimeFormat(L === "ar" ? "ar-SA" : "sq-AL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  ), [L]);

  const loadHistory = useCallback(async (page = 1) => {
    if (!selectedId) return;
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/school-admin/assessments/${selectedId}/history?page=${page}&limit=40`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      setHistoryRows(payload?.revisions ?? []);
      setHistoryPage(payload?.page ?? page);
      setHistoryPages(payload?.pages ?? 1);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedId]);

  async function toggleHistoryPanel() {
    const next = !showHistory;
    setShowHistory(next);
    if (next) await loadHistory(1);
  }

  async function exportPdf() {
    if (!exportRef.current || !detail) return;
    setExporting(true);
    try {
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
      const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: "#FBF7EF", useCORS: true });
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = 190, pageHeight = 277;
      const imgWidth = pageWidth, imgHeight = (canvas.height * imgWidth) / canvas.width;
      const image = canvas.toDataURL("image/png");
      let position = 0;
      doc.addImage(image, "PNG", 10, 10, imgWidth, imgHeight);
      let remaining = imgHeight - pageHeight;
      while (remaining > 0) {
        position += pageHeight;
        doc.addPage();
        doc.addImage(image, "PNG", 10, 10 - position, imgWidth, imgHeight);
        remaining -= pageHeight;
      }
      doc.save(`${detail.title.replace(/[^\p{L}\p{N}\- ]/gu, "").trim() || "assessment"}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="am-page" dir={dir}>
      <section className="am-hero">
        <div className="am-hero-star" aria-hidden="true">
          <IdentityMandala size={270} stroke="#D9C9B0" opacity={0.9} spin spinDuration={130} />
        </div>
        <div>
          <p className="am-eyebrow">
            <IdentityStar size={11} strokeWidth={5} color="#D9C9B0" />
            {T.eyebrow}
          </p>
          <h1>{T.title}</h1>
          <p>{T.sub}</p>
        </div>
        <div className="am-hero-metrics">
          <Metric value={totals.models} label={T.metricModels} />
          <Metric value={totals.open} label={T.metricOpen} />
          <Metric value={totals.closed} label={T.metricClosed} />
          <Metric value={totals.ratings} label={T.metricRatings} />
        </div>
        <div className="am-hero-palette" aria-label={L === "ar" ? "ألوان السمات الثمانية المعتمدة" : "Paleta zyrtare e tetë tipareve"}>
          {DEFAULT_TRAITS.map((trait) => (
            <span
              key={trait.key}
              style={{ background: trait.color }}
              title={`${L === "ar" ? trait.ar : trait.sq} — ${trait.color}`}
            />
          ))}
        </div>
      </section>

      {!viewOnly && (
        <div className="am-createbar">
          <div className="am-createbar-copy">
            <span><Sparkles size={13} />{T.createHelpTitle}</span>
            <p>{T.createHelpSub}</p>
          </div>
          <button className="am-create" onClick={openCreateDialog} data-write="true">
            <Plus size={15} strokeWidth={2.4} />
            {T.create}
          </button>
        </div>
      )}

      {/* ── Filters ── */}
      <section className="am-filters">
        <div className="am-filters-head">
          <SlidersHorizontal size={14} strokeWidth={2} />
          <span>{T.filters}</span>
          <em className="am-filters-count">{filteredList.length} {T.result}</em>
          {hasActiveFilters && (
            <button type="button" className="am-filters-reset" onClick={resetFilters}>
              <X size={12} strokeWidth={2.4} />
              {T.resetFilters}
            </button>
          )}
        </div>
        <div className="am-filters-row">
          <label className="am-filter am-filter-search">
            <span>{T.search}</span>
            <div className="am-search-box">
              <Search size={14} strokeWidth={2} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T.search} />
            </div>
          </label>
          <label className="am-filter">
            <span>{T.groupLbl}</span>
            <select value={fGroup} onChange={(e) => setFGroup(e.target.value)}>
              <option value="">{T.allGroups}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>
          <label className="am-filter">
            <span>{T.statusLbl}</span>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">{T.allStatuses}</option>
              <option value="OPEN">{T.statusOPEN}</option>
              <option value="CLOSED">{T.statusCLOSED}</option>
            </select>
          </label>
        </div>
      </section>

      <div className="am-layout">
        <aside className="am-side">
          {loadingList ? <MandalaLoader compact /> : filteredList.length === 0 ? (
            <div className="am-empty">{hasActiveFilters ? T.noResults : T.listEmpty}</div>
          ) : (
            <ul className="am-list">
              {filteredList.map((a) => (
                <li key={a.id}>
                  <button
                    className={`am-list-item ${selectedId === a.id ? "active" : ""}`}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <div className="am-list-top">
                      <span className={`am-tag am-tag-${a.status}`}>
                        {a.status === "OPEN" ? T.statusOPEN : T.statusCLOSED}
                      </span>
                      <span className="am-list-count">{a._count.ratings} {T.ratingsCount}</span>
                    </div>
                    <div className="am-list-title">{a.title}</div>
                    <div className="am-list-meta">
                      <Users2 size={11} strokeWidth={2} />
                      {a.groups.length <= 1 ? (a.groups[0]?.name ?? "—") : T.groupsOf(a.groups.length)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="am-detail">
          {!selectedId ? (
            <div className="am-detail-empty">
              <ClipboardList size={34} strokeWidth={1.4} />
              <strong>{T.detailEmptyTitle}</strong>
              <span>{T.detailEmptySub}</span>
            </div>
          ) : loadingDetail || !detail ? <MandalaLoader compact /> : (
            <>
              <header className="am-detail-head">
                <div className="am-detail-text">
                  <div className="am-detail-title-row">
                    <h2 className="am-detail-title">{detail.title}</h2>
                    {!viewOnly && (
                      <button className="am-icon-btn" onClick={openEditDialog} title={T.editBtn} data-write="true">
                        <Pencil size={13} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  <span className="am-detail-meta">
                    <Users2 size={12} strokeWidth={2} />
                    {detail.groups.map((g) => g.name).join(" · ")} · {T.matrixOf(detail.members.length)}
                  </span>
                </div>
                <div className="am-detail-actions">
                  <button className="am-btn" onClick={exportPdf} disabled={exporting} data-write="true" title={T.exportBtn}>
                    <Download size={13} strokeWidth={2} />
                    {exporting ? T.exporting : T.exportBtn}
                  </button>
                  {!viewOnly && (
                    <>
                      {detail.status === "OPEN"
                        ? <button className="am-btn" onClick={() => closeOrReopen(false)} data-write="true" title={T.confirmClose}><Lock size={13} strokeWidth={2} />{T.closeBtn}</button>
                        : <button className="am-btn" onClick={() => closeOrReopen(true)} data-write="true" title={T.confirmReopen}><Unlock size={13} strokeWidth={2} />{T.reopenBtn}</button>}
                      <button
                        className="am-delete-icon"
                        onClick={openDeleteDialog}
                        data-write="true"
                        title={T.deleteIconHelp}
                        aria-label={T.deleteIconHelp}
                      >
                        <Trash2 size={16} strokeWidth={2} />
                      </button>
                    </>
                  )}
                </div>
              </header>

              <div className="am-detail-stats" aria-label={T.detailMembers}>
                <div><Users2 size={15} /><strong>{detail.members.length}</strong><span>{T.detailMembers}</span></div>
                <div><UserCheck size={15} /><strong>{evaluatedMembers}</strong><span>{T.evaluators}</span></div>
                <div><Activity size={15} /><strong>{detail.ratings.length}</strong><span>{T.totalRatings}</span></div>
              </div>

              {/* ── Detail-level filters: search, group, evaluation status, and trait ── */}
              <div className="am-detail-filters">
                <div className="am-search-box am-search-box--detail">
                  <Search size={13} strokeWidth={2} />
                  <input value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} placeholder={T.teacherSearch} />
                </div>
                <div className="am-group-chip-filter" title={T.memberGroupHelpMulti} role="group" aria-label={T.memberGroupLbl}>
                  <span><Users2 size={14} strokeWidth={2} />{T.memberGroupLbl}</span>
                  <div className="am-trait-chips">
                    <button
                      className={`am-trait-chip ${memberGroupFilters.length === 0 ? "active" : ""}`}
                      onClick={() => setMemberGroupFilters([])}
                    >
                      {T.allMemberGroups}
                    </button>
                    {detail.groups.map((group) => (
                      <button
                        key={group.id}
                        className={`am-trait-chip ${memberGroupFilters.includes(group.id) ? "active" : ""}`}
                        onClick={() => toggleGroupFilter(group.id)}
                        aria-pressed={memberGroupFilters.includes(group.id)}
                      >
                        {group.name}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="am-member-group-filter am-evaluation-filter" title={T.evaluationFilterHelp}>
                  <UserCheck size={14} strokeWidth={2} />
                  <span>{T.evaluationStatusLbl}</span>
                  <select
                    value={evaluationFilter}
                    onChange={(event) => setEvaluationFilter(event.target.value as "all" | "evaluated" | "pending")}
                    aria-label={T.evaluationStatusLbl}
                  >
                    <option value="all">{T.allEvaluationStatuses}</option>
                    <option value="evaluated">{T.evaluatedOnly}</option>
                    <option value="pending">{T.notEvaluated}</option>
                  </select>
                </label>
                <div className="am-trait-chips">
                  <button
                    className={`am-trait-chip ${traitFilter === null ? "active" : ""}`}
                    onClick={() => setTraitFilter(null)}
                  >
                    {T.resultFilterAll}
                  </button>
                  {detail.traits.map((tr, i) => (
                    <button
                      key={tr.id}
                      className={`am-trait-chip ${traitFilter === i ? "active" : ""}`}
                      style={traitFilter === i ? { background: tr.color, borderColor: tr.color, color: tr.color.toUpperCase() === "#F2EFE6" ? "#1A1A1A" : "#FFFBF5" } : undefined}
                      onClick={() => setTraitFilter(i)}
                      title={L === "ar" ? tr.statement_ar : tr.statement_sq}
                    >
                      <i style={{ background: tr.color }} />
                      {traitLabel(tr, L)}
                    </button>
                  ))}
                </div>
                <span className="am-member-filter-count" title={T.memberGroupHelp}>
                  {T.membersShown(visibleAggregation.length, aggregation.length)}
                </span>
                <button className="am-detail-filters-reset am-export-csv" onClick={exportMembersCsv} title={T.exportReportHelp}>
                  <Download size={12} strokeWidth={2.5} />
                  {T.exportReport}
                </button>
                {hasDetailFilters && (
                  <button className="am-detail-filters-reset" onClick={resetDetailFilters} title={T.resetFilters}>
                    <X size={12} strokeWidth={2.5} />
                    {T.resetFilters}
                  </button>
                )}
              </div>

              <section className="am-group-breakdown">
                <div className="am-collective-head">
                  <div>
                    <span><UserCheck size={16} />{T.groupBreakdownHead}</span>
                    <p>{T.groupBreakdownSub}</p>
                  </div>
                </div>
                <div className="am-group-breakdown-grid">
                  {groupBreakdown.map(({ group, total, evaluated, pending }) => {
                    const pendingNames = pending.map((entry) => entry.member.profile.full_name);
                    const pct = total > 0 ? Math.round((evaluated.length / total) * 100) : 0;
                    return (
                      <article className="am-breakdown-card" key={group.id}>
                        <header>
                          <span><Users2 size={15} /></span>
                          <strong>{group.name}</strong>
                          <em>{T.groupBreakdownOf(evaluated.length, total)}</em>
                        </header>
                        <div className="am-detail-progress" title={T.groupBreakdownOf(evaluated.length, total)}>
                          <span style={{ width: `${pct}%` }} />
                        </div>
                        <div className="am-breakdown-pending">
                          <div className="am-breakdown-pending-head">
                            <span>{T.pendingListHead} ({pending.length})</span>
                            {pending.length > 0 && (
                              <button onClick={() => void copyPendingNames(group, pendingNames)}>
                                {copiedGroupId === group.id ? <><ShieldCheck size={12} />{T.copiedNames}</> : <>{T.copyPendingNames}</>}
                              </button>
                            )}
                          </div>
                          {pending.length === 0 ? (
                            <p className="am-breakdown-empty">{T.pendingListEmpty}</p>
                          ) : (
                            <ul className="am-breakdown-names">
                              {pendingNames.map((name, index) => <li key={`${group.id}:${index}`}>{name}</li>)}
                            </ul>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="am-collective">
                <div className="am-collective-head">
                  <div>
                    <span><Globe2 size={16} />{T.collectiveHead}</span>
                    <p>{T.collectiveSub}</p>
                  </div>
                  <strong title={T.completionHelp}>{detail.overall_spectrum.completion_pct}%</strong>
                </div>
                <div className="am-collective-grid">
                  {[{
                    ...detail.overall_spectrum,
                    group_name: T.overallSpectrum,
                  }, ...detail.group_spectra].map((spectrum, spectrumIndex) => {
                    const cardKey = `group:${spectrum.group_id ?? "overall"}`;
                    const expanded = expandedCards.has(cardKey);
                    const relevantRatings = detail.ratings.filter((rating) => {
                      if (spectrum.group_id === null) return true;
                      return memberById.get(rating.rater_teacher_id)?.group_ids.includes(spectrum.group_id)
                        && memberById.get(rating.target_teacher_id)?.group_ids.includes(spectrum.group_id);
                    });
                    const latest = relevantRatings.reduce<string | null>((value, rating) => (
                      !value || new Date(rating.updated_at) > new Date(value) ? rating.updated_at : value
                    ), null);
                    return (
                      <article
                        className={`am-spectrum-card ${spectrum.group_id === null ? "overall" : ""} ${expanded ? "expanded" : ""}`}
                        key={spectrum.group_id ?? "overall"}
                        title={T.groupHelp}
                      >
                        <header className="am-spectrum-card-head">
                          <span>{spectrum.group_id === null ? <Globe2 size={15} /> : <Users2 size={15} />}</span>
                          <strong>{spectrum.group_name}</strong>
                        </header>
                        {spectrum.average ? (
                          <TraitSpectrumPanel
                            traits={detail.traits.map((trait, index) => ({
                              label: traitLabel(trait, L),
                              color: trait.color,
                              pct: spectrum.average?.[index] ?? 0,
                            }))}
                            seed={seedFromString(`${detail.id}:${spectrum.group_id ?? "overall"}:${spectrumIndex}`)}
                            lang={L}
                            summary
                          />
                        ) : <div className="am-collective-empty">{T.noSpectrum}</div>}
                        <button className="am-card-toggle" onClick={() => toggleCard(cardKey)} aria-expanded={expanded} title={expanded ? T.hideDetails : T.showDetails}>
                          <Eye size={14} />
                          {expanded ? T.hideDetails : T.showDetails}
                          <ChevronDown size={15} className={expanded ? "rotated" : ""} />
                        </button>
                        {expanded && (
                          <div className="am-card-details">
                            <div className="am-insight-grid">
                              <div title={T.completionHelp}><strong>{spectrum.completion_pct}%</strong><span>{T.completion}</span></div>
                              <div title={T.groupHelp}><strong>{spectrum.rating_count}/{spectrum.expected_count}</strong><span>{T.ratingsCount}</span></div>
                              <div title={T.distinctRaters}><strong>{spectrum.participating_raters}</strong><span>{T.distinctRaters}</span></div>
                              <div title={T.latestRating}><strong>{latest ? formatRatingDate(latest) : "—"}</strong><span>{T.latestRating}</span></div>
                            </div>
                            <div className="am-detail-progress" title={T.completionHelp}>
                              <span style={{ width: `${Math.min(100, spectrum.completion_pct)}%` }} />
                            </div>
                            <div className="am-trait-breakdown">
                              {detail.traits.map((trait, index) => (
                                <div key={trait.id} title={`${traitLabel(trait, L)}: ${Number(spectrum.average?.[index] ?? 0).toFixed(1)}%`}>
                                  <i style={{ background: trait.color }} />
                                  <span>{traitLabel(trait, L)}</span>
                                  <b>{Number(spectrum.average?.[index] ?? 0).toFixed(1)}%</b>
                                  <em><span style={{ width: `${Math.min(100, spectrum.average?.[index] ?? 0)}%`, background: trait.color }} /></em>
                                </div>
                              ))}
                            </div>
                            <RatingActivity
                              ratings={relevantRatings}
                              memberById={memberById}
                              traits={detail.traits}
                              lang={L}
                              title={T.ratingActivity}
                              raterLabel={T.raterCol}
                              targetLabel={T.targetCol}
                              timeLabel={T.ratingTime}
                              scoreLabel={T.scoreDistribution}
                              noRating={T.noRating}
                              formatDate={formatRatingDate}
                            />
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              {visibleAggregation.length === 0 ? (
                <div className="am-empty">{T.noMembersMatch}</div>
              ) : (
                <>
                  {/* Per-member aggregate cards */}
                  <section className="am-sub">
                    <div className="am-sub-head"><h3>{T.aggHead}</h3><p>{T.aggSub}</p></div>
                    <div className="am-agg-grid">
                      {visibleAggregation.map(({ member, count, givenCount, avg }) => {
                        const cardKey = `member:${member.teacher_id}`;
                        const expanded = expandedCards.has(cardKey);
                        const memberRatings = detail.ratings.filter((rating) => rating.target_teacher_id === member.teacher_id);
                        const latest = memberRatings.reduce<string | null>((value, rating) => (
                          !value || new Date(rating.updated_at) > new Date(value) ? rating.updated_at : value
                        ), null);
                        const distinctRaters = new Set(memberRatings.map((rating) => rating.rater_teacher_id)).size;
                        return (
                          <article key={member.teacher_id} className={`am-spectrum-card am-member-card ${expanded ? "expanded" : ""}`} title={T.memberHelp}>
                            <header className="am-spectrum-card-head">
                              <span><UserCheck size={15} /></span>
                              <strong>{member.profile.full_name}</strong>
                              <em className={`am-member-status ${givenCount > 0 ? "is-done" : "is-pending"}`}>
                                {givenCount > 0 ? T.evaluatedOnly : T.notEvaluated}
                              </em>
                            </header>
                            {!avg ? (
                              <div className="am-agg-empty">{T.noRating}</div>
                            ) : (
                              <TraitSpectrumPanel
                                traits={detail.traits.map((tr, i) => ({ label: traitLabel(tr, L), color: tr.color, pct: avg[i] ?? 0 }))}
                                seed={seedFromString(member.teacher_id)}
                                lang={L}
                                summary
                              />
                            )}
                            <button className="am-card-toggle" onClick={() => toggleCard(cardKey)} aria-expanded={expanded} title={expanded ? T.hideDetails : T.showDetails}>
                              <Eye size={14} />
                              {expanded ? T.hideDetails : T.showDetails}
                              <ChevronDown size={15} className={expanded ? "rotated" : ""} />
                            </button>
                            {expanded && (
                              <div className="am-card-details">
                                <div className="am-member-identity">
                                  <div><Mail size={13} /><span>{member.profile.email ?? T.noEmail}</span></div>
                                  <span className={`am-received-pill ${givenCount > 0 ? "is-done" : "is-pending"}`} title={T.evaluationFilterHelp}>
                                    {givenCount > 0 ? T.givenRatings(givenCount) : T.notEvaluated}
                                  </span>
                                </div>
                                <div className="am-insight-grid">
                                  <div title={T.receivedRatings(count)}><strong>{count}</strong><span>{T.ratingsCount}</span></div>
                                  <div title={T.evaluationFilterHelp}><strong>{givenCount}</strong><span>{T.evaluators}</span></div>
                                  <div title={T.distinctRaters}><strong>{distinctRaters}</strong><span>{T.distinctRaters}</span></div>
                                  <div title={T.latestRating}><strong>{latest ? formatRatingDate(latest) : "—"}</strong><span>{T.latestRating}</span></div>
                                </div>
                                {avg && (
                                  <div className="am-trait-breakdown">
                                    {detail.traits.map((trait, index) => (
                                      <div key={trait.id} title={`${traitLabel(trait, L)}: ${Number(avg[index] ?? 0).toFixed(1)}%`}>
                                        <i style={{ background: trait.color }} />
                                        <span>{traitLabel(trait, L)}</span>
                                        <b>{Number(avg[index] ?? 0).toFixed(1)}%</b>
                                        <em><span style={{ width: `${Math.min(100, avg[index] ?? 0)}%`, background: trait.color }} /></em>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <RatingActivity
                                  ratings={memberRatings}
                                  memberById={memberById}
                                  traits={detail.traits}
                                  lang={L}
                                  title={T.ratingActivity}
                                  raterLabel={T.raterCol}
                                  targetLabel={T.targetCol}
                                  timeLabel={T.ratingTime}
                                  scoreLabel={T.scoreDistribution}
                                  noRating={T.noRating}
                                  formatDate={formatRatingDate}
                                />
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>

                  <section className="am-sub am-analysis-section">
                    <button className="am-analysis-toggle" onClick={() => setShowAnalytics((value) => !value)} aria-expanded={showAnalytics} title={T.ratingActivitySub}>
                      <BarChart3 size={16} />
                      <span><strong>{showAnalytics ? T.hideAnalytics : T.showAnalytics}</strong><small>{T.ratingActivitySub}</small></span>
                      <ChevronDown size={17} className={showAnalytics ? "rotated" : ""} />
                    </button>
                    {showAnalytics && (
                      <>
                        <div className="am-sub-head am-analysis-head"><h3>{T.perTraitHead}</h3></div>
                        <div className="am-table-wrap">
                          <table className="am-table">
                            <thead><tr><th>{T.targetCol}</th>{detail.traits.map((tr) => <th key={tr.id} title={L === "ar" ? tr.statement_ar : tr.statement_sq}>{traitLabel(tr, L)}</th>)}</tr></thead>
                            <tbody>
                              {visibleAggregation.map(({ member, avg }) => (
                                <tr key={member.teacher_id}>
                                  <td className="am-name-cell">{member.profile.full_name}</td>
                                  {detail.traits.map((trait, index) => <td key={trait.id} title={`${traitLabel(trait, L)} — ${member.profile.full_name}`}>{avg ? (avg[index] ?? 0).toFixed(1) : T.noRating}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="am-sub-head am-analysis-head"><h3>{T.ratingActivity}</h3><p>{T.ratingActivitySub}</p></div>
                        <RatingActivity
                          ratings={visibleRatings}
                          memberById={memberById}
                          traits={detail.traits}
                          lang={L}
                          title={T.ratingActivity}
                          raterLabel={T.raterCol}
                          targetLabel={T.targetCol}
                          timeLabel={T.ratingTime}
                          scoreLabel={T.scoreDistribution}
                          noRating={T.noRating}
                          formatDate={formatRatingDate}
                        />

                        <button className="am-matrix-toggle" onClick={() => setShowMatrix((v) => !v)} title={T.matrixSub}>
                          <Target size={13} strokeWidth={2} />
                          {showMatrix ? T.hideMatrix : T.showMatrix}
                        </button>
                        {showMatrix && <>
                        <div className="am-sub-head" style={{ marginTop: 12 }}><h3>{T.matrixHead}</h3><p>{T.matrixSub}</p></div>
                        <div className="am-table-wrap">
                          <table className="am-matrix">
                            <thead>
                              <tr>
                                <th className="am-corner">{T.raterCol} ↓ / {T.targetCol} →</th>
                                {matrixMembers.map((m) => (
                                  <th key={m.teacher_id}>{m.profile.full_name}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {matrixMembers.map((rater) => (
                                <tr key={rater.teacher_id}>
                                  <td className="am-name-cell">{rater.profile.full_name}</td>
                                  {matrixMembers.map((target) => {
                                    const r = ratingFor(rater.teacher_id, target.teacher_id);
                                    if (!r) return <td key={target.teacher_id} className="am-empty-cell">{T.noRating}</td>;
                                    const d = derive(r.scores);
                                    return (
                                      <td key={target.teacher_id} className={rater.teacher_id === target.teacher_id ? "am-self-cell" : ""}>
                                        <div className="am-cell-scores">
                                          {r.scores.map((v, i) => {
                                            const isCore = d.coreIdx === i && d.hasCore;
                                            const isColl = d.connectingIdx === i;
                                            return (
                                              <span key={i} className={`am-score ${isCore ? "am-score-core" : isColl ? "am-score-coll" : ""}`} title={detail.traits[i] ? traitLabel(detail.traits[i], L) : ""}>
                                                {v}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        </>}
                      </>
                    )}
                  </section>

                  <section className="am-sub am-history">
                    <div className="am-history-head">
                      <div>
                        <h3><History size={15} />{T.historyHead}<span>{detail.history_count}</span></h3>
                        <p>{T.historySub}</p>
                      </div>
                      <button className="am-matrix-toggle" onClick={toggleHistoryPanel}>
                        <Activity size={13} />
                        {showHistory ? T.hideHistory : T.showHistory}
                      </button>
                    </div>
                    {showHistory && (
                      historyLoading ? <MandalaLoader compact /> : historyRows.length === 0 ? (
                        <div className="am-collective-empty">{T.historyEmpty}</div>
                      ) : (
                        <>
                          <div className="am-table-wrap">
                            <table className="am-history-table">
                              <thead><tr>
                                <th>{T.changedBy}</th><th>{T.changedFor}</th><th>{T.before}</th><th>{T.after}</th><th>{T.changedAt}</th>
                              </tr></thead>
                              <tbody>
                                {historyRows.map((revision) => (
                                  <tr key={revision.id}>
                                    <td className="am-name-cell">{revision.rater_name}</td>
                                    <td className="am-name-cell">{revision.target_name}</td>
                                    <td><div className="am-history-scores">{revision.scores.map((score, index) => <span key={index} style={{ borderColor: detail.traits[index]?.color }}>{score}</span>)}</div></td>
                                    <td><div className="am-history-scores after">{revision.replacement_scores.map((score, index) => <span key={index} style={{ borderColor: detail.traits[index]?.color }}>{score}</span>)}</div></td>
                                    <td><time>{new Intl.DateTimeFormat(L === "ar" ? "ar-SA" : "sq-AL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(revision.archived_at))}</time></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="am-history-pages">
                            <button disabled={historyPage <= 1 || historyLoading} onClick={() => loadHistory(historyPage - 1)}><ChevronRight size={14} /></button>
                            <span>{T.pageOf(historyPage, historyPages)}</span>
                            <button disabled={historyPage >= historyPages || historyLoading} onClick={() => loadHistory(historyPage + 1)}><ChevronLeft size={14} /></button>
                          </div>
                        </>
                      )
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {deleteDlg && !viewOnly && typeof document !== "undefined" && createPortal((
        <div className="am-overlay" onClick={() => !deleting && setDeleteDlg(false)}>
          <form
            className="am-delete-dlg"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => { event.preventDefault(); deleteAssessment(); }}
          >
            <header>
              <span className="am-delete-shield"><ShieldCheck size={22} /></span>
              <div>
                <h3>{T.deleteDialogTitle}</h3>
                <p>{T.deleteDialogSub}</p>
              </div>
              <button type="button" onClick={() => !deleting && setDeleteDlg(false)} aria-label={T.cancel} title={T.cancel}><X size={18} /></button>
            </header>
            <div className="am-delete-target">
              <Trash2 size={15} />
              <span>{detail?.title}</span>
            </div>
            <label className="am-secure-field">
              <span><Mail size={13} />{T.emailLbl}</span>
              <input
                type="email"
                name="assessment-delete-email"
                autoComplete="off"
                value={deleteForm.email}
                onChange={(event) => setDeleteForm((current) => ({ ...current, email: event.target.value }))}
                placeholder={T.emailPh}
                autoFocus
                required
              />
            </label>
            <label className="am-secure-field">
              <span><KeyRound size={13} />{T.passwordLbl}</span>
              <input
                type="password"
                name="assessment-delete-password"
                autoComplete="new-password"
                value={deleteForm.password}
                onChange={(event) => setDeleteForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={T.passwordPh}
                required
              />
            </label>
            {deleteError && <p className="am-delete-error">{deleteError}</p>}
            <footer>
              <button type="button" className="am-btn" onClick={() => setDeleteDlg(false)} disabled={deleting}>{T.cancel}</button>
              <button type="submit" className="am-delete-confirm" disabled={deleting || !deleteForm.email.trim() || !deleteForm.password}>
                <Trash2 size={14} />
                {deleting ? T.deleting : T.deleteVerify}
              </button>
            </footer>
          </form>
        </div>
      ), document.body)}

      {dlg && !viewOnly && typeof document !== "undefined" && createPortal((
        <div className="am-overlay" onClick={() => !saving && setDlg(null)}>
          <div className="am-dlg" onClick={(e) => e.stopPropagation()}>
            <header className="am-dlg-head">
              <div>
                <span><Layers3 size={14} />{T.setupTitle}</span>
                <h3 className="am-dlg-title">{dlg.mode === "create" ? T.dlgCreateTitle : T.dlgEditTitle}</h3>
                <p>{T.selectedGroups(form.groupIds.length)} · {T.traitsCount(form.traits.length)}</p>
              </div>
              <button type="button" onClick={() => !saving && setDlg(null)} aria-label={T.cancel}><X size={18} /></button>
            </header>

            {!editLocked && (
              <div className="am-dlg-steps" aria-label={T.setupTitle}>
                <span className={form.title.trim() ? "done" : "active"}><b>1</b>{T.titleLbl}</span>
                <i />
                <span className={form.groupIds.length ? "done" : "active"}><b>2</b>{T.groupsPickLbl}</span>
                <i />
                <span className={form.traits.length ? "done" : "active"}><b>3</b>{T.traitsLbl}</span>
              </div>
            )}

            <div className="am-dlg-body">
              <section className="am-form-section">
                <div className="am-form-number">1</div>
                <div className="am-form-content">
                  <label className="am-dlg-lbl">{T.titleLbl}</label>
                  <input className="am-dlg-input" placeholder={T.titlePh} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
                </div>
              </section>

              {editLocked ? (
                <p className="am-dlg-note">{T.lockedEditNote}</p>
              ) : (
                <>
                  <section className="am-form-section">
                    <div className="am-form-number">2</div>
                    <div className="am-form-content">
                      <label className="am-dlg-lbl">{T.groupsPickLbl}</label>
                      <p className="am-dlg-hint">{T.groupsPickSub}</p>
                      <span className="am-scope-label">{T.scopeLbl}</span>
                      <div className="am-scope-grid">
                        <button
                          type="button"
                          className={form.groupIds.length === groups.length ? "active" : ""}
                          onClick={() => setForm((current) => ({ ...current, groupIds: groups.map((group) => group.id) }))}
                        >
                          <CheckSquare size={18} />
                          <span><strong>{T.scopeAll}</strong><small>{T.scopeAllSub}</small></span>
                        </button>
                        <button
                          type="button"
                          className={form.groupIds.length !== groups.length ? "active" : ""}
                          onClick={() => setForm((current) => ({ ...current, groupIds: current.groupIds.length === groups.length ? groups.slice(0, 1).map((group) => group.id) : current.groupIds }))}
                        >
                          <Users2 size={18} />
                          <span><strong>{T.scopeSpecific}</strong><small>{T.scopeSpecificSub}</small></span>
                        </button>
                      </div>

                      {form.groupIds.length !== groups.length && (
                        <div className="am-group-grid">
                          {groups.map((g) => {
                            const checked = form.groupIds.includes(g.id);
                            return (
                              <label key={g.id} className={`am-group-chk ${checked ? "checked" : ""}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleGroup(g.id)} />
                                <span>{g.name}</span>
                                <em>{g._count?.members ?? 0}</em>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="am-form-section">
                    <div className="am-form-number">3</div>
                    <div className="am-form-content">
                      <div className="am-dlg-section-head">
                        <div>
                          <label className="am-dlg-lbl" style={{ margin: 0 }}>{T.traitsLbl}</label>
                          <p className="am-dlg-hint">{T.traitsSub}</p>
                        </div>
                        <span className="am-trait-total">{T.traitsCount(form.traits.length)}</span>
                      </div>
                      <div className="am-trait-editor">
                        {form.traits.map((t, i) => (
                          <div key={i} className={`am-trait-row ${expandedTraitIndex === i ? "expanded" : ""}`}>
                            <div className="am-trait-row-head">
                              <span className="am-trait-index">{i + 1}</span>
                              <input
                                type="color"
                                className="am-trait-color"
                                value={t.color}
                                onChange={(e) => updateTrait(i, { color: e.target.value })}
                              />
                              <input
                                className="am-trait-input am-trait-label"
                                placeholder={T.traitLabelAr}
                                value={t.label_ar}
                                onChange={(e) => updateTrait(i, { label_ar: e.target.value })}
                                dir="rtl"
                              />
                              <input
                                className="am-trait-input am-trait-label"
                                placeholder={T.traitLabelSq}
                                value={t.label_sq}
                                onChange={(e) => updateTrait(i, { label_sq: e.target.value })}
                              />
                              <button
                                type="button"
                                className="am-trait-expand"
                                onClick={() => setExpandedTraitIndex((current) => current === i ? null : i)}
                                aria-expanded={expandedTraitIndex === i}
                                title={expandedTraitIndex === i ? T.hideTraitDetails : T.traitDetails}
                              >
                                <ChevronDown size={15} />
                                <span>{expandedTraitIndex === i ? T.hideTraitDetails : T.traitDetails}</span>
                              </button>
                              <button type="button" className="am-trait-remove" onClick={() => removeTrait(i)} title={T.removeTrait}>
                                <Trash2 size={13} strokeWidth={2} />
                              </button>
                            </div>
                            {expandedTraitIndex === i && <div className="am-trait-details"><div className="am-trait-statements">
                              <textarea
                                className="am-trait-input am-trait-statement"
                                placeholder={T.traitStatementAr}
                                value={t.statement_ar}
                                onChange={(e) => updateTrait(i, { statement_ar: e.target.value })}
                                dir="rtl"
                                rows={3}
                              />
                              <textarea
                                className="am-trait-input am-trait-statement"
                                placeholder={T.traitStatementSq}
                                value={t.statement_sq}
                                onChange={(e) => updateTrait(i, { statement_sq: e.target.value })}
                                rows={3}
                              />
                            </div>
                            <div className="am-trait-meta">
                              <input
                                className="am-trait-input"
                                placeholder={`${T.objective} (عربي)`}
                                value={t.objective_ar ?? ""}
                                onChange={(event) => updateTrait(i, { objective_ar: event.target.value })}
                                dir="rtl"
                              />
                              <input
                                className="am-trait-input"
                                placeholder={`${T.objective} (Shqip)`}
                                value={t.objective_sq ?? ""}
                                onChange={(event) => updateTrait(i, { objective_sq: event.target.value })}
                              />
                            </div></div>}
                          </div>
                        ))}
                        <button type="button" className="am-add-trait" onClick={addTrait}>
                          <Plus size={14} strokeWidth={2.4} />
                          {T.addTrait}
                        </button>
                        {form.traits.length === 0 && <p className="am-dlg-warn">{T.minTraitsWarn}</p>}
                      </div>
                    </div>
                  </section>
                </>
              )}

              {dlgError && <p className="am-dlg-err">{dlgError}</p>}
            </div>

            <div className="am-dlg-actions">
              <button className="am-btn" onClick={() => setDlg(null)} disabled={saving}>{T.cancel}</button>
              <button
                className="am-btn am-btn-primary"
                onClick={submitDialog}
                disabled={saving || !form.title.trim()}
              >
                {saving ? T.creating : dlg.mode === "create" ? T.submit : T.save}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ── Hidden export sheet — captured via html2canvas, not the on-screen UI ── */}
      {detail && (
        <div className="am-export-mount" aria-hidden="true">
          <div ref={exportRef} className="am-export-sheet">
            <div className="am-export-head">
              <div className="am-export-mark" />
              <div>
                <div className="am-export-eyebrow">{T.title}</div>
                <div className="am-export-title">{detail.title}</div>
                <div className="am-export-sub">{detail.groups.map((g) => g.name).join(" · ")} · {T.matrixOf(detail.members.length)}</div>
              </div>
              <span className={`am-export-status am-export-status-${detail.status}`}>
                {detail.status === "OPEN" ? T.statusOPEN : T.statusCLOSED}
              </span>
            </div>
            <div className="am-export-grid">
              {aggregation.map(({ member, count, avg, derive: d }) => (
                <div key={member.teacher_id} className="am-export-card">
                  <div className="am-export-card-head">
                    <div className="am-export-card-head-main">
                      {avg && (
                        <span
                          className="am-export-swatch"
                          style={{ background: blendCmykWeighted(detail.traits.map((tr, i) => ({ color: tr.color, pct: avg[i] ?? 0 }))) }}
                        />
                      )}
                      <strong>{member.profile.full_name}</strong>
                    </div>
                    <span>{count} {T.ratingsCount}</span>
                  </div>
                  {!avg || !d ? (
                    <div className="am-export-noresult">{T.noRating}</div>
                  ) : (
                    <>
                      {detail.traits.map((tr, i) => {
                        const isCore = d.coreIdx === i && d.hasCore;
                        return (
                          <div key={tr.id} className="am-export-row">
                            <span className={isCore ? "am-export-trait-core" : ""}>{traitLabel(tr, L)}</span>
                            <div className="am-export-track"><div className="am-export-fill" style={{ width: `${Math.min(100, avg[i] ?? 0)}%`, background: tr.color }} /></div>
                            <b>{(avg[i] ?? 0).toFixed(1)}</b>
                          </div>
                        );
                      })}
                      <div className="am-export-footer">
                        {d.hasCore && d.coreIdx !== null ? `${AT.coreLabel}: ${traitLabel(detail.traits[d.coreIdx], L)}` : AT.noCore}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="am-metric" title={`${label}: ${value}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function RatingActivity({
  ratings,
  memberById,
  traits,
  lang,
  title,
  raterLabel,
  targetLabel,
  timeLabel,
  scoreLabel,
  noRating,
  formatDate,
}: {
  ratings: RatingRow[];
  memberById: Map<string, Member>;
  traits: Trait[];
  lang: "ar" | "sq";
  title: string;
  raterLabel: string;
  targetLabel: string;
  timeLabel: string;
  scoreLabel: string;
  noRating: string;
  formatDate: (value: string) => string;
}) {
  if (ratings.length === 0) return <div className="am-collective-empty">{noRating}</div>;
  return (
    <div className="am-activity" title={title}>
      <div className="am-activity-head">
        <span><Activity size={13} />{title}</span>
        <b>{ratings.length}</b>
      </div>
      <div className="am-activity-scroll">
        <table>
          <thead><tr><th>{raterLabel}</th><th>{targetLabel}</th><th>{scoreLabel}</th><th>{timeLabel}</th></tr></thead>
          <tbody>
            {[...ratings].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map((rating) => {
              const raterName = memberById.get(rating.rater_teacher_id)?.profile.full_name ?? "—";
              const targetName = memberById.get(rating.target_teacher_id)?.profile.full_name ?? "—";
              return (
                <tr key={`${rating.rater_teacher_id}:${rating.target_teacher_id}`}>
                  <td><span className="am-person-cell"><UserCheck size={12} />{raterName}</span></td>
                  <td><span className="am-person-cell"><Target size={12} />{targetName}</span></td>
                  <td>
                    <div className="am-rating-scores">
                      {rating.scores.map((score, index) => (
                        <span key={index} title={`${traits[index] ? traitLabel(traits[index], lang) : index + 1}: ${score}`} style={{ borderColor: traits[index]?.color }}>
                          <i style={{ background: traits[index]?.color }} />
                          {score}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td><time title={formatDate(rating.updated_at)}><CalendarClock size={12} />{formatDate(rating.updated_at)}</time></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@500;700&display=swap');
  @keyframes am-fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  .am-page { --font-head:'Noto Kufi Arabic','Cairo',sans-serif; display:flex; flex-direction:column; gap:16px; font-family:'Cairo',sans-serif; color:#1A1A1A; }

  .am-hero {
    display:grid; grid-template-columns: minmax(0,1fr) auto; gap:22px; align-items:end;
    padding:28px 30px; border-radius:24px; overflow:hidden; position:relative;
    background: radial-gradient(circle at 85% -30%, rgba(184,160,130,.22), transparent 44%), radial-gradient(circle at 10% 120%, rgba(107,30,45,.55), transparent 46%), linear-gradient(140deg,#32101A 0%,#4A0E1C 55%,#5B1526 100%);
    border:1px solid rgba(184,160,130,.38); color:#FFFBF5;
    box-shadow: 0 22px 55px rgba(50,16,26,.25), inset 0 1px 0 rgba(217,201,176,.12);
  }
  .am-hero:before { content:""; position:absolute; top:0; inset-inline:28px; height:1.5px; background:linear-gradient(90deg,transparent,rgba(217,201,176,.55) 30%,rgba(217,201,176,.55) 70%,transparent); }
  .am-hero-star { position:absolute; inset-inline-end:-70px; top:50%; transform:translateY(-50%); opacity:.14; pointer-events:none; }
  .am-eyebrow { margin:0 0 6px; display:flex; align-items:center; gap:8px; color:#D9C9B0; font-size:10.5px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; }
  .am-hero h1 { margin:0; font-family:var(--font-head); font-size:27px; font-weight:700; color:#FFFBF5; line-height:1.4; }
  .am-hero p { max-width:640px; margin:8px 0 0; color:rgba(239,234,224,.72); font-size:13.5px; line-height:1.9; font-weight:400; }
  .am-hero-metrics { display:grid; grid-template-columns:repeat(4, minmax(74px,1fr)); gap:10px; position:relative; z-index:1; }
  .am-metric { padding:12px 14px; border-radius:16px; background:rgba(50,16,26,.45); border:1px solid rgba(184,160,130,.30); backdrop-filter:blur(10px); min-width:78px; box-shadow:inset 0 1px 0 rgba(217,201,176,.10); }
  .am-metric strong { display:block; color:#D9C9B0; font-family:var(--font-head); font-size:22px; line-height:1.2; font-weight:700; }
  .am-metric span { display:block; margin-top:6px; color:rgba(239,234,224,.68); font-size:11px; font-weight:600; }
  .am-hero-palette { position:relative; z-index:2; grid-column:1 / -1; display:grid; grid-template-columns:repeat(8,1fr); height:12px; overflow:hidden; border:1px solid rgba(255,251,245,.28); border-radius:999px; background:rgba(26,10,16,.45); box-shadow:0 7px 18px rgba(26,10,16,.22); }
  .am-hero-palette span { display:block; min-width:0; border-inline-end:1px solid rgba(255,255,255,.32); transition:filter .18s ease,transform .18s ease; }
  .am-hero-palette span:last-child { border-inline-end:0; }
  .am-hero-palette span:hover { filter:brightness(1.14); transform:scaleY(1.7); transform-origin:center; }

  .am-createbar { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:16px 18px; border:1px solid rgba(184,160,130,.28); border-radius:18px; background:linear-gradient(115deg,#FFFBF5,#F1E9DE); box-shadow:0 10px 26px rgba(50,16,26,.055); }
  .am-createbar-copy { min-width:0; }
  .am-createbar-copy span { display:flex; align-items:center; gap:7px; color:#4A0E1C; font-size:13px; font-weight:900; }
  .am-createbar-copy span svg { color:#B8A082; }
  .am-createbar-copy p { margin:4px 0 0; color:#796A62; font-size:11.5px; line-height:1.6; font-weight:700; }
  .am-create { display:inline-flex; align-items:center; gap:7px; height:44px; padding:0 20px; border-radius:14px; background:linear-gradient(180deg,#5B1526,#32101A); border:1px solid rgba(184,160,130,.35); color:#D9C9B0; font:800 13px 'Cairo',sans-serif; cursor:pointer; transition:box-shadow .18s ease, transform .18s ease; }
  .am-create:hover { box-shadow:0 8px 22px rgba(184,160,130,.28); transform:translateY(-1px); }

  /* ── Filters ── */
  .am-filters { border-radius:20px; padding:16px 18px; background:linear-gradient(180deg,#FFFBF5,#F7F3EB); border:1px solid rgba(184,160,130,.26); box-shadow:0 10px 26px rgba(50,16,26,.045); position:relative; overflow:hidden; }
  .am-filters:before { content:""; position:absolute; top:0; inset-inline:18px; height:2px; background:linear-gradient(90deg,transparent,#B8A082,transparent); }
  .am-filters-head { display:flex; align-items:center; gap:8px; margin-bottom:13px; color:#655B53; }
  .am-filters-head svg { color:#B8A082; }
  .am-filters-head > span { font-family:var(--font-head); font-size:12.5px; font-weight:700; }
  .am-filters-count { font-style:normal; font-size:11px; font-weight:700; color:#6B1E2D; background:rgba(184,160,130,.14); border:1px solid rgba(184,160,130,.25); border-radius:999px; padding:2px 10px; }
  .am-filters-reset { margin-inline-start:auto; display:inline-flex; align-items:center; gap:5px; background:none; border:1px solid rgba(107,30,45,.22); border-radius:999px; padding:4px 12px; color:#6B1E2D; font:700 11px 'Cairo',sans-serif; cursor:pointer; transition:background .16s ease; }
  .am-filters-reset:hover { background:rgba(107,30,45,.07); }
  .am-filters-row { display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; }
  .am-filter { display:flex; flex-direction:column; gap:6px; min-width:0; }
  .am-filter > span { font-size:10.5px; font-weight:700; letter-spacing:.04em; color:#8F765B; }
  .am-filter select { height:42px; border-radius:13px; padding:0 12px; border:1px solid rgba(184,160,130,.30); background:#FFFFFF; font:700 12.5px 'Cairo',sans-serif; color:#1A1A1A; cursor:pointer; outline:none; transition:border-color .18s ease, box-shadow .18s ease; }
  .am-filter select:hover { border-color:rgba(184,160,130,.5); }
  .am-filter select:focus { border-color:rgba(184,160,130,.6); box-shadow:0 0 0 4px rgba(184,160,130,.10); }

  .am-search-box { display:flex; align-items:center; gap:8px; height:42px; border-radius:13px; padding:0 12px; border:1px solid rgba(184,160,130,.30); background:#FFFFFF; transition:border-color .18s ease, box-shadow .18s ease; }
  .am-search-box:focus-within { border-color:rgba(184,160,130,.6); box-shadow:0 0 0 4px rgba(184,160,130,.10); }
  .am-search-box svg { color:#B8A082; flex-shrink:0; }
  .am-search-box input { flex:1; border:none; outline:none; background:transparent; font:700 12.5px 'Cairo',sans-serif; color:#1A1A1A; min-width:0; }
  .am-search-box--detail { max-width:320px; background:#F7F3EB; }

  .am-empty { padding:40px 20px; text-align:center; border-radius:18px; background:#FFFBF5; border:1px solid rgba(184,160,130,.16); color:#796A62; font-weight:700; font-size:13px; }

  /* ── Layout ── */
  .am-layout { display:grid; grid-template-columns:300px 1fr; gap:16px; align-items:start; }
  @media (max-width:1000px) { .am-layout { grid-template-columns:minmax(0,1fr); } .am-filters-row { grid-template-columns:1fr; } }

  .am-side { min-width:0; background:linear-gradient(180deg,#FFFBF5,#F7F3EB); border:1px solid rgba(184,160,130,.22); border-radius:20px; padding:10px; min-height:220px; box-shadow:0 10px 26px rgba(50,16,26,.045); }
  .am-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:5px; }
  .am-list-item { width:100%; text-align:start; background:transparent; border:1px solid transparent; padding:12px 13px; border-radius:14px; cursor:pointer; font-family:inherit; display:flex; flex-direction:column; gap:5px; transition:all .16s ease; }
  .am-list-item:hover { background:rgba(184,160,130,.09); }
  .am-list-item.active { background:linear-gradient(165deg,#FFFBF5,#F7F3EB); border-color:rgba(184,160,130,.5); box-shadow:0 6px 16px rgba(50,16,26,.08); }
  .am-list-top { display:flex; justify-content:space-between; gap:8px; align-items:center; }
  .am-tag { font-size:10px; font-weight:800; padding:2px 9px; border-radius:99px; letter-spacing:.03em; }
  .am-tag-OPEN { background:rgba(27,94,32,.10); color:#1B5E20; }
  .am-tag-CLOSED { background:rgba(184,160,130,.16); color:#8F765B; }
  .am-list-count { font-size:10.5px; color:#8F765B; font-weight:700; }
  .am-list-title { font-size:13px; font-weight:700; color:#1A1A1A; line-height:1.4; }
  .am-list-meta { display:flex; align-items:center; gap:5px; font-size:10.5px; color:#8C8274; font-weight:700; }
  .am-list-meta svg { color:#B8A082; }

  .am-detail { min-width:0; background:linear-gradient(180deg,#FFFBF5,#F7F3EB); border:1px solid rgba(184,160,130,.22); border-radius:20px; padding:20px; min-height:320px; box-shadow:0 10px 26px rgba(50,16,26,.045); }
  .am-detail-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:70px 20px; text-align:center; color:#8C8274; }
  .am-detail-empty svg { color:#B8A082; margin-bottom:4px; }
  .am-detail-empty strong { font-family:var(--font-head); font-size:15px; color:#655B53; }
  .am-detail-empty span { font-size:12.5px; max-width:340px; }

  .am-detail-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; padding-bottom:14px; border-bottom:1px solid rgba(184,160,130,.26); margin-bottom:16px; }
  .am-detail-title-row { display:flex; align-items:center; gap:8px; }
  .am-detail-title { font-family:var(--font-head); font-size:18px; font-weight:700; color:#1A1A1A; margin:0; }
  .am-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:8px; background:rgba(184,160,130,.12); border:1px solid rgba(184,160,130,.24); color:#8F765B; cursor:pointer; transition:all .16s ease; }
  .am-icon-btn:hover { background:rgba(184,160,130,.2); color:#6B1E2D; }
  .am-detail-meta { display:inline-flex; align-items:center; gap:6px; margin-top:6px; font-size:12px; color:#8F765B; font-weight:700; }
  .am-detail-actions { display:flex; gap:7px; flex-wrap:wrap; }
  .am-detail-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:9px; margin:-4px 0 15px; }
  .am-detail-stats>div { display:grid; grid-template-columns:22px minmax(0,1fr); grid-template-rows:auto auto; column-gap:7px; align-items:center; min-width:0; border:1px solid rgba(107,30,45,.12); border-radius:13px; background:#FFFDF9; padding:9px 11px; box-shadow:0 4px 12px rgba(50,16,26,.035); }
  .am-detail-stats svg { grid-row:1 / -1; color:#8F765B; }
  .am-detail-stats strong { color:#32101A; font:900 16px ui-monospace,Consolas,monospace; line-height:1.1; }
  .am-detail-stats span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#796A62; font-size:9.5px; font-weight:800; }

  .am-btn { display:inline-flex; align-items:center; gap:6px; background:#FFF; border:1.5px solid rgba(184,160,130,.32); color:#6B1E2D; padding:8px 14px; border-radius:11px; font-family:inherit; font-size:12px; font-weight:800; cursor:pointer; transition:all .16s ease; }
  .am-btn:hover:not(:disabled) { border-color:#B8A082; transform:translateY(-1px); }
  .am-btn:disabled { opacity:.55; cursor:not-allowed; }
  .am-btn-primary { background:linear-gradient(180deg,#5B1526,#32101A); color:#D9C9B0; border-color:transparent; }
  .am-btn-danger { background:rgba(107,30,45,.07); color:#6B1E2D; border-color:rgba(107,30,45,.28); }

  .am-detail-filters { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
  .am-member-group-filter { display:flex; align-items:center; gap:8px; min-width:250px; height:42px; border:1px solid rgba(107,30,45,.18); border-radius:13px; background:#FFFFFF; padding:0 11px; transition:border-color .18s ease, box-shadow .18s ease; }
  .am-member-group-filter:focus-within { border-color:rgba(107,30,45,.48); box-shadow:0 0 0 4px rgba(107,30,45,.07); }
  .am-member-group-filter>svg { flex:none; color:#8F765B; }
  .am-member-group-filter>span { flex:none; color:#6B1E2D; font-size:10px; font-weight:900; }
  .am-member-group-filter select { min-width:0; flex:1; border:0; outline:0; background:transparent; color:#32101A; font:800 11.5px 'Cairo',sans-serif; cursor:pointer; }
  .am-evaluation-filter { border-color:rgba(27,94,32,.18); }
  .am-evaluation-filter:focus-within { border-color:rgba(27,94,32,.46); box-shadow:0 0 0 4px rgba(27,94,32,.07); }
  .am-evaluation-filter>svg { color:#1B5E20; }
  .am-evaluation-filter>span { color:#1B5E20; }
  .am-member-filter-count { margin-inline-start:auto; flex:none; border:1px solid rgba(107,30,45,.16); border-radius:999px; background:#FFFBF5; padding:5px 10px; color:#6B1E2D; font-size:10px; font-weight:900; white-space:nowrap; }
  .am-detail-filters-reset { display:inline-flex; align-items:center; gap:4px; flex:none; border:1px solid rgba(107,30,45,.2); border-radius:999px; background:rgba(107,30,45,.06); padding:5px 10px; color:#6B1E2D; font:800 10px 'Cairo',sans-serif; cursor:pointer; transition:background .16s ease, border-color .16s ease; }
  .am-detail-filters-reset:hover { border-color:rgba(107,30,45,.38); background:rgba(107,30,45,.12); }
  .am-trait-chips { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .am-trait-chip { display:inline-flex; align-items:center; gap:7px; border:1.5px solid rgba(184,160,130,.30); background:#FFFFFF; color:#655B53; padding:7px 13px; border-radius:999px; font:700 11.5px 'Cairo',sans-serif; cursor:pointer; transition:all .16s ease; }
  .am-trait-chip i { width:10px; height:10px; flex:none; border:1px solid rgba(26,26,26,.20); border-radius:4px; box-shadow:0 0 0 2px rgba(255,255,255,.72); }
  .am-trait-chip:hover { border-color:rgba(184,160,130,.65); background:#FFFDF9; box-shadow:0 5px 12px rgba(50,16,26,.08); transform:translateY(-1px); }
  .am-trait-chip.active { border-color:transparent; color:#FFFBF5; font-weight:800; }
  .am-trait-chip.active i { border-color:rgba(255,255,255,.72); box-shadow:0 0 0 2px rgba(50,16,26,.18); }

  .am-group-chip-filter { display:flex; align-items:center; gap:10px; flex-wrap:wrap; min-height:42px; }
  .am-group-chip-filter > span { display:inline-flex; align-items:center; gap:6px; flex:none; color:#6B1E2D; font:900 10px 'Cairo',sans-serif; }
  .am-export-csv { color:#1B5E20; border-color:rgba(27,94,32,.28); background:rgba(27,94,32,.06); }
  .am-export-csv:hover { border-color:rgba(27,94,32,.5); background:rgba(27,94,32,.12); }

  .am-group-breakdown { margin:4px 0 18px; padding:16px; border:1px solid rgba(107,30,45,.16); border-radius:18px; background:linear-gradient(150deg,#FFFDF9,#F5EEE4); box-shadow:0 10px 24px rgba(50,16,26,.05); }
  .am-group-breakdown-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)); gap:12px; }
  .am-breakdown-card { min-width:0; border:1px solid rgba(184,160,130,.30); border-radius:16px; background:#FFFBF5; padding:13px; }
  .am-breakdown-card > header { display:flex; align-items:center; gap:8px; margin-bottom:9px; }
  .am-breakdown-card > header > span { display:grid; place-items:center; width:26px; height:26px; flex:none; border-radius:9px; background:#EFEAE0; color:#6B1E2D; }
  .am-breakdown-card > header > strong { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#32101A; font-size:12.5px; }
  .am-breakdown-card > header > em { flex:none; font-style:normal; color:#6B1E2D; font-size:10.5px; font-weight:800; background:rgba(107,30,45,.08); border-radius:999px; padding:3px 9px; }
  .am-breakdown-pending { margin-top:10px; }
  .am-breakdown-pending-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:7px; }
  .am-breakdown-pending-head > span { color:#8F765B; font-size:10.5px; font-weight:800; }
  .am-breakdown-pending-head > button { display:inline-flex; align-items:center; gap:4px; border:1px solid rgba(107,30,45,.22); border-radius:999px; background:#FFFFFF; color:#6B1E2D; padding:4px 10px; font:800 10px 'Cairo',sans-serif; cursor:pointer; transition:all .16s ease; }
  .am-breakdown-pending-head > button:hover { border-color:rgba(107,30,45,.4); background:#FFFDF9; }
  .am-breakdown-names { display:flex; flex-direction:column; gap:5px; max-height:180px; overflow-y:auto; margin:0; padding:0; list-style:none; }
  .am-breakdown-names li { border:1px solid rgba(184,160,130,.24); border-radius:10px; background:#F7F3EB; padding:6px 10px; color:#4A0E1C; font-size:11.5px; font-weight:700; }
  .am-breakdown-empty { margin:0; color:#1B5E20; font-size:11.5px; font-weight:700; }

  .am-collective { margin:4px 0 24px; padding:18px; border:1px solid rgba(107,30,45,.18); border-radius:20px; background:linear-gradient(145deg,#F1EBE2,#FFFBF5 48%,#EFEAE0); box-shadow:0 14px 32px rgba(50,16,26,.07); }
  .am-collective-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:14px; }
  .am-collective-head>div>span { display:flex; align-items:center; gap:7px; color:#4A0E1C; font-family:var(--font-head); font-size:14px; font-weight:700; }
  .am-collective-head>div>span svg { color:#8F765B; }
  .am-collective-head p { max-width:720px; margin:5px 0 0; color:#655B53; font-size:11.5px; font-weight:700; line-height:1.75; }
  .am-collective-head>strong { flex:none; min-width:64px; border:1px solid rgba(107,30,45,.18); border-radius:14px; background:#FFFBF5; padding:8px 12px; color:#6B1E2D; text-align:center; font:900 16px ui-monospace,monospace; }
  .am-methodology-strip { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:7px; margin-bottom:13px; }
  .am-methodology-strip>div { display:grid; grid-template-columns:13px minmax(0,1fr); align-items:center; gap:7px; min-width:0; border:1px solid rgba(184,160,130,.24); border-radius:11px; background:rgba(255,255,255,.68); padding:8px; }
  .am-methodology-strip i { width:12px; height:24px; border:1px solid rgba(26,26,26,.2); border-radius:5px; }
  .am-methodology-strip span { min-width:0; }
  .am-methodology-strip strong,.am-methodology-strip small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-methodology-strip strong { color:#32101A; font-size:10.5px; }
  .am-methodology-strip small { color:#8F765B; font-size:8.5px; font-weight:800; }
  .am-methodology-strip em { grid-column:2; margin-top:-4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#655B53; font-size:8.5px; font-style:normal; font-weight:700; }
  .am-collective-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr)); gap:12px; }
  .am-collective-card { min-width:0; overflow:hidden; border:1px solid rgba(184,160,130,.30); border-radius:18px; background:#FFFBF5; padding:13px; }
  .am-collective-card.overall { border-color:rgba(107,30,45,.32); box-shadow:inset 0 3px 0 #6B1E2D; }
  .am-collective-card>header { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:9px; }
  .am-collective-card>header>div { display:flex; align-items:center; gap:7px; min-width:0; }
  .am-collective-card>header>div>span { display:grid; place-items:center; width:27px; height:27px; border-radius:9px; background:#EFEAE0; color:#6B1E2D; }
  .am-collective-card>header strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#32101A; font-size:12.5px; }
  .am-collective-card>header em { flex:none; font-style:normal; color:#8F765B; font-size:10px; font-weight:800; }
  .am-collective-progress { margin-bottom:10px; padding:9px 10px; border-radius:12px; background:#F7F3EB; }
  .am-collective-progress>div { display:flex; justify-content:space-between; gap:8px; color:#655B53; font-size:10px; font-weight:800; }
  .am-collective-progress>div b { color:#6B1E2D; }
  .am-collective-progress>i { display:block; height:6px; margin:6px 0; overflow:hidden; border-radius:999px; background:#D9C9B0; }
  .am-collective-progress>i span { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#8F765B,#6B1E2D); }
  .am-collective-progress small { color:#796A62; font-size:9.5px; font-weight:700; }
  .am-collective-empty { display:grid; place-items:center; min-height:82px; border:1px dashed rgba(184,160,130,.32); border-radius:14px; background:#F7F3EB; padding:15px; color:#796A62; text-align:center; font-size:11.5px; font-weight:700; }

  .am-sub { margin-top:20px; }
  .am-sub-head { margin-bottom:11px; }
  .am-sub-head h3 { margin:0 0 4px; font-family:var(--font-head); font-size:14px; font-weight:700; color:#1A1A1A; }
  .am-sub-head p { margin:0; font-size:12px; color:#796A62; line-height:1.75; }

  .am-agg-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 460px),1fr)); gap:14px; }
  .am-agg { position:relative; min-width:0; overflow:hidden; background:linear-gradient(165deg,#FFFBF5,#F7F3EB); border:1px solid rgba(184,160,130,.28); border-radius:16px; padding:14px; box-shadow:0 8px 20px rgba(50,16,26,.045); transition:transform .18s ease, border-color .18s ease; }
  .am-agg:hover { transform:translateY(-2px); border-color:rgba(184,160,130,.5); }
  .am-agg-watermark { position:absolute; inset-inline-end:-16px; bottom:-16px; pointer-events:none; z-index:0; }
  .am-agg-head { position:relative; z-index:1; display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:9px; }
  .am-agg-head-main { display:flex; align-items:center; gap:8px; min-width:0; }
  .am-agg-spectrum-row { position:relative; z-index:1; margin-bottom:14px; }
  .am-agg-name { font-family:var(--font-head); font-size:13px; font-weight:700; color:#1A1A1A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-agg-count { font-size:10.5px; color:#8F765B; font-weight:700; background:rgba(184,160,130,.16); padding:2px 8px; border-radius:99px; }
  .am-agg-empty { position:relative; z-index:1; font-size:12px; color:#8C8274; font-weight:700; padding:10px 0; }
  .am-agg-bars { position:relative; z-index:1; display:flex; flex-direction:column; gap:5px; margin-bottom:9px; }
  .am-agg-row { display:grid; grid-template-columns:64px 1fr 34px; align-items:center; gap:6px; }
  .am-agg-trait { font-size:10.5px; font-weight:700; color:#4A0E1C; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-agg-trait.core { color:#6B1E2D; font-weight:800; }
  .am-agg-trait.coll { color:#8F765B; font-weight:800; }
  .am-agg-track { height:6px; background:rgba(184,160,130,.18); border-radius:99px; overflow:hidden; }
  .am-agg-fill { height:100%; border-radius:99px; }
  .am-agg-val { font-family:ui-monospace,monospace; font-size:11px; font-weight:800; color:#1A1A1A; text-align:center; }
  .am-agg-derived { position:relative; z-index:1; display:flex; flex-direction:column; gap:3px; padding-top:7px; border-top:1px dashed rgba(184,160,130,.32); font-size:11px; color:#4A0E1C; line-height:1.75; }
  .am-agg-derived b { color:#6B1E2D; }
  .am-agg-derived-core { font-weight:700; }

  .am-matrix-toggle { display:inline-flex; align-items:center; gap:7px; background:rgba(184,160,130,.10); border:1px solid rgba(184,160,130,.26); color:#6B1E2D; padding:9px 16px; border-radius:12px; font:800 12px 'Cairo',sans-serif; cursor:pointer; transition:all .16s ease; }
  .am-matrix-toggle:hover { background:rgba(184,160,130,.18); }

  .am-history { border-top:1px solid rgba(184,160,130,.22); padding-top:18px; }
  .am-history-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:12px; }
  .am-history-head h3 { display:flex; align-items:center; gap:7px; margin:0; color:#32101A; font-family:var(--font-head); font-size:14px; }
  .am-history-head h3 svg { color:#8F765B; }
  .am-history-head h3 span { border-radius:999px; background:rgba(107,30,45,.09); padding:2px 8px; color:#6B1E2D; font:900 10px ui-monospace,monospace; }
  .am-history-head p { max-width:720px; margin:5px 0 0; color:#796A62; font-size:11.5px; font-weight:700; line-height:1.7; }
  .am-history-table { width:100%; border-collapse:collapse; min-width:850px; }
  .am-history-table th { padding:9px; border-bottom:1px solid rgba(184,160,130,.25); background:#EFEAE0; color:#6B1E2D; font-size:10.5px; white-space:nowrap; }
  .am-history-table td { padding:9px; border-bottom:1px solid rgba(26,26,26,.05); text-align:center; font-size:11px; }
  .am-history-table time { color:#655B53; font-weight:700; white-space:nowrap; }
  .am-history-scores { display:flex; justify-content:center; gap:3px; flex-wrap:wrap; min-width:190px; }
  .am-history-scores span { min-width:23px; border:1px solid; border-radius:6px; background:#FFFBF5; padding:2px 4px; color:#32101A; font:800 10px ui-monospace,monospace; }
  .am-history-scores.after span { background:#F7F3EB; }
  .am-history-pages { display:flex; justify-content:center; align-items:center; gap:10px; margin-top:10px; }
  .am-history-pages button { display:grid; place-items:center; width:32px; height:32px; border:1px solid rgba(184,160,130,.3); border-radius:10px; background:#FFF; color:#6B1E2D; cursor:pointer; }
  .am-history-pages button:disabled { opacity:.4; cursor:not-allowed; }
  .am-history-pages span { color:#655B53; font-size:11px; font-weight:800; }

  .am-table-wrap { overflow-x:auto; border:1px solid rgba(184,160,130,.18); border-radius:14px; background:#FFFBF5; }
  .am-table, .am-matrix { width:100%; border-collapse:collapse; }
  .am-table th, .am-matrix th { background:rgba(184,160,130,.10); color:#6B1E2D; font-size:10.5px; font-weight:800; padding:9px 8px; text-align:center; letter-spacing:.03em; border-bottom:1px solid rgba(184,160,130,.26); white-space:nowrap; }
  .am-table th:first-child, .am-matrix th:first-child { text-align:start; padding-inline-start:14px; min-width:160px; }
  .am-corner { font-size:9.5px !important; }
  .am-table td, .am-matrix td { padding:9px 8px; font-size:12px; text-align:center; border-bottom:1px solid rgba(26,26,26,.05); font-family:ui-monospace,monospace; font-weight:700; }
  .am-name-cell { font-family:'Cairo',sans-serif !important; font-weight:700 !important; text-align:start !important; padding-inline-start:14px !important; color:#1A1A1A; background:rgba(184,160,130,.04); }
  .am-empty-cell { color:#C9BFAF !important; }
  .am-self-cell { background:rgba(107,30,45,.04); }
  .am-cell-scores { display:flex; gap:3px; justify-content:center; flex-wrap:wrap; }
  .am-score { padding:1px 5px; border-radius:5px; background:rgba(26,26,26,.05); color:#4A0E1C; font-size:10.5px; min-width:22px; }
  .am-score-core { background:rgba(107,30,45,.18); color:#6B1E2D; }
  .am-score-coll { background:rgba(184,160,130,.28); color:#8F765B; }

  .am-overlay { position:fixed; inset:0; isolation:isolate; background:rgba(26,17,14,.72); display:flex; align-items:center; justify-content:center; z-index:2147483000; padding:clamp(16px,2.4vw,32px); backdrop-filter:blur(12px); overscroll-behavior:contain; }
  .am-dlg { display:flex; flex-direction:column; background:linear-gradient(165deg,#FFFBF5,#F7F3EB); border:1.5px solid rgba(184,160,130,.4); border-radius:24px; width:min(1120px,100%); max-height:calc(100dvh - clamp(32px,4.8vw,64px)); overflow:hidden; box-shadow:0 32px 90px rgba(18,5,9,.46); }
  .am-dlg-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; padding:20px 24px; color:#FFFBF5; background:radial-gradient(circle at 85% 0%,rgba(184,160,130,.2),transparent 34%),linear-gradient(130deg,#250B12,#5B1526); }
  .am-dlg-head>div>span { display:flex; align-items:center; gap:7px; color:#D9C9B0; font-size:10px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; }
  .am-dlg-head p { margin:5px 0 0; color:rgba(255,251,245,.66); font-size:10.5px; font-weight:700; }
  .am-dlg-head>button { width:38px; height:38px; display:grid; place-items:center; flex:none; border:1px solid rgba(255,255,255,.16); border-radius:12px; background:rgba(255,255,255,.07); color:#fff; cursor:pointer; }
  .am-dlg-steps { display:grid; grid-template-columns:auto minmax(28px,1fr) auto minmax(28px,1fr) auto; align-items:center; gap:10px; padding:12px 24px; border-bottom:1px solid rgba(107,30,45,.10); background:#FFFDF9; }
  .am-dlg-steps span { display:inline-flex; align-items:center; gap:7px; color:#8F765B; font-size:10.5px; font-weight:900; white-space:nowrap; }
  .am-dlg-steps span b { width:24px; height:24px; display:grid; place-items:center; border-radius:8px; background:#EFEAE0; color:#6B1E2D; font:900 10px ui-monospace,monospace; }
  .am-dlg-steps span.done { color:#32101A; }.am-dlg-steps span.done b { background:#6B1E2D; color:#FFFBF5; }
  .am-dlg-steps i { height:1px; background:linear-gradient(90deg,rgba(107,30,45,.08),rgba(107,30,45,.28),rgba(107,30,45,.08)); }
  .am-dlg-body { min-height:0; overflow-y:auto; padding:20px 24px 28px; scroll-behavior:smooth; overscroll-behavior:contain; scrollbar-gutter:stable; }
  .am-dlg-body::-webkit-scrollbar { width:9px; }.am-dlg-body::-webkit-scrollbar-track { background:#EFEAE0; }.am-dlg-body::-webkit-scrollbar-thumb { border:2px solid #EFEAE0; border-radius:999px; background:#8F765B; }
  .am-dlg-title { font-family:var(--font-head); font-size:18px; font-weight:700; color:#FFFBF5; margin:5px 0 0; }
  .am-form-section { display:grid; grid-template-columns:34px minmax(0,1fr); gap:12px; align-items:start; padding:16px; border:1px solid rgba(184,160,130,.22); border-radius:17px; background:rgba(255,255,255,.64); }
  .am-form-section+.am-form-section { margin-top:12px; }
  .am-form-number { width:30px; height:30px; display:grid; place-items:center; border-radius:10px; background:#32101A; color:#D9C9B0; font:900 12px ui-monospace,monospace; }
  .am-form-content { min-width:0; }
  .am-dlg-lbl { display:block; font-size:11.5px; font-weight:800; color:#6B1E2D; margin:10px 0 5px; }
  .am-dlg-hint { margin:2px 0 0; font-size:11px; color:#8F765B; font-weight:600; line-height:1.6; max-width:440px; }
  .am-dlg-input { width:100%; padding:10px 13px; border:1.5px solid rgba(184,160,130,.32); border-radius:11px; font-family:inherit; font-size:13px; background:#FFF; outline:none; }
  .am-dlg-input:focus { border-color:#B8A082; }
  .am-dlg-note { margin:12px 0 0; padding:12px 14px; border-radius:12px; background:rgba(184,160,130,.10); border:1px dashed rgba(184,160,130,.35); color:#4A0E1C; font-size:12.5px; font-weight:600; line-height:1.75; }
  .am-dlg-section-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-top:16px; }
  .am-dlg-linkbtn { display:inline-flex; align-items:center; gap:5px; background:none; border:1px solid rgba(184,160,130,.30); border-radius:999px; padding:5px 12px; color:#6B1E2D; font:700 11px 'Cairo',sans-serif; cursor:pointer; white-space:nowrap; transition:background .16s ease; }
  .am-dlg-linkbtn:hover { background:rgba(184,160,130,.10); }
  .am-dlg-err { margin:12px 0 0; padding:10px 13px; border-radius:11px; background:rgba(107,30,45,.08); border:1px solid rgba(107,30,45,.24); color:#6B1E2D; font-size:12.5px; font-weight:700; }
  .am-dlg-warn { margin:8px 0 0; font-size:12px; font-weight:700; color:#8F765B; }
  .am-dlg-actions { position:relative; z-index:3; display:flex; gap:9px; justify-content:flex-end; padding:14px 24px; border-top:1px solid rgba(184,160,130,.22); background:rgba(255,251,245,.96); box-shadow:0 -12px 30px rgba(50,16,26,.08); backdrop-filter:blur(14px); }
  .am-dlg-actions .am-btn { min-width:112px; min-height:42px; justify-content:center; }
  .am-dlg-actions .am-btn.am-btn-primary { background:linear-gradient(180deg,#6B1E2D,#32101A); border-color:#32101A; color:#FFF8EA; box-shadow:0 9px 20px rgba(50,16,26,.20); }
  .am-dlg-actions .am-btn.am-btn-primary:disabled { background:#D9C9B0; border-color:#D9C9B0; color:#655B53; box-shadow:none; opacity:1; }
  .am-scope-label { display:block; margin:14px 0 7px; color:#6B1E2D; font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
  .am-scope-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
  .am-scope-grid>button { display:flex; align-items:flex-start; gap:10px; border:1.5px solid rgba(184,160,130,.26); border-radius:14px; background:#FFF; padding:12px; color:#796A62; text-align:start; font-family:inherit; cursor:pointer; transition:.16s ease; }
  .am-scope-grid>button.active { border-color:#6B1E2D; background:rgba(107,30,45,.055); color:#6B1E2D; box-shadow:0 0 0 3px rgba(107,30,45,.06); }
  .am-scope-grid>button svg { flex:none; margin-top:2px; }
  .am-scope-grid>button span { min-width:0; }
  .am-scope-grid strong,.am-scope-grid small { display:block; }
  .am-scope-grid strong { color:#32101A; font-size:12px; }
  .am-scope-grid small { margin-top:3px; color:#796A62; font-size:10px; line-height:1.55; font-weight:700; }
  .am-trait-total { flex:none; border-radius:999px; background:rgba(107,30,45,.08); padding:5px 9px; color:#6B1E2D; font-size:10px; font-weight:900; }

  .am-group-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:8px; }
  .am-group-chk { display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:12px; border:1.5px solid rgba(184,160,130,.26); background:#FFF; cursor:pointer; transition:all .16s ease; }
  .am-group-chk.checked { border-color:rgba(107,30,45,.4); background:rgba(107,30,45,.05); }
  .am-group-chk input { accent-color:#6B1E2D; }
  .am-group-chk span { flex:1; font-size:12.5px; font-weight:700; color:#1A1A1A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-group-chk em { font-style:normal; font-size:10.5px; color:#8F765B; font-weight:700; }

  .am-trait-editor { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
  .am-trait-row { border:1.5px solid rgba(184,160,130,.26); border-radius:15px; padding:11px; background:#FFF; display:flex; flex-direction:column; gap:8px; box-shadow:0 5px 15px rgba(50,16,26,.03); transition:border-color .18s ease,box-shadow .18s ease; }
  .am-trait-row.expanded { border-color:rgba(107,30,45,.34); box-shadow:0 10px 24px rgba(50,16,26,.07); }
  .am-trait-row-head { display:flex; align-items:center; gap:8px; }
  .am-trait-index { width:27px; height:27px; display:grid; place-items:center; flex:none; border-radius:8px; background:#32101A; color:#D9C9B0; font:900 10px ui-monospace,monospace; }
  .am-trait-color { width:30px; height:30px; border-radius:8px; border:1.5px solid rgba(184,160,130,.3); padding:2px; cursor:pointer; flex-shrink:0; }
  .am-trait-input { border:1.5px solid rgba(184,160,130,.26); border-radius:9px; padding:7px 10px; font-family:'Cairo',sans-serif; font-size:12.5px; background:#FBF8F1; outline:none; transition:border-color .16s ease; }
  .am-trait-input:focus { border-color:#B8A082; background:#FFF; }
  .am-trait-label { flex:1; min-width:0; }
  .am-trait-statement { resize:vertical; min-height:44px; line-height:1.5; }
  .am-trait-statements { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
  .am-trait-meta { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
  .am-trait-details { display:grid; gap:8px; padding:10px; border-radius:12px; background:#F7F3EB; animation:am-rise .2s ease both; }
  .am-trait-expand { display:inline-flex; align-items:center; justify-content:center; gap:5px; min-height:30px; flex:none; border:1px solid rgba(107,30,45,.16); border-radius:9px; background:#F7F3EB; padding:0 9px; color:#6B1E2D; font:800 9.5px 'Cairo',sans-serif; cursor:pointer; }
  .am-trait-expand svg { transition:transform .18s ease; }.am-trait-expand[aria-expanded="true"] svg { transform:rotate(180deg); }
  .am-trait-remove { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:8px; background:rgba(107,30,45,.06); border:1px solid rgba(107,30,45,.20); color:#6B1E2D; cursor:pointer; flex-shrink:0; transition:background .16s ease; }
  .am-trait-remove:hover { background:rgba(107,30,45,.14); }
  .am-add-trait { align-self:flex-start; display:inline-flex; align-items:center; gap:6px; background:rgba(184,160,130,.10); border:1px dashed rgba(184,160,130,.4); border-radius:11px; padding:8px 16px; color:#6B1E2D; font:700 12px 'Cairo',sans-serif; cursor:pointer; transition:background .16s ease; }
  .am-add-trait:hover { background:rgba(184,160,130,.18); }

  /* ── Hidden PDF export sheet ── */
  .am-export-mount { position:fixed; inset-inline-start:-9999px; top:0; z-index:-1; }
  .am-export-sheet { width:760px; padding:34px; background:#FBF7EF; font-family:'Cairo',sans-serif; direction:rtl; }
  .am-export-head { display:flex; align-items:center; gap:16px; padding-bottom:18px; margin-bottom:20px; border-bottom:2px solid #B8A082; }
  .am-export-mark { width:44px; height:44px; border-radius:12px; background:linear-gradient(150deg,#4A0E1C,#32101A); flex-shrink:0; }
  .am-export-eyebrow { font-size:10px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:#8F765B; }
  .am-export-title { font-family:'Noto Kufi Arabic','Cairo',sans-serif; font-size:20px; font-weight:700; color:#32101A; margin-top:3px; }
  .am-export-sub { font-size:12px; font-weight:700; color:#655B53; margin-top:4px; }
  .am-export-status { margin-inline-start:auto; padding:5px 14px; border-radius:999px; font-size:11px; font-weight:800; }
  .am-export-status-OPEN { background:rgba(27,94,32,.12); color:#1B5E20; }
  .am-export-status-CLOSED { background:rgba(184,160,130,.2); color:#8F765B; }
  .am-export-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
  .am-export-card { border:1px solid rgba(184,160,130,.35); border-radius:14px; padding:13px 14px; background:#FFFFFF; }
  .am-export-card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  .am-export-card-head-main { display:flex; align-items:center; gap:6px; min-width:0; }
  .am-export-swatch { width:12px; height:12px; border-radius:4px; flex-shrink:0; border:1px solid rgba(26,26,26,0.15); }
  .am-export-card-head strong { font-family:'Noto Kufi Arabic','Cairo',sans-serif; font-size:13px; font-weight:700; color:#1A1A1A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-export-card-head span { font-size:10.5px; color:#8F765B; font-weight:700; }
  .am-export-noresult { font-size:11.5px; color:#8C8274; font-weight:700; padding:8px 0; }
  .am-export-row { display:grid; grid-template-columns:58px 1fr 30px; align-items:center; gap:6px; margin-bottom:4px; }
  .am-export-row span { font-size:10px; font-weight:700; color:#4A0E1C; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-export-trait-core { color:#6B1E2D !important; font-weight:800 !important; }
  .am-export-track { height:6px; background:rgba(184,160,130,.18); border-radius:99px; overflow:hidden; }
  .am-export-fill { height:100%; border-radius:99px; }
  .am-export-row b { font-size:10.5px; color:#1A1A1A; text-align:center; }
  .am-export-footer { margin-top:8px; padding-top:7px; border-top:1px dashed rgba(184,160,130,.35); font-size:10.5px; font-weight:700; color:#6B1E2D; }

  @media (max-width:700px) {
    .am-hero { grid-template-columns:1fr; padding:20px; border-radius:20px; }
    .am-hero h1 { font-size:23px; }
    .am-hero-metrics { width:100%; grid-template-columns:repeat(2,minmax(0,1fr)); }
    .am-detail { padding:16px; }
    .am-createbar { align-items:stretch; flex-direction:column; }
    .am-create { justify-content:center; }
    .am-agg-grid { grid-template-columns:minmax(0,1fr); }
    .am-group-grid { grid-template-columns:1fr; }
    .am-overlay { padding:0; }
    .am-dlg { max-height:100dvh; height:100dvh; border:0; border-radius:0; }
    .am-dlg-head,.am-dlg-body,.am-dlg-actions,.am-dlg-steps { padding-inline:15px; }
    .am-dlg-steps span { font-size:0; gap:0; }.am-dlg-steps span b { font-size:10px; }
    .am-form-section { grid-template-columns:1fr; padding:13px; }
    .am-scope-grid,.am-trait-statements,.am-trait-meta { grid-template-columns:1fr; }
    .am-history-head { flex-direction:column; }
    .am-trait-row-head { flex-wrap:wrap; }
    .am-trait-label { flex-basis:calc(50% - 48px); }
    .am-trait-expand { order:5; flex:1; }
  }

  /* Assessment workspace polish: stronger contrast and clearer hierarchy. */
  .am-page { gap:18px; }
  .am-hero { min-height:196px; grid-template-columns:minmax(0,1.25fr) auto; }
  .am-hero h1 { letter-spacing:-.02em; }
  .am-hero-metrics { align-self:stretch; align-items:end; }
  .am-metric { background:rgba(26,10,16,.52); border-color:rgba(217,201,176,.38); }
  .am-metric strong { color:#F2D9A7; }
  .am-metric span { color:rgba(255,251,245,.82); }
  .am-createbar { background:linear-gradient(115deg,#FBF8F1,#EFEAE0); border-color:rgba(107,30,45,.18); }
  .am-createbar-copy span { color:#32101A; }
  .am-create { color:#FFF8EA; box-shadow:0 9px 20px rgba(50,16,26,.18); }
  .am-filters { background:#FBF8F1; border-color:rgba(107,30,45,.18); box-shadow:0 12px 28px rgba(50,16,26,.06); }
  .am-filters-head { color:#32101A; }
  .am-filter > span { color:#6B1E2D; }
  .am-filter select, .am-search-box { background:#FFFDF9; border-color:rgba(107,30,45,.20); }
  .am-filter select:hover, .am-search-box:focus-within { border-color:rgba(107,30,45,.48); }
  .am-layout { grid-template-columns:318px minmax(0,1fr); gap:18px; }
  .am-side, .am-detail { background:#FBF8F1; border-color:rgba(107,30,45,.18); box-shadow:0 14px 30px rgba(50,16,26,.055); }
  .am-side { padding:12px; }
  .am-side:before { content:'MODELS'; display:block; margin:2px 8px 10px; color:#8F765B; font:900 10px ui-monospace,Consolas,monospace; letter-spacing:.16em; }
  [dir="rtl"] .am-side:before { content:'النماذج'; font-family:'Cairo',sans-serif; letter-spacing:0; text-align:right; }
  .am-list { gap:7px; }
  .am-list-item { padding:14px; border-color:rgba(107,30,45,.08); background:rgba(255,255,255,.24); }
  .am-list-item:hover { background:#F3EDE3; border-color:rgba(184,160,130,.52); }
  .am-list-item.active { background:linear-gradient(135deg,#F7F0E5,#EFE2D1); border-color:#B8A082; box-shadow:inset 4px 0 0 #6B1E2D, 0 8px 18px rgba(50,16,26,.08); }
  [dir="rtl"] .am-list-item.active { box-shadow:inset -4px 0 0 #6B1E2D, 0 8px 18px rgba(50,16,26,.08); }
  .am-list-title { color:#32101A; font-size:13.5px; }
  .am-detail { padding:24px; }
  .am-detail-head { padding-bottom:18px; margin-bottom:20px; border-bottom-color:rgba(107,30,45,.16); }
  .am-detail-title { color:#32101A; font-size:20px; }
  .am-detail-meta { color:#6B1E2D; }
  .am-btn { background:#FFFDF9; border-color:rgba(107,30,45,.22); color:#4A0E1C; }
  .am-btn:hover:not(:disabled) { border-color:#6B1E2D; background:#F7F0E5; }
  .am-btn-primary { color:#FFF8EA; }
  .am-detail-filters { padding:13px; border:1px solid rgba(107,30,45,.14); border-radius:16px; background:linear-gradient(135deg,#F5EEE4,#EDE3D6); box-shadow:inset 0 1px rgba(255,255,255,.9),0 9px 20px rgba(50,16,26,.045); }
  .am-search-box--detail { width:min(100%,310px); background:#FFFDF9; box-shadow:0 4px 12px rgba(50,16,26,.04); }
  .am-member-group-filter { background:#FFFDF9; box-shadow:0 4px 12px rgba(50,16,26,.04); }
  .am-trait-chip { background:#FFFDF9; border-color:rgba(107,30,45,.20); color:#4A0E1C; }
  .am-trait-chip.active:not([style]) { background:#6B1E2D; color:#FFF8EA; }
  .am-sub { margin-top:24px; }
  .am-sub-head { padding-bottom:9px; border-bottom:1px solid rgba(184,160,130,.28); }
  .am-sub-head h3 { color:#32101A; font-size:15px; }
  .am-agg { background:linear-gradient(150deg,#FFFDF9,#F5EEE4); border-color:rgba(107,30,45,.16); box-shadow:0 10px 22px rgba(50,16,26,.055); }
  .am-agg-name { color:#32101A; }
  .am-table-wrap { background:#FFFDF9; border-color:rgba(107,30,45,.16); }
  .am-table th, .am-matrix th { background:#EFE2D1; color:#4A0E1C; border-bottom-color:rgba(107,30,45,.18); }
  .am-name-cell { background:#F7F0E5; color:#32101A; }

  /* Progressive disclosure workspace */
  .am-delete-icon { display:grid; place-items:center; width:38px; height:38px; flex:none; border:1px solid rgba(107,30,45,.22); border-radius:11px; background:#FFFDF9; color:#6B1E2D; cursor:pointer; transition:background .18s ease, color .18s ease, transform .18s ease, box-shadow .18s ease; }
  .am-delete-icon:hover { background:#6B1E2D; color:#FFF; transform:translateY(-1px); box-shadow:0 8px 18px rgba(107,30,45,.2); }
  .am-spectrum-card { min-width:0; overflow:hidden; border:1px solid rgba(107,30,45,.15); border-radius:22px; background:#FFFDF9; padding:15px; box-shadow:0 10px 25px rgba(50,16,26,.055); transition:border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
  .am-spectrum-card:hover { border-color:rgba(107,30,45,.28); box-shadow:0 16px 34px rgba(50,16,26,.09); transform:translateY(-1px); }
  .am-spectrum-card.overall { border-color:rgba(107,30,45,.30); box-shadow:inset 0 3px 0 #6B1E2D,0 14px 30px rgba(50,16,26,.07); }
  .am-spectrum-card.expanded { border-color:rgba(107,30,45,.38); }
  .am-spectrum-card-head { display:flex; align-items:center; gap:9px; margin:0 2px 10px; }
  .am-spectrum-card-head>span { display:grid; place-items:center; width:31px; height:31px; flex:none; border-radius:10px; background:#EFE7DC; color:#6B1E2D; }
  .am-spectrum-card-head>strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#32101A; font-family:var(--font-head); font-size:14px; }
  .am-member-card .am-spectrum-card-head>strong { flex:1; }
  .am-member-status { flex:none; border:1px solid; border-radius:999px; padding:4px 8px; font-size:9px; font-style:normal; font-weight:900; white-space:nowrap; }
  .am-member-status.is-done { border-color:rgba(27,94,32,.18); background:rgba(27,94,32,.08); color:#1B5E20; }
  .am-member-status.is-pending { border-color:rgba(184,160,130,.32); background:rgba(184,160,130,.12); color:#8F765B; }
  .am-card-toggle { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:10px; border:1px solid rgba(107,30,45,.18); border-radius:12px; background:#F5EEE4; padding:9px 14px; color:#6B1E2D; font:800 11.5px 'Cairo',sans-serif; cursor:pointer; transition:background .18s ease,border-color .18s ease; }
  .am-card-toggle:hover { background:#EDE2D4; border-color:rgba(107,30,45,.32); }
  .am-card-toggle svg:last-child { margin-inline-start:auto; transition:transform .2s ease; }
  .rotated { transform:rotate(180deg); }
  .am-card-details { margin-top:12px; border-top:1px solid rgba(107,30,45,.12); padding-top:13px; animation:am-fadeUp .22s ease both; }
  .am-insight-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
  .am-insight-grid>div { min-width:0; border:1px solid rgba(107,30,45,.10); border-radius:13px; background:#F7F0E7; padding:10px; }
  .am-insight-grid strong,.am-insight-grid span { display:block; }
  .am-insight-grid strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#32101A; font-size:13px; }
  .am-insight-grid span { margin-top:3px; color:#796A62; font-size:9.5px; font-weight:800; }
  .am-detail-progress { height:7px; margin:10px 0; overflow:hidden; border-radius:999px; background:#DED1BE; }
  .am-detail-progress>span { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#B8A082,#6B1E2D); }
  .am-trait-breakdown { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; margin-top:10px; }
  .am-trait-breakdown>div { display:grid; grid-template-columns:12px minmax(0,1fr) auto; gap:7px; align-items:center; border:1px solid rgba(107,30,45,.09); border-radius:11px; background:#FFF; padding:8px 9px; }
  .am-trait-breakdown i { width:11px; height:11px; border-radius:4px; box-shadow:0 0 0 1px rgba(26,26,26,.15); }
  .am-trait-breakdown>div>span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#32101A; font-size:10.5px; font-weight:800; }
  .am-trait-breakdown b { color:#6B1E2D; font:900 10.5px ui-monospace,Consolas,monospace; }
  .am-trait-breakdown em { grid-column:2 / -1; height:5px; overflow:hidden; border-radius:999px; background:#E7DCCB; }
  .am-trait-breakdown em span { display:block; height:100%; border-radius:inherit; }
  .am-member-identity { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
  .am-member-identity>div { display:flex; align-items:center; gap:6px; min-width:0; color:#655B53; font-size:10.5px; font-weight:700; }
  .am-member-identity>div span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-received-pill { flex:none; border:1px solid rgba(27,94,32,.15); border-radius:999px; background:rgba(27,94,32,.07); padding:4px 9px; color:#1B5E20; font-size:9.5px; font-weight:900; }
  .am-received-pill.is-pending { border-color:rgba(184,160,130,.3); background:rgba(184,160,130,.12); color:#8F765B; }
  .am-activity { margin-top:12px; overflow:hidden; border:1px solid rgba(107,30,45,.12); border-radius:14px; background:#FFF; }
  .am-activity-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border-bottom:1px solid rgba(107,30,45,.10); background:#F3EADF; }
  .am-activity-head>span { display:flex; align-items:center; gap:6px; color:#4A0E1C; font-size:10.5px; font-weight:900; }
  .am-activity-head>b { min-width:24px; border-radius:999px; background:#6B1E2D; padding:2px 7px; color:#FFF; text-align:center; font:900 9.5px ui-monospace,monospace; }
  .am-activity-scroll { max-height:340px; overflow:auto; }
  .am-activity table { width:100%; min-width:720px; border-collapse:collapse; }
  .am-activity th { position:sticky; top:0; z-index:1; background:#F7F0E7; padding:8px 9px; color:#6B1E2D; text-align:start; font-size:9.5px; white-space:nowrap; }
  .am-activity td { padding:8px 9px; border-top:1px solid rgba(26,26,26,.05); color:#32101A; font-size:10.5px; vertical-align:middle; }
  .am-person-cell,.am-activity time { display:inline-flex; align-items:center; gap:5px; white-space:nowrap; font-weight:700; }
  .am-activity time { color:#655B53; font-size:9.5px; }
  .am-rating-scores { display:flex; gap:4px; flex-wrap:wrap; min-width:210px; }
  .am-rating-scores span { display:inline-flex; align-items:center; gap:3px; min-width:31px; border:1px solid; border-radius:7px; background:#FFFDF9; padding:2px 5px; font:900 9.5px ui-monospace,Consolas,monospace; }
  .am-rating-scores i { width:5px; height:13px; border-radius:3px; }
  .am-analysis-section { border:1px solid rgba(107,30,45,.13); border-radius:18px; background:#F7F0E7; padding:12px; }
  .am-analysis-toggle { width:100%; display:flex; align-items:center; gap:10px; border:0; border-radius:13px; background:#FFFDF9; padding:12px 14px; color:#6B1E2D; text-align:start; font-family:'Cairo',sans-serif; cursor:pointer; box-shadow:0 5px 14px rgba(50,16,26,.04); }
  .am-analysis-toggle>span { flex:1; min-width:0; }
  .am-analysis-toggle strong,.am-analysis-toggle small { display:block; }
  .am-analysis-toggle strong { font-size:12.5px; }
  .am-analysis-toggle small { margin-top:2px; color:#796A62; font-size:9.5px; font-weight:700; }
  .am-analysis-toggle>svg:last-child { transition:transform .2s ease; }
  .am-analysis-head { margin-top:16px; }

  /* Destructive action confirmation */
  .am-delete-dlg { width:min(100%,520px); border:1px solid rgba(107,30,45,.28); border-radius:22px; background:#FFFDF9; padding:0; overflow:hidden; box-shadow:0 34px 90px rgba(50,16,26,.42); }
  .am-delete-dlg>header { display:flex; align-items:flex-start; gap:12px; padding:19px 20px; background:linear-gradient(135deg,#3A0C17,#6B1E2D); color:#FFF; }
  .am-delete-shield { display:grid; place-items:center; width:42px; height:42px; flex:none; border:1px solid rgba(255,255,255,.2); border-radius:13px; background:rgba(255,255,255,.08); color:#F2D9A7; }
  .am-delete-dlg>header>div { flex:1; min-width:0; }
  .am-delete-dlg h3 { margin:0; font-family:var(--font-head); font-size:15px; }
  .am-delete-dlg header p { margin:5px 0 0; color:rgba(255,255,255,.74); font-size:10.5px; font-weight:700; line-height:1.7; }
  .am-delete-dlg>header>button { display:grid; place-items:center; width:34px; height:34px; flex:none; border:1px solid rgba(255,255,255,.16); border-radius:10px; background:rgba(255,255,255,.06); color:#FFF; cursor:pointer; }
  .am-delete-target { display:flex; align-items:center; gap:8px; margin:16px 18px 5px; border:1px solid rgba(107,30,45,.13); border-radius:11px; background:#F7EDEB; padding:9px 11px; color:#6B1E2D; font-size:11px; font-weight:900; }
  .am-delete-target span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-secure-field { display:block; margin:12px 18px 0; }
  .am-secure-field>span { display:flex; align-items:center; gap:6px; margin-bottom:5px; color:#4A0E1C; font-size:10.5px; font-weight:900; }
  .am-secure-field input { width:100%; height:43px; border:1.5px solid rgba(107,30,45,.18); border-radius:11px; background:#FFF; padding:0 12px; color:#32101A; font:700 12px 'Cairo',sans-serif; outline:none; }
  .am-secure-field input:focus { border-color:#6B1E2D; box-shadow:0 0 0 4px rgba(107,30,45,.07); }
  .am-delete-error { margin:10px 18px 0; border:1px solid rgba(107,30,45,.18); border-radius:10px; background:rgba(107,30,45,.07); padding:8px 10px; color:#6B1E2D; font-size:10.5px; font-weight:800; }
  .am-delete-dlg>footer { display:flex; justify-content:flex-end; gap:8px; margin-top:17px; border-top:1px solid rgba(107,30,45,.11); background:#F7F0E7; padding:13px 18px; }
  .am-delete-confirm { display:inline-flex; align-items:center; gap:6px; border:0; border-radius:11px; background:#6B1E2D; padding:9px 14px; color:#FFF; font:900 11px 'Cairo',sans-serif; cursor:pointer; }
  .am-delete-confirm:disabled { opacity:.45; cursor:not-allowed; }

  .am-collective-grid { grid-template-columns:minmax(0,1fr); }
  .am-agg-grid { display:flex; flex-wrap:wrap; }
  .am-member-card { flex:1 1 480px; }

  @media (min-width:1001px) {
    .am-layout { display:flex; flex-direction:column; gap:14px; }
    .am-side { width:100%; min-height:0; }
    .am-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:8px; }
  }
  @media (max-width:1000px) { .am-layout { grid-template-columns:minmax(0,1fr); } }
  @media (max-width:700px) {
    .am-hero { grid-template-columns:1fr; min-height:auto; }
    .am-hero-metrics { width:100%; grid-template-columns:repeat(2,minmax(0,1fr)); }
    .am-detail { padding:16px; }
    .am-detail-filters { align-items:stretch; }
    .am-search-box--detail,.am-member-group-filter { width:100%; max-width:none; }
    .am-trait-chips { width:100%; }
    .am-member-filter-count { margin-inline-start:0; align-self:flex-start; }
    .am-side:before { margin-inline:4px; }
    .am-collective,.am-spectrum-card { padding:11px; }
    .am-collective-grid,.am-agg-grid { grid-template-columns:minmax(0,1fr); }
    .am-insight-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .am-trait-breakdown { grid-template-columns:1fr; }
    .am-member-identity { align-items:flex-start; flex-direction:column; }
    .am-delete-dlg { min-height:100dvh; border:0; border-radius:0; }
  }
`;
