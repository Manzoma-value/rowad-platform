// Shared options + bilingual labels for the teacher application form.
// One source of truth for: form rendering, server-side validation,
// admin detail display, and the printable PDF view.

export type Lang = "ar" | "sq";

export const APP_GENDERS = ["MALE", "FEMALE"] as const;
export type Gender = (typeof APP_GENDERS)[number];

export const APP_CURRENT_ROLES = [
  "TEACHER",
  "SUPERVISOR",
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "COUNSELOR",
  "TRAINER",
  "TEAM_LEAD",
  "RESEARCHER",
  "VOLUNTEER",
  "OTHER",
] as const;
export type CurrentRole = (typeof APP_CURRENT_ROLES)[number];

export const APP_QUALIFICATIONS = [
  "DIPLOMA",
  "BACHELOR",
  "HIGHER_DIPLOMA",
  "MASTER",
  "PHD",
] as const;
export type Qualification = (typeof APP_QUALIFICATIONS)[number];

export const APP_EXPERIENCE_RANGES = [
  "LT_3",
  "Y_3_5",
  "Y_6_10",
  "Y_11_15",
  "GT_15",
] as const;
export type ExperienceRange = (typeof APP_EXPERIENCE_RANGES)[number];

export const APP_ACHIEVEMENT_SCOPES = [
  "INSTITUTIONAL",
  "CITY",
  "COUNTRY",
  "REGIONAL",
  "INTERNATIONAL",
] as const;
export type AchievementScope = (typeof APP_ACHIEVEMENT_SCOPES)[number];

// Multi-select option codes (stored verbatim in the array columns)
export const APP_EXPERIENCE_AREAS = [
  "TEACHING",
  "EDUCATIONAL_SUPERVISION",
  "SCHOOL_LEADERSHIP",
  "TRAINING",
  "GUIDANCE",
  "YOUTH_WORK",
  "COMMUNITY_WORK",
  "PROJECT_MANAGEMENT",
  "CURRICULUM_DEVELOPMENT",
  "ASSESSMENT_AND_MEASUREMENT",
  "EDUCATIONAL_TECHNOLOGY",
  "SCIENTIFIC_RESEARCH",
  "OTHER",
] as const;

export const APP_TARGET_GROUPS = [
  "CHILDREN",
  "PRIMARY",
  "MIDDLE",
  "SECONDARY",
  "UNIVERSITY",
  "YOUTH",
  "TEACHERS",
  "SUPERVISORS",
  "EDUCATIONAL_LEADERS",
  "PARENTS",
  "COMMUNITY_INSTITUTIONS",
  "OTHER",
] as const;

export const APP_CONTRIBUTIONS = [
  "AUTHORED_BOOK",
  "PUBLISHED_RESEARCH",
  "TRAINING_KIT",
  "DESIGNED_PROGRAM",
  "DEVELOPED_CURRICULUM",
  "PREPARED_TOOLKIT",
  "DELIVERED_WORKSHOPS",
  "SUPERVISED_PROGRAMS",
  "DEVELOPMENT_COMMITTEES",
  "PRODUCED_DIGITAL_CONTENT",
  "NONE",
] as const;

export const APP_LANGUAGES = ["ar", "en", "sq", "tr", "other"] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const APP_LANG_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "MASTERED",
] as const;
export type LangLevel = (typeof APP_LANG_LEVELS)[number];

export const APP_ATTACHMENTS = [
  "CV",
  "ACHIEVEMENTS_FILE",
  "PUBLICATIONS_LIST",
  "PROGRAMS_LIST",
  "CERTIFICATES",
  "OTHER",
] as const;

// ──────────────────────────────────────────────────────────────────
// Bilingual labels — ar + sq for every code above
// ──────────────────────────────────────────────────────────────────

type L = { ar: string; sq: string };

export const GENDER_L: Record<Gender, L> = {
  MALE:   { ar: "ذكر",  sq: "Mashkull" },
  FEMALE: { ar: "أنثى", sq: "Femër" },
};

export const CURRENT_ROLE_L: Record<CurrentRole, L> = {
  TEACHER:        { ar: "معلم",          sq: "Mësues" },
  SUPERVISOR:     { ar: "مشرف تربوي",    sq: "Mbikëqyrës arsimor" },
  PRINCIPAL:      { ar: "مدير مدرسة",    sq: "Drejtor shkolle" },
  VICE_PRINCIPAL: { ar: "وكيل مدرسة",    sq: "Zëvendësdrejtor" },
  COUNSELOR:      { ar: "مرشد طلابي",    sq: "Këshilltar studentor" },
  TRAINER:        { ar: "مدرب",          sq: "Trajner" },
  TEAM_LEAD:      { ar: "قائد فريق",     sq: "Udhëheqës ekipi" },
  RESEARCHER:     { ar: "باحث",          sq: "Studiues" },
  VOLUNTEER:      { ar: "متطوع",         sq: "Vullnetar" },
  OTHER:          { ar: "أخرى",          sq: "Tjetër" },
};

export const QUALIFICATION_L: Record<Qualification, L> = {
  DIPLOMA:        { ar: "دبلوم",         sq: "Diplomë" },
  BACHELOR:       { ar: "بكالوريوس",     sq: "Bachelor" },
  HIGHER_DIPLOMA: { ar: "دبلوم عالي",    sq: "Diplomë e lartë" },
  MASTER:         { ar: "ماجستير",       sq: "Master" },
  PHD:            { ar: "دكتوراه",       sq: "Doktoraturë" },
};

export const EXPERIENCE_RANGE_L: Record<ExperienceRange, L> = {
  LT_3:    { ar: "أقل من 3 سنوات",     sq: "Më pak se 3 vjet" },
  Y_3_5:   { ar: "من 3 إلى 5 سنوات",   sq: "3 deri në 5 vjet" },
  Y_6_10:  { ar: "من 6 إلى 10 سنوات",  sq: "6 deri në 10 vjet" },
  Y_11_15: { ar: "من 11 إلى 15 سنة",   sq: "11 deri në 15 vjet" },
  GT_15:   { ar: "أكثر من 15 سنة",     sq: "Më shumë se 15 vjet" },
};

export const ACHIEVEMENT_SCOPE_L: Record<AchievementScope, L> = {
  INSTITUTIONAL: { ar: "على مستوى مؤسسة أو مدرسة", sq: "Niveli institucional ose i shkollës" },
  CITY:          { ar: "على مستوى مدينة أو محافظة", sq: "Niveli i qytetit ose qarkut" },
  COUNTRY:       { ar: "على مستوى الدولة",           sq: "Niveli kombëtar" },
  REGIONAL:      { ar: "على المستوى الإقليمي",       sq: "Niveli rajonal" },
  INTERNATIONAL: { ar: "على المستوى الدولي",         sq: "Niveli ndërkombëtar" },
};

export const EXPERIENCE_AREA_L: Record<string, L> = {
  TEACHING:                  { ar: "التدريس",              sq: "Mësimdhënie" },
  EDUCATIONAL_SUPERVISION:   { ar: "الإشراف التربوي",      sq: "Mbikëqyrje arsimore" },
  SCHOOL_LEADERSHIP:         { ar: "القيادة المدرسية",     sq: "Lidership shkollor" },
  TRAINING:                  { ar: "التدريب",              sq: "Trajnim" },
  GUIDANCE:                  { ar: "الإرشاد",              sq: "Këshillim" },
  YOUTH_WORK:                { ar: "العمل الشبابي",        sq: "Punë me të rinjtë" },
  COMMUNITY_WORK:            { ar: "العمل المجتمعي",       sq: "Punë komunitare" },
  PROJECT_MANAGEMENT:        { ar: "إدارة المشاريع",       sq: "Menaxhim projektesh" },
  CURRICULUM_DEVELOPMENT:    { ar: "تطوير المناهج",        sq: "Zhvillim kurrikule" },
  ASSESSMENT_AND_MEASUREMENT:{ ar: "التقويم والقياس",      sq: "Vlerësim dhe matje" },
  EDUCATIONAL_TECHNOLOGY:    { ar: "التقنية التعليمية",    sq: "Teknologji arsimore" },
  SCIENTIFIC_RESEARCH:       { ar: "البحث العلمي",         sq: "Kërkim shkencor" },
  OTHER:                     { ar: "أخرى",                 sq: "Tjetër" },
};

export const TARGET_GROUP_L: Record<string, L> = {
  CHILDREN:               { ar: "الأطفال",                sq: "Fëmijët" },
  PRIMARY:                { ar: "طلاب المرحلة الابتدائية", sq: "Nxënësit e shkollës fillore" },
  MIDDLE:                 { ar: "طلاب المرحلة المتوسطة",  sq: "Nxënësit e shkollës 9-vjeçare" },
  SECONDARY:              { ar: "طلاب المرحلة الثانوية",  sq: "Nxënësit e shkollës së mesme" },
  UNIVERSITY:             { ar: "الطلاب الجامعيون",        sq: "Studentët universitarë" },
  YOUTH:                  { ar: "الشباب",                  sq: "Të rinjtë" },
  TEACHERS:               { ar: "المعلمون",                sq: "Mësuesit" },
  SUPERVISORS:            { ar: "المشرفون التربويون",      sq: "Mbikëqyrësit arsimorë" },
  EDUCATIONAL_LEADERS:    { ar: "القيادات التعليمية",      sq: "Udhëheqësit arsimorë" },
  PARENTS:                { ar: "أولياء الأمور",           sq: "Prindërit" },
  COMMUNITY_INSTITUTIONS: { ar: "المؤسسات المجتمعية",      sq: "Institucionet komunitare" },
  OTHER:                  { ar: "أخرى",                    sq: "Tjetër" },
};

export const CONTRIBUTION_L: Record<string, L> = {
  AUTHORED_BOOK:            { ar: "تأليف كتاب أو كتيب",        sq: "Autorësi libri ose broshure" },
  PUBLISHED_RESEARCH:       { ar: "نشر بحث أو دراسة",          sq: "Publikim kërkimi ose studimi" },
  TRAINING_KIT:             { ar: "إعداد حقيبة تدريبية",       sq: "Përgatitje pakete trajnimi" },
  DESIGNED_PROGRAM:         { ar: "تصميم برنامج أو مشروع",     sq: "Dizajnim programi ose projekti" },
  DEVELOPED_CURRICULUM:     { ar: "تطوير منهج أو محتوى تعليمي", sq: "Zhvillim kurrikule ose përmbajtjeje" },
  PREPARED_TOOLKIT:         { ar: "إعداد دليل أو أداة عمل",    sq: "Përgatitje udhëzuesi ose mjeti pune" },
  DELIVERED_WORKSHOPS:      { ar: "تقديم دورات أو ورش تدريبية", sq: "Mbajtje kursesh ose punëtorish" },
  SUPERVISED_PROGRAMS:      { ar: "الإشراف على برامج أو مشاريع", sq: "Mbikëqyrje programesh ose projektesh" },
  DEVELOPMENT_COMMITTEES:   { ar: "المشاركة في لجان أو فرق تطوير", sq: "Pjesëmarrje në komitete ose ekipe zhvillimi" },
  PRODUCED_DIGITAL_CONTENT: { ar: "إنتاج مواد رقمية تعليمية أو معرفية", sq: "Prodhim përmbajtjeje dixhitale arsimore" },
  NONE:                     { ar: "لا يوجد مما سبق",          sq: "Asnjë nga sa më sipër" },
};

export const LANGUAGE_L: Record<AppLanguage, L> = {
  ar:    { ar: "العربية",     sq: "Arabisht" },
  en:    { ar: "الإنجليزية",  sq: "Anglisht" },
  sq:    { ar: "الألبانية",   sq: "Shqip" },
  tr:    { ar: "التركية",     sq: "Turqisht" },
  other: { ar: "لغات أخرى",   sq: "Gjuhë tjetër" },
};

export const LANG_LEVEL_L: Record<LangLevel, L> = {
  BEGINNER:     { ar: "مبتدئ",  sq: "Fillestar" },
  INTERMEDIATE: { ar: "متوسط",  sq: "Mesatar" },
  ADVANCED:     { ar: "متقدم",  sq: "I avancuar" },
  MASTERED:     { ar: "متمكن",  sq: "Mjeshtëror" },
};

export const ATTACHMENT_L: Record<string, L> = {
  CV:                { ar: "السيرة الذاتية",            sq: "CV-ja" },
  ACHIEVEMENTS_FILE: { ar: "ملف الإنجازات",             sq: "Portofoli i arritjeve" },
  PUBLICATIONS_LIST: { ar: "قائمة المؤلفات والأبحاث",   sq: "Lista e publikimeve dhe kërkimeve" },
  PROGRAMS_LIST:     { ar: "قائمة البرامج والمشاريع",   sq: "Lista e programeve dhe projekteve" },
  CERTIFICATES:      { ar: "الشهادات والاعتمادات",       sq: "Certifikatat dhe akreditimet" },
  OTHER:             { ar: "أخرى",                       sq: "Tjetër" },
};

// ──────────────────────────────────────────────────────────────────
// Form-section labels (used by the form, admin detail, print view)
// ──────────────────────────────────────────────────────────────────

export const APP_UI = {
  ar: {
    pageTitle: "نموذج التقديم — المرحلة الأولى",
    pageSub:
      "املأ بيانات التقديم بدقة. سيتم مراجعة طلبك من قبل إدارة المدرسة قبل تفعيل حسابك كمعلم.",
    sectionPersonal: "البيانات الشخصية",
    sectionNomination: "جهة الترشيح",
    sectionCurrentRole: "الدور الحالي",
    sectionQualification: "المؤهل العلمي",
    sectionExperienceAreas: "مجالات الخبرة",
    sectionYearsOfExperience: "سنوات الخبرة",
    sectionTargetGroups: "الفئات التي لديك خبرة في العمل معها",
    sectionContributions: "المساهمات العلمية والمهنية",
    sectionAchievements: "الإنجازات والجوائز",
    sectionLanguages: "اللغات",
    sectionAttachments: "الملفات المهنية الاختيارية",
    fullName: "الاسم الكامل",
    age: "العمر",
    country: "الدولة",
    city: "المدينة",
    phone: "رقم الجوال",
    email: "البريد الإلكتروني",
    gender: "الجنس",
    nominatingEntity: "الجهة المرشحة",
    nominatorName: "اسم الشخص المرشح",
    nominatorRole: "صفة الشخص المرشح",
    currentRole: "ما الدور الذي تقوم به حاليًا؟",
    currentRoleOther: "حدد دورك",
    qualification: "أعلى مؤهل علمي",
    specialization: "التخصص",
    graduationInstitution: "جهة التخرج",
    experienceAreas: "اختر كل ما ينطبق (يمكن اختيار أكثر من خيار)",
    experienceAreasOther: "حدد المجال",
    yearsOfExperience: "اختر نطاق سنوات الخبرة",
    targetGroups: "اختر كل ما ينطبق (يمكن اختيار أكثر من خيار)",
    targetGroupsOther: "حدد الفئة",
    contributions: "هل سبق لك المساهمة في أي من الآتي؟",
    hasAchievements: "هل حصلت على إنجازات أو جوائز مهنية أو علمية؟",
    yes: "نعم",
    no: "لا",
    achievementsScope: "ما أعلى نطاق وصلت إليه هذه الإنجازات أو الجوائز؟",
    languages: "ما اللغات التي تجيدها؟ وما مستوى الإتقان لكل لغة؟",
    languagesOther: "اللغة الأخرى",
    attachments: "المرفقات المهنية",
    notes: "ملاحظات أو روابط إضافية",
    submitBtn: "إرسال الطلب",
    submitting: "جاري الإرسال…",
    requiredFields: "هناك حقول مطلوبة لم تُملأ بعد",
    serverError: "تعذر إرسال الطلب، حاول مرة أخرى",
    male: "ذكر",
    female: "أنثى",
    notSelected: "—",
  },
  sq: {
    pageTitle: "Formulari i aplikimit — Faza e parë",
    pageSub:
      "Plotëso me kujdes të dhënat e aplikimit. Administrata e shkollës do ta shqyrtojë kërkesën tënde para se llogaria të aktivizohet si mësues.",
    sectionPersonal: "Të dhënat personale",
    sectionNomination: "Pala që të ka rekomanduar",
    sectionCurrentRole: "Roli aktual",
    sectionQualification: "Kualifikimi akademik",
    sectionExperienceAreas: "Fushat e përvojës",
    sectionYearsOfExperience: "Vitet e përvojës",
    sectionTargetGroups: "Grupet me të cilat ke punuar",
    sectionContributions: "Kontribute akademike dhe profesionale",
    sectionAchievements: "Arritjet dhe çmimet",
    sectionLanguages: "Gjuhët",
    sectionAttachments: "Skedarët profesionalë opsionalë",
    fullName: "Emri i plotë",
    age: "Mosha",
    country: "Shteti",
    city: "Qyteti",
    phone: "Numri i telefonit",
    email: "E-mail",
    gender: "Gjinia",
    nominatingEntity: "Institucioni rekomandues",
    nominatorName: "Emri i personit rekomandues",
    nominatorRole: "Roli i personit rekomandues",
    currentRole: "Cili është roli yt aktualisht?",
    currentRoleOther: "Specifiko rolin",
    qualification: "Kualifikimi më i lartë",
    specialization: "Specializimi",
    graduationInstitution: "Institucioni i diplomimit",
    experienceAreas: "Zgjidh të gjitha që zbatohen (mund të zgjedhësh më shumë se një)",
    experienceAreasOther: "Specifiko fushën",
    yearsOfExperience: "Zgjidh diapazonin e viteve të përvojës",
    targetGroups: "Zgjidh të gjitha që zbatohen (mund të zgjedhësh më shumë se një)",
    targetGroupsOther: "Specifiko grupin",
    contributions: "A ke kontribuar në ndonjë nga këto?",
    hasAchievements: "A ke marrë arritje apo çmime profesionale ose akademike?",
    yes: "Po",
    no: "Jo",
    achievementsScope: "Cila është shtrirja më e lartë e këtyre arritjeve?",
    languages: "Cilat gjuhë i njeh dhe në çfarë niveli?",
    languagesOther: "Gjuhë tjetër",
    attachments: "Bashkëngjitjet profesionale",
    notes: "Shënime ose lidhje shtesë",
    submitBtn: "Dërgo aplikimin",
    submitting: "Po dërgohet…",
    requiredFields: "Disa fusha të detyrueshme nuk janë plotësuar",
    serverError: "Aplikimi nuk u dërgua, provo përsëri",
    male: "Mashkull",
    female: "Femër",
    notSelected: "—",
  },
} as const;

export type LangKnown = keyof typeof APP_UI;
export const pickLang = (l: string): LangKnown => (l === "sq" ? "sq" : "ar");

// Convenience picker for label dicts
export const pickL = (entry: L | undefined, lang: LangKnown) =>
  entry ? entry[lang] : "—";

// Shape of `languages` JSON column entries
export type AppLanguageEntry = { lang: AppLanguage; level: LangLevel };
