"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/language-context";

/* ─────────────────────────────────────────────────────────────────────
   Three mini-games for teachers — pure client state, no DB writes.

   1. Memory Match  — flip cards, match pairs (level↔number, maqsad↔meaning)
   2. Maqsad Hunter — pick the correct maqsad for a concept, 3 lives
   3. Speed Drill   — classify words: مقصد / مستوى, 60-second sprint
   ───────────────────────────────────────────────────────────────────── */

type Lang = "ar" | "sq" | "en";
type GameId = "hub" | "memory" | "hunter" | "speed" | "collector";

/* ─── Localized strings ──────────────────────────────────────────────── */
const STR = {
  ar: {
    title: "الألعاب التعليمية",
    sub: "تعلّم النموذج عن طريق اللعب — ثلاث ألعاب قصيرة، صفّر العداد ودرّب نفسك",
    playBtn: "ابدأ اللعب",
    backToHub: "كل الألعاب",
    restart: "إعادة",
    // Memory
    memTitle: "لعبة الذاكرة",
    memDesc: "اقلب الكروت وطابق المستوى مع رقمه والمقصد مع معناه. كلما قلّت محاولاتك زادت نجومك.",
    memMoves: "محاولات",
    memTime: "الوقت",
    memWin: "أحسنت!",
    memStars: (s: number) => `${s} ${s === 1 ? "نجمة" : "نجوم"}`,
    memPlayAgain: "العب مرة أخرى",
    // Hunter
    hunTitle: "صائد المقاصد",
    hunDesc: "بطاقة تظهر، عليك اختيار المقصد المناسب لها. 3 أخطاء وتخسر، 10 إجابات صحيحة وتفوز.",
    hunScore: "النقاط",
    hunLives: "محاولات",
    hunRound: "السؤال",
    hunCorrect: "ممتاز!",
    hunWrong: "خطأ",
    hunWin: "بطل المقاصد!",
    hunLose: "حاول مرة أخرى",
    hunWinSub: (s: number) => `أجبت 10 إجابات صحيحة بـ ${s} نقاط`,
    hunLoseSub: "نفدت محاولاتك. كل لحظة فرصة جديدة!",
    // Speed
    spdTitle: "تحدي السرعة",
    spdDesc: "كلمة تظهر، هل هي مقصد أم مستوى؟ ضغط سريع، سلسلة طويلة، 30 ثانية.",
    spdMaqsad: "مقصد",
    spdLevel: "مستوى",
    spdScore: "النقاط",
    spdCombo: "السلسلة",
    spdTimeLeft: "الوقت",
    spdGoodCombo: (n: number) => `سلسلة x${n} 🔥`,
    spdEnd: "انتهى الوقت",
    spdFinalScore: (n: number) => `نقاطك النهائية ${n}`,
    spdBestCombo: (n: number) => `أطول سلسلة ${n}`,
    // Collector
    colTitle: "جامع المقاصد",
    colDesc: "تحرّك بأسهم لوحة المفاتيح (أو الأزرار) واجمع العناصر المرتبطة بالمقصد المطلوب. 5 صحيحة وتفوز، 3 أخطاء وتخسر.",
    colTargetLabel: "اجمع عناصر",
    colCollectedLabel: "المجموع",
    colHintKeys: "حرّك بـ ← ↑ → ↓ أو WASD",
    colHintTouch: "حرّك بالأزرار",
    colWin: "جامع المقاصد! 🎉",
    colWinSub: "جمعت 5 عناصر صحيحة في الوقت المناسب",
    colLose: "لا بأس، حاول مرة أخرى",
    colLoseSub: "ركّز على العناصر المرتبطة بالمقصد المطلوب فقط",
    // Hint card — generic labels
    howToTitle: "كيفية اللعب",
    whatYouLearnTitle: "الفائدة التعليمية",
    hintToggle: "كيف ألعب؟",
    hintCloseLabel: "إخفاء التعليمات",
    // Per-game hints
    memHowTo:
      "اضغط على كارت لقلبه. أظهر كارتين متطابقتين في كل دور (مثل: «المستوى الأول» مع «الاتباع»، أو «الدين» مع «حفظ الإيمان»). إذا تطابقتا تبقيان مكشوفتين، وإلا تنقلبان من جديد.",
    memLearn:
      "تثبّت في ذاكرتك أسماء المستويات الخمسة وأرقامها، ومعاني المقاصد الأساسية، حتى تستحضر هيكل النموذج بسرعة بمجرد رؤية أي جزء منه.",
    hunHowTo:
      "تظهر بطاقة فيها مفهوم من الخمسة والعشرين مفهوماً. اختر بين الأزرار الخمسة المقصد الذي يخدمه هذا المفهوم. لك 3 محاولات، و10 إجابات صحيحة تعني الفوز.",
    hunLearn:
      "تدرّبك على الربط الفوري بين كل مفهوم ومقصده، فترسّخ المكان الصحيح للمفهوم في النموذج وتتعرّف على المنطق وراء كل تصنيف.",
    spdHowTo:
      "تظهر كلمة من قاموس النموذج. اضغط «مقصد» إذا كانت أحد المقاصد الخمسة، أو «مستوى» إذا كانت أحد المستويات الخمسة. 30 ثانية فقط، والسلسلة الطويلة تضاعف نقاطك.",
    spdLearn:
      "تختبر سرعتك في التمييز بين المقاصد والمستويات — الفئتين الأساسيتين اللتين يبنى عليهما النموذج كله — فتصبح هذه الأسماء بديهية لديك.",
    colHowTo:
      "تحرّك باللاعب باستخدام الأسهم على لوحة المفاتيح أو الأزرار. التقط فقط المفاهيم التي تخدم المقصد المطلوب في الأعلى. 5 مفاهيم صحيحة تعني الفوز، و3 أخطاء تعني خسارة الجولة.",
    colLearn:
      "تعزّز التمييز السريع بين المفاهيم التي تنتمي لمقصد معيّن وبقية المفاهيم، فتصبح خريطة النموذج واضحة في ذهنك وتختار الصواب بثقة.",
    // Common
    seconds: "ث",
    yourScore: "نقاطك",
    moves: "محاولاتك",
    bestStreak: "أطول سلسلة",
  },
  sq: {
    title: "Lojërat Edukative",
    sub: "Mëso modelin përmes lojës — tri lojëra të shkurtra, sfido veten dhe argëtohu",
    playBtn: "Luaj",
    backToHub: "Të gjitha lojërat",
    restart: "Rinis",
    // Memory
    memTitle: "Loja e Kujtesës",
    memDesc: "Ktheji kartat dhe përshtati nivelet me numrat dhe qëllimet me kuptimet. Sa më pak tentativa, aq më shumë yje.",
    memMoves: "Tentativa",
    memTime: "Koha",
    memWin: "Bravo!",
    memStars: (s: number) => `${s} ${s === 1 ? "yll" : "yje"}`,
    memPlayAgain: "Luaj sërish",
    // Hunter
    hunTitle: "Gjuetari i Qëllimeve",
    hunDesc: "Shfaqet një kartë, ti zgjedh qëllimin e duhur. 3 gabime humbet, 10 të sakta dhe fiton.",
    hunScore: "Pikët",
    hunLives: "Tentativa",
    hunRound: "Pyetja",
    hunCorrect: "Shkëlqyer!",
    hunWrong: "Gabim",
    hunWin: "Hero i qëllimeve!",
    hunLose: "Provo sërish",
    hunWinSub: (s: number) => `10 përgjigje të sakta me ${s} pikë`,
    hunLoseSub: "Të mbaruan tentativat. Çdo moment është një shans i ri!",
    // Speed
    spdTitle: "Sfida e Shpejtësisë",
    spdDesc: "Shfaqet një fjalë — a është qëllim apo nivel? Klikim i shpejtë, varg i gjatë, 30 sekonda.",
    spdMaqsad: "Qëllim",
    spdLevel: "Nivel",
    spdScore: "Pikët",
    spdCombo: "Vargu",
    spdTimeLeft: "Koha",
    spdGoodCombo: (n: number) => `Varg x${n} 🔥`,
    spdEnd: "Koha mbaroi",
    spdFinalScore: (n: number) => `Pikët finale ${n}`,
    spdBestCombo: (n: number) => `Vargu më i gjatë ${n}`,
    // Collector
    colTitle: "Mbledhësi i Qëllimeve",
    colDesc: "Lëviz me shigjetat e tastierës (ose butonat) dhe mblidh elementet që i përkasin qëllimit të kërkuar. 5 të sakta për të fituar, 3 gabime për të humbur.",
    colTargetLabel: "Mblidh elementet e",
    colCollectedLabel: "Të mbledhura",
    colHintKeys: "Lëviz me ← ↑ → ↓ ose WASD",
    colHintTouch: "Lëviz me butonat",
    colWin: "Mbledhës i shkëlqyer! 🎉",
    colWinSub: "Mblodhe 5 elemente të sakta në kohë",
    colLose: "S'ka problem, provo sërish",
    colLoseSub: "Fokusohu vetëm te elementet që i përkasin qëllimit të kërkuar",
    // Hint card — generic labels
    howToTitle: "Si të luash",
    whatYouLearnTitle: "Çfarë mëson",
    hintToggle: "Si luaj?",
    hintCloseLabel: "Fshih udhëzimet",
    // Per-game hints
    memHowTo:
      "Kliko një kartë për ta kthyer. Në çdo lëvizje shfaq dy karta dhe gjej çiftin që përputhet (p.sh.: «Niveli i Parë» me «Ndjekja», ose «Feja» me «Ruajtja e besimit»). Nëse përputhen mbeten të kthyera, përndryshe rikthehen.",
    memLearn:
      "Të ngulit në kujtesë emrat e pesë niveleve me numrat e tyre dhe kuptimet e qëllimeve kryesore, që ta sjellësh ndërmend strukturën e modelit sa herë sheh një pjesë të saj.",
    hunHowTo:
      "Shfaqet një kartë me një nga 25 konceptet. Mes pesë butonave zgjidh qëllimin që i shërben këtij koncepti. Ke 3 tentativa; 10 përgjigje të sakta = fitore.",
    hunLearn:
      "Të ushtron lidhjen e shpejtë mes çdo koncepti dhe qëllimit të tij, duke forcuar pozicionin e saktë të konceptit në model dhe logjikën që qëndron pas tij.",
    spdHowTo:
      "Shfaqet një fjalë nga fjalori i modelit. Kliko «Qëllim» nëse është një nga pesë qëllimet, ose «Nivel» nëse është një nga pesë nivelet. Vetëm 30 sekonda — vargu i gjatë i shumëfishon pikët.",
    spdLearn:
      "Mat shpejtësinë e dallimit mes qëllimeve dhe niveleve — dy kategorive bazë mbi të cilat ndërtohet i gjithë modeli — duke i bërë këto emra intuitivë.",
    colHowTo:
      "Lëviz lojtarin me shigjetat e tastierës ose me butonat. Kap vetëm konceptet që i shërbejnë qëllimit të kërkuar lart. 5 koncepte të sakta = fitore, 3 të gabuara = humbje.",
    colLearn:
      "Forcon dallimin e shpejtë midis koncepteve të një qëllimi të caktuar dhe pjesës tjetër, duke e bërë hartën e modelit të qartë në mendje dhe duke të ndihmuar të zgjedhësh me besim.",
    // Common
    seconds: "s",
    yourScore: "Pikët",
    moves: "Tentativat",
    bestStreak: "Vargu më i gjatë",
  },
};

/* ─── Game data ──────────────────────────────────────────────────────── */

// Memory pairs — each pair shares an id; cards alternate "kind" (number / level / maqsad / meaning)
type MemPair = { id: string; ar: [string, string]; sq: [string, string] };
const MEM_PAIRS: MemPair[] = [
  { id: "lv1",   ar: ["المستوى الأول",   "الاتباع"],    sq: ["Niveli i Parë",   "Ndjekja"] },
  { id: "lv2",   ar: ["المستوى الثاني",  "الاستبانة"],  sq: ["Niveli i Dytë",   "Sqarimi"] },
  { id: "lv3",   ar: ["المستوى الثالث",  "القيادة"],    sq: ["Niveli i Tretë",  "Lidershipi"] },
  { id: "lv4",   ar: ["المستوى الرابع",  "التمكين"],    sq: ["Niveli i Katërt", "Fuqizimi"] },
  { id: "lv5",   ar: ["المستوى الخامس",  "الريادة"],    sq: ["Niveli i Pestë",  "Pionierizmi"] },
  { id: "mDeen", ar: ["الدين",  "حفظ الإيمان"],         sq: ["Feja",    "Ruajtja e besimit"] },
  { id: "mNafs", ar: ["النفس",  "حفظ الحياة"],          sq: ["Vetja",   "Ruajtja e jetës"] },
  { id: "mMal",  ar: ["المال",  "حفظ الثروة"],          sq: ["Pasuria", "Ruajtja e pasurisë"] },
];

// Maqsad keys (matching the schema enum)
type Maqsad = "DEEN" | "NAFS" | "AQL" | "NASL" | "MAL";

const MAQSAD_LABELS: Record<Maqsad, { ar: string; sq: string }> = {
  DEEN: { ar: "الدين",  sq: "Feja" },
  NAFS: { ar: "النفس",  sq: "Vetja" },
  AQL:  { ar: "العقل",  sq: "Mendja" },
  NASL: { ar: "النسل",  sq: "Pasardhësit" },
  MAL:  { ar: "المال",  sq: "Pasuria" },
};
const MAQSAD_ORDER: Maqsad[] = ["DEEN", "NAFS", "AQL", "NASL", "MAL"];

// Hunter questions — concept text → correct maqsad
type HunterQ = { ar: string; sq: string; answer: Maqsad };
const HUNTER_BANK: HunterQ[] = [
  { ar: "حفظ الإيمان والعبادة", sq: "Ruajtja e besimit dhe adhurimit", answer: "DEEN" },
  { ar: "حفظ الحياة والكرامة",  sq: "Ruajtja e jetës dhe dinjitetit",  answer: "NAFS" },
  { ar: "حفظ الفكر والوعي",     sq: "Ruajtja e mendjes dhe vetëdijes", answer: "AQL"  },
  { ar: "حفظ الأسرة والذرية",   sq: "Ruajtja e familjes dhe pasardhësve", answer: "NASL" },
  { ar: "حفظ الثروة والموارد",  sq: "Ruajtja e pasurisë dhe burimeve", answer: "MAL"  },
  { ar: "النية المثمرة",        sq: "Qëllimi i Frytshëm",               answer: "DEEN" },
  { ar: "مسار الزمن",           sq: "Rrjedha e Kohës",                  answer: "NAFS" },
  { ar: "المآلات",              sq: "Pasojat",                          answer: "AQL"  },
  { ar: "التفكير الاستراتيجي",  sq: "Mendimi Strategjik",               answer: "NASL" },
  { ar: "الهياكل الاجتماعية",   sq: "Strukturat Shoqërore",             answer: "MAL"  },
  { ar: "الطاقة الروحية",       sq: "Energjia Shpirtërore",             answer: "DEEN" },
  { ar: "الحاجات للإنسان",      sq: "Nevojat Njerëzore",                answer: "NAFS" },
  { ar: "تدبير أمر الأمة",      sq: "Qeverisja e Umetit",               answer: "AQL"  },
  { ar: "طرق تكوين المنظمات",   sq: "Metodat e Formimit të Organizatave", answer: "NASL" },
  { ar: "آليات كسب المال",      sq: "Mekanizmat e Fitimit",             answer: "MAL"  },
  { ar: "القياس التنموي",       sq: "Matja e Zhvillimit",               answer: "DEEN" },
  { ar: "خطط، أنجز، ادرس، نفّذ", sq: "Plano, Realizo, Studio, Zbato",    answer: "NAFS" },
  { ar: "القيادة",              sq: "Lidershipi",                       answer: "AQL"  },
  { ar: "تنويع المؤثرات الحيوية", sq: "Diversifikimi i Faktorëve Vitalë", answer: "NASL" },
  { ar: "التدبير الاقتصادي",    sq: "Qeverisja Ekonomike",              answer: "MAL"  },
];

// Speed words — pure category (maqsad vs level)
type SpeedKind = "maqsad" | "level";
type SpeedWord = { ar: string; sq: string; kind: SpeedKind };
const SPEED_BANK: SpeedWord[] = [
  { ar: "الدين",    sq: "Feja",        kind: "maqsad" },
  { ar: "النفس",    sq: "Vetja",       kind: "maqsad" },
  { ar: "العقل",    sq: "Mendja",      kind: "maqsad" },
  { ar: "النسل",    sq: "Pasardhësit", kind: "maqsad" },
  { ar: "المال",    sq: "Pasuria",     kind: "maqsad" },
  { ar: "الاتباع",  sq: "Ndjekja",     kind: "level"  },
  { ar: "الاستبانة", sq: "Sqarimi",    kind: "level"  },
  { ar: "القيادة",  sq: "Lidershipi",  kind: "level"  },
  { ar: "التمكين",  sq: "Fuqizimi",    kind: "level"  },
  { ar: "الريادة",  sq: "Pionierizmi", kind: "level"  },
];

// ── Collector items per maqsad (6 each = 30 total) ───────────────────
type ColItem = { ar: string; sq: string; maqsad: Maqsad };
const COLLECTOR_BANK: Record<Maqsad, ColItem[]> = {
  DEEN: [
    { ar: "العبادة", sq: "Adhurimi",  maqsad: "DEEN" },
    { ar: "الإيمان", sq: "Besimi",    maqsad: "DEEN" },
    { ar: "النية",   sq: "Qëllimi",   maqsad: "DEEN" },
    { ar: "القرآن",  sq: "Kurani",    maqsad: "DEEN" },
    { ar: "الصلاة",  sq: "Namazi",    maqsad: "DEEN" },
    { ar: "الذكر",   sq: "Përmendja", maqsad: "DEEN" },
  ],
  NAFS: [
    { ar: "الصحة",   sq: "Shëndeti",  maqsad: "NAFS" },
    { ar: "الحياة",  sq: "Jeta",      maqsad: "NAFS" },
    { ar: "الكرامة", sq: "Dinjiteti", maqsad: "NAFS" },
    { ar: "النوم",   sq: "Gjumi",     maqsad: "NAFS" },
    { ar: "الراحة",  sq: "Pushimi",   maqsad: "NAFS" },
    { ar: "السعادة", sq: "Lumturia",  maqsad: "NAFS" },
  ],
  AQL: [
    { ar: "التفكير", sq: "Mendimi",   maqsad: "AQL" },
    { ar: "التعلم",  sq: "Mësimi",    maqsad: "AQL" },
    { ar: "المعرفة", sq: "Njohuria",  maqsad: "AQL" },
    { ar: "العلم",   sq: "Dija",      maqsad: "AQL" },
    { ar: "الفكر",   sq: "Ideja",     maqsad: "AQL" },
    { ar: "الكتاب",  sq: "Libri",     maqsad: "AQL" },
  ],
  NASL: [
    { ar: "الأسرة",  sq: "Familja",   maqsad: "NASL" },
    { ar: "الأبناء", sq: "Fëmijët",   maqsad: "NASL" },
    { ar: "التربية", sq: "Edukata",   maqsad: "NASL" },
    { ar: "البيت",   sq: "Shtëpia",   maqsad: "NASL" },
    { ar: "الأمومة", sq: "Mëmësia",   maqsad: "NASL" },
    { ar: "الأجداد", sq: "Gjyshërit", maqsad: "NASL" },
  ],
  MAL: [
    { ar: "المال",    sq: "Paraja",   maqsad: "MAL" },
    { ar: "التجارة",  sq: "Tregtia",  maqsad: "MAL" },
    { ar: "الكسب",    sq: "Fitimi",   maqsad: "MAL" },
    { ar: "الثروة",   sq: "Pasuria",  maqsad: "MAL" },
    { ar: "الادخار",  sq: "Kursimi",  maqsad: "MAL" },
    { ar: "الذهب",    sq: "Ari",      maqsad: "MAL" },
  ],
};

/* ─── Utils ──────────────────────────────────────────────────────────── */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const localize = <T extends { ar: string; sq: string }>(item: T, lang: Lang) =>
  lang === "sq" ? item.sq : item.ar;

/* ─────────────────────────────────────────────────────────────────────
   Page shell
   ───────────────────────────────────────────────────────────────────── */

export default function GamesPage({ cardBase = "/teacher/games/card" }: { cardBase?: string }) {
  const { lang } = useLang();
  const L: Lang = lang === "sq" ? "sq" : "ar";
  const T = STR[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [game, setGame] = useState<GameId>("hub");

  return (
    <div className="gm-shell" dir={dir}>
      {game === "hub"       && <Hub T={T} onPlay={setGame} cardBase={cardBase} lang={L} />}
      {game === "memory"    && <MemoryGame    T={T} lang={L} onBack={() => setGame("hub")} />}
      {game === "hunter"    && <HunterGame    T={T} lang={L} onBack={() => setGame("hub")} />}
      {game === "speed"     && <SpeedGame     T={T} lang={L} onBack={() => setGame("hub")} />}
      {game === "collector" && <CollectorGame T={T} lang={L} onBack={() => setGame("hub")} />}
      <style>{styles}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Hub — three game tiles
   ───────────────────────────────────────────────────────────────────── */

function Hub({
  T,
  onPlay,
  cardBase,
  lang,
}: {
  T: typeof STR.ar;
  onPlay: (g: GameId) => void;
  cardBase: string;
  lang: Lang;
}) {
  const tiles: { id: Exclude<GameId, "hub">; title: string; desc: string; emoji: string; hue: string }[] = [
    { id: "memory",    title: T.memTitle, desc: T.memDesc, emoji: "🧠",  hue: "rgba(184,160,130,0.18)" },
    { id: "hunter",    title: T.hunTitle, desc: T.hunDesc, emoji: "🎯",  hue: "rgba(107,30,45,0.10)" },
    { id: "speed",     title: T.spdTitle, desc: T.spdDesc, emoji: "⚡",  hue: "rgba(45,138,74,0.10)" },
    { id: "collector", title: T.colTitle, desc: T.colDesc, emoji: "🧭",  hue: "rgba(20,80,140,0.10)" },
  ];

  // "نموذج التعلم" is now the single featured entry point that runs both
  // stages back-to-back. The old per-stage tiles are collapsed into this
  // hero card. Direct routes /card/STAGE1 and /card/STAGE2 still work.
  const modelHref = cardBase.replace(/\/card$/, "") + "/model";
  const modelHero = {
    title:  lang === "ar" ? "نموذج التعلم" : "Modeli i Mësimit",
    tagline: lang === "ar" ? "الأهم في مسارك التعليمي" : "Më i rëndësishmi në rrugën tënde",
    desc:
      lang === "ar"
        ? "مرحلتان متتابعتان لاختبار فهمك للنموذج الرواد كاملاً — البطاقة الأساسية ثم النسخة الموسّعة. لا حد للمحاولات، ومن يبرز يظهر في قائمة المتصدرين."
        : "Dy faza radhazi për të testuar kuptimin tënd të plotë të Modelit Rowad — karta bazë pastaj versioni i zgjeruar. Pa kufi provash, dhe kryesuesit renditen për të gjithë.",
    cta: lang === "ar" ? "ابدأ نموذج التعلم" : "Fillo Modelin",
  };

  return (
    <div className="gm-inner">
      <header className="gm-hero">
        <div className="gm-hero-icon" aria-hidden>🎮</div>
        <h1 className="gm-hero-title">{T.title}</h1>
        <p className="gm-hero-sub">{T.sub}</p>
      </header>

      {/* Hero: نموذج التعلم — the flagship two-stage flow. */}
      <a href={modelHref} className="gm-model-hero">
        <div className="gm-model-hero-band">
          <span className="gm-model-hero-pin">✦ {modelHero.tagline}</span>
        </div>
        <div className="gm-model-hero-body">
          <div className="gm-model-hero-icon" aria-hidden>🎴</div>
          <div className="gm-model-hero-text">
            <h2 className="gm-model-hero-title">{modelHero.title}</h2>
            <p className="gm-model-hero-desc">{modelHero.desc}</p>
          </div>
          <div className="gm-model-hero-cta">
            <span>{modelHero.cta}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </div>
        </div>
      </a>

      <div className="gm-tiles">
        {tiles.map((t, i) => (
          <button
            key={t.id}
            className="gm-tile"
            onClick={() => onPlay(t.id)}
            style={{ animationDelay: `${0.08 * (i + 2)}s`, "--tile-tint": t.hue } as React.CSSProperties}
          >
            <div className="gm-tile-emblem" aria-hidden>
              <span className="gm-tile-emoji">{t.emoji}</span>
            </div>
            <div className="gm-tile-body">
              <h2 className="gm-tile-title">{t.title}</h2>
              <p className="gm-tile-desc">{t.desc}</p>
            </div>
            <div className="gm-tile-cta">
              <span>{T.playBtn}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Game frame — shared chrome (back button + restart)
   ───────────────────────────────────────────────────────────────────── */

function GameFrame({
  T,
  title,
  onBack,
  onRestart,
  hintKey,
  howToPlay,
  whatYouLearn,
  children,
}: {
  T: typeof STR.ar;
  title: string;
  onBack: () => void;
  onRestart: () => void;
  hintKey?: string;
  howToPlay?: string;
  whatYouLearn?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gm-inner">
      <div className="gm-game-head">
        <button className="gm-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <polyline points="15 6 9 12 15 18" />
          </svg>
          <span>{T.backToHub}</span>
        </button>
        <h2 className="gm-game-title">{title}</h2>
        <button className="gm-restart" onClick={onRestart} aria-label={T.restart}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M21 12a9 9 0 11-3-6.7M21 4v5h-5" />
          </svg>
          <span>{T.restart}</span>
        </button>
      </div>
      {hintKey && howToPlay && whatYouLearn && (
        <GameHint T={T} storageKey={hintKey} howToPlay={howToPlay} whatYouLearn={whatYouLearn} />
      )}
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   GameHint — collapsible "how to play / what you learn" card.
   Defaults open the first time the user enters a game; remembers the
   collapse state per game for the rest of the session.
   ───────────────────────────────────────────────────────────────────── */

function GameHint({
  T,
  storageKey,
  howToPlay,
  whatYouLearn,
}: {
  T: typeof STR.ar;
  storageKey: string;
  howToPlay: string;
  whatYouLearn: string;
}) {
  const ssKey = `gmHint:${storageKey}`;

  // Default open until the user explicitly closes it (then remember per game).
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.sessionStorage.getItem(ssKey) !== "closed";
    } catch {
      return true;
    }
  });

  function setOpenPersist(v: boolean) {
    setOpen(v);
    try {
      window.sessionStorage.setItem(ssKey, v ? "open" : "closed");
    } catch { /* sessionStorage may be unavailable */ }
  }

  if (!open) {
    return (
      <button
        className="gm-hint-pill"
        onClick={() => setOpenPersist(true)}
        type="button"
        aria-expanded="false"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span>{T.hintToggle}</span>
      </button>
    );
  }

  return (
    <div className="gm-hint-card" role="note">
      <button
        className="gm-hint-close"
        onClick={() => setOpenPersist(false)}
        aria-label={T.hintCloseLabel}
        type="button"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="gm-hint-section">
        <div className="gm-hint-title">
          <span className="gm-hint-ico" aria-hidden>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </span>
          {T.howToTitle}
        </div>
        <p className="gm-hint-body">{howToPlay}</p>
      </div>

      <div className="gm-hint-divider" aria-hidden />

      <div className="gm-hint-section">
        <div className="gm-hint-title">
          <span className="gm-hint-ico" aria-hidden>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6V17c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z" />
            </svg>
          </span>
          {T.whatYouLearnTitle}
        </div>
        <p className="gm-hint-body">{whatYouLearn}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Game 1 — Memory Match
   ───────────────────────────────────────────────────────────────────── */

type MemCard = { uid: number; pairId: string; text: string };

function buildMemDeck(lang: Lang): MemCard[] {
  const pool: { pairId: string; text: string }[] = [];
  for (const p of MEM_PAIRS) {
    const [a, b] = lang === "sq" ? p.sq : p.ar;
    pool.push({ pairId: p.id, text: a });
    pool.push({ pairId: p.id, text: b });
  }
  return shuffle(pool).map((c, i) => ({ uid: i, ...c }));
}

function MemoryGame({ T, lang, onBack }: { T: typeof STR.ar; lang: Lang; onBack: () => void }) {
  const [deck, setDeck] = useState<MemCard[]>(() => buildMemDeck(lang));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(true);
  const lockRef = useRef(false);

  // Timer
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const won = matched.size === MEM_PAIRS.length;
  useEffect(() => { if (won) setRunning(false); }, [won]);

  const restart = useCallback(() => {
    setDeck(buildMemDeck(lang));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setTime(0);
    setRunning(true);
    lockRef.current = false;
  }, [lang]);

  // Re-build deck when language flips, so card text stays in sync.
  useEffect(() => { restart(); }, [lang, restart]);

  function flip(uid: number) {
    if (lockRef.current) return;
    if (flipped.includes(uid)) return;
    const card = deck.find((c) => c.uid === uid);
    if (!card || matched.has(card.pairId)) return;

    const next = [...flipped, uid];
    setFlipped(next);

    if (next.length === 2) {
      const [a, b] = next.map((id) => deck.find((c) => c.uid === id)!);
      setMoves((m) => m + 1);
      if (a.pairId === b.pairId) {
        // Match
        setTimeout(() => {
          setMatched((set) => new Set(set).add(a.pairId));
          setFlipped([]);
        }, 380);
      } else {
        lockRef.current = true;
        setTimeout(() => {
          setFlipped([]);
          lockRef.current = false;
        }, 850);
      }
    }
  }

  // Stars: perfect = 3 (≤12 moves), good = 2 (≤16), participation = 1
  const stars = won ? (moves <= 12 ? 3 : moves <= 16 ? 2 : 1) : 0;

  return (
    <GameFrame
      T={T}
      title={T.memTitle}
      onBack={onBack}
      onRestart={restart}
      hintKey="memory"
      howToPlay={T.memHowTo}
      whatYouLearn={T.memLearn}
    >
      <div className="gm-stat-row">
        <Stat label={T.memMoves} value={String(moves)} />
        <Stat label={T.memTime} value={fmtTime(time)} mono />
        <Stat label={T.yourScore} value={`${matched.size} / ${MEM_PAIRS.length}`} />
      </div>

      <div className="gm-mem-grid">
        {deck.map((card) => {
          const isFlipped = flipped.includes(card.uid) || matched.has(card.pairId);
          const isMatched = matched.has(card.pairId);
          return (
            <button
              key={card.uid}
              className={`gm-mcard${isFlipped ? " flipped" : ""}${isMatched ? " matched" : ""}`}
              onClick={() => flip(card.uid)}
              aria-label="memory card"
            >
              <span className="gm-mcard-inner">
                <span className="gm-mcard-back">
                  <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(232,194,127,0.45)" strokeWidth="0.8" />
                    <circle cx="22" cy="22" r="12" fill="none" stroke="rgba(232,194,127,0.55)" strokeWidth="0.7" />
                    <circle cx="22" cy="22" r="6" fill="none" stroke="rgba(232,194,127,0.65)" strokeWidth="0.7" />
                    {[0, 45, 90, 135].map((a, i) => {
                      const r = (a * Math.PI) / 180;
                      return (
                        <line
                          key={i}
                          x1={22 - 16 * Math.cos(r)}
                          y1={22 - 16 * Math.sin(r)}
                          x2={22 + 16 * Math.cos(r)}
                          y2={22 + 16 * Math.sin(r)}
                          stroke="rgba(232,194,127,0.35)"
                          strokeWidth="0.6"
                        />
                      );
                    })}
                  </svg>
                </span>
                <span className="gm-mcard-front">{card.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      {won && (
        <WinModal>
          <div className="gm-win-title">{T.memWin}</div>
          <div className="gm-stars">
            {[1, 2, 3].map((i) => (
              <span key={i} className={`gm-star${i <= stars ? " on" : ""}`}>★</span>
            ))}
          </div>
          <div className="gm-win-stats">
            <span>{T.moves}: <strong>{moves}</strong></span>
            <span className="gm-win-sep" />
            <span>{T.memTime}: <strong>{fmtTime(time)}</strong></span>
          </div>
          <div className="gm-win-actions">
            <button className="gm-btn-primary" onClick={restart}>{T.memPlayAgain}</button>
            <button className="gm-btn-ghost" onClick={onBack}>{T.backToHub}</button>
          </div>
        </WinModal>
      )}
    </GameFrame>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Game 2 — Maqsad Hunter
   ───────────────────────────────────────────────────────────────────── */

function pickHunterRound(): HunterQ[] {
  return shuffle(HUNTER_BANK).slice(0, 10);
}

function HunterGame({ T, lang, onBack }: { T: typeof STR.ar; lang: Lang; onBack: () => void }) {
  const [round, setRound] = useState<HunterQ[]>(pickHunterRound);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [picked, setPicked] = useState<Maqsad | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const restart = useCallback(() => {
    setRound(pickHunterRound());
    setIdx(0);
    setScore(0);
    setLives(3);
    setPicked(null);
    setFeedback(null);
  }, []);

  const current = round[idx];
  const won = idx >= 10 && lives > 0;
  const lost = lives <= 0;
  const ended = won || lost;

  function answer(m: Maqsad) {
    if (picked || ended) return;
    setPicked(m);
    if (m === current.answer) {
      setScore((s) => s + 10);
      setFeedback("correct");
      setTimeout(() => {
        setIdx((i) => i + 1);
        setPicked(null);
        setFeedback(null);
      }, 600);
    } else {
      setLives((v) => v - 1);
      setFeedback("wrong");
      setTimeout(() => {
        setIdx((i) => i + 1);
        setPicked(null);
        setFeedback(null);
      }, 750);
    }
  }

  return (
    <GameFrame
      T={T}
      title={T.hunTitle}
      onBack={onBack}
      onRestart={restart}
      hintKey="hunter"
      howToPlay={T.hunHowTo}
      whatYouLearn={T.hunLearn}
    >
      <div className="gm-stat-row">
        <Stat label={T.hunScore} value={String(score)} mono />
        <div className="gm-stat">
          <span className="gm-stat-label">{T.hunLives}</span>
          <div className="gm-hearts">
            {[1, 2, 3].map((i) => (
              <span key={i} className={`gm-heart${i <= lives ? " on" : ""}`}>♥</span>
            ))}
          </div>
        </div>
        <Stat label={T.hunRound} value={`${Math.min(idx + 1, 10)} / 10`} />
      </div>

      {!ended && current && (
        <div className={`gm-hunter-card${feedback ? ` fb-${feedback}` : ""}`}>
          <span className="gm-hunter-tag">{lang === "ar" ? "المفهوم" : "Koncepti"}</span>
          <span className="gm-hunter-q">{localize(current, lang)}</span>
          {feedback === "correct" && <span className="gm-hunter-popup">+10</span>}
        </div>
      )}

      {!ended && (
        <div className="gm-hunter-choices">
          {MAQSAD_ORDER.map((m) => {
            const isPicked = picked === m;
            const isRight = current && m === current.answer;
            const state =
              !picked ? "idle" :
              isPicked && isRight ? "right" :
              isPicked && !isRight ? "wrong" :
              !isPicked && isRight && picked && picked !== current.answer ? "reveal" :
              "idle";
            return (
              <button
                key={m}
                className={`gm-hunter-btn st-${state}`}
                onClick={() => answer(m)}
                disabled={!!picked}
              >
                {MAQSAD_LABELS[m][lang === "sq" ? "sq" : "ar"]}
              </button>
            );
          })}
        </div>
      )}

      {ended && (
        <WinModal>
          <div className={`gm-win-title ${won ? "good" : "bad"}`}>
            {won ? T.hunWin : T.hunLose}
          </div>
          <div className="gm-win-emoji">{won ? "🏆" : "🌱"}</div>
          <div className="gm-win-sub">
            {won ? T.hunWinSub(score) : T.hunLoseSub}
          </div>
          <div className="gm-win-stats">
            <span>{T.hunScore}: <strong>{score}</strong></span>
          </div>
          <div className="gm-win-actions">
            <button className="gm-btn-primary" onClick={restart}>{T.memPlayAgain}</button>
            <button className="gm-btn-ghost" onClick={onBack}>{T.backToHub}</button>
          </div>
        </WinModal>
      )}
    </GameFrame>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Game 3 — Speed Drill
   ───────────────────────────────────────────────────────────────────── */

function nextSpeedWord(prev?: SpeedWord): SpeedWord {
  // Avoid showing the same word back-to-back.
  const pool = prev ? SPEED_BANK.filter((w) => w.ar !== prev.ar) : SPEED_BANK;
  return pool[Math.floor(Math.random() * pool.length)];
}

const SPEED_DURATION = 30;

function SpeedGame({ T, lang, onBack }: { T: typeof STR.ar; lang: Lang; onBack: () => void }) {
  const [word, setWord] = useState<SpeedWord>(() => nextSpeedWord());
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SPEED_DURATION);
  const [running, setRunning] = useState(true);
  const [flash, setFlash] = useState<"right" | "wrong" | null>(null);

  const restart = useCallback(() => {
    setWord(nextSpeedWord());
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(SPEED_DURATION);
    setRunning(true);
    setFlash(null);
  }, []);

  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) { setRunning(false); return; }
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [running, timeLeft]);

  function pick(kind: SpeedKind) {
    if (!running) return;
    const correct = kind === word.kind;
    if (correct) {
      const mult = combo >= 9 ? 5 : combo >= 4 ? 3 : combo >= 1 ? 2 : 1;
      setScore((s) => s + 10 * mult);
      setCombo((c) => {
        const next = c + 1;
        setBestCombo((b) => Math.max(b, next));
        return next;
      });
      setFlash("right");
    } else {
      setCombo(0);
      setFlash("wrong");
    }
    setTimeout(() => setFlash(null), 220);
    setWord((w) => nextSpeedWord(w));
  }

  const timePct = (timeLeft / SPEED_DURATION) * 100;
  const ended = !running;
  const mult = combo >= 9 ? 5 : combo >= 4 ? 3 : combo >= 1 ? 2 : 1;

  return (
    <GameFrame
      T={T}
      title={T.spdTitle}
      onBack={onBack}
      onRestart={restart}
      hintKey="speed"
      howToPlay={T.spdHowTo}
      whatYouLearn={T.spdLearn}
    >
      <div className="gm-stat-row">
        <Stat label={T.spdScore} value={String(score)} mono />
        <div className="gm-stat">
          <span className="gm-stat-label">{T.spdCombo}</span>
          <span className={`gm-stat-value mono${combo >= 1 ? " hot" : ""}`}>
            x{mult}
          </span>
        </div>
        <Stat label={T.spdTimeLeft} value={`${timeLeft}${T.seconds}`} mono />
      </div>

      <div className="gm-speed-bar">
        <div
          className="gm-speed-bar-fill"
          style={{
            width: `${timePct}%`,
            background: timePct < 25
              ? "linear-gradient(90deg,#6B1E2D,#C24F4F)"
              : timePct < 50
                ? "linear-gradient(90deg,#B8A082,#B8A082,#D9C9B0)"
                : "linear-gradient(90deg,#3F8A4F,#5BB572)",
          }}
        />
      </div>

      {!ended && (
        <>
          <div className={`gm-speed-card${flash ? ` fb-${flash}` : ""}`} key={word.ar}>
            <span className="gm-speed-tag">{lang === "ar" ? "الكلمة" : "Fjala"}</span>
            <span className="gm-speed-word">{localize(word, lang)}</span>
            {combo >= 3 && (
              <span className="gm-speed-streak">{T.spdGoodCombo(combo)}</span>
            )}
          </div>

          <div className="gm-speed-choices">
            <button
              className="gm-speed-btn maqsad"
              onClick={() => pick("maqsad")}
              type="button"
            >
              <span className="gm-speed-btn-emoji">🕌</span>
              <span className="gm-speed-btn-label">{T.spdMaqsad}</span>
            </button>
            <button
              className="gm-speed-btn level"
              onClick={() => pick("level")}
              type="button"
            >
              <span className="gm-speed-btn-emoji">🏛️</span>
              <span className="gm-speed-btn-label">{T.spdLevel}</span>
            </button>
          </div>
        </>
      )}

      {ended && (
        <WinModal>
          <div className="gm-win-title good">{T.spdEnd}</div>
          <div className="gm-win-emoji">⚡</div>
          <div className="gm-win-stats stacked">
            <span>{T.spdFinalScore(score)}</span>
            <span>{T.spdBestCombo(bestCombo)}</span>
          </div>
          <div className="gm-win-actions">
            <button className="gm-btn-primary" onClick={restart}>{T.memPlayAgain}</button>
            <button className="gm-btn-ghost" onClick={onBack}>{T.backToHub}</button>
          </div>
        </WinModal>
      )}
    </GameFrame>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Game 4 — Maqsad Collector (arrow-key movement + collision)
   ───────────────────────────────────────────────────────────────────── */

type CollectorEntity = {
  id: number;
  x: number;       // percent (4..96)
  y: number;       // percent (8..94)
  vx: number;      // drift velocity (% per second)
  vy: number;
  ar: string;
  sq: string;
  maqsad: Maqsad;
  collected: boolean;
};

const COLLECT_TARGET_COUNT = 5;          // win condition
const COLLECT_INITIAL_LIVES = 3;         // lose condition
const COLLECT_PLAYER_SPEED = 48;         // % per second
const COLLECT_HIT_RADIUS  = 9;           // collision distance in %
const COLLECT_CORRECT_PER_ROUND = 6;
const COLLECT_WRONG_PER_ROUND   = 6;

function pickTargetMaqsad(): Maqsad {
  return MAQSAD_ORDER[Math.floor(Math.random() * MAQSAD_ORDER.length)];
}

function spawnCollectorItems(target: Maqsad): CollectorEntity[] {
  // 6 correct from the target maqsad
  const correct = shuffle(COLLECTOR_BANK[target]).slice(0, COLLECT_CORRECT_PER_ROUND);
  // Pull from the four other maqasid roughly evenly
  const wrongPool = MAQSAD_ORDER
    .filter((m) => m !== target)
    .flatMap((m) => COLLECTOR_BANK[m]);
  const wrong = shuffle(wrongPool).slice(0, COLLECT_WRONG_PER_ROUND);

  const all = shuffle([...correct, ...wrong]);

  // Lay items out on a soft grid + jitter so they never overlap with the
  // player's spawn (centre) or each other.
  return all.map((item, i) => {
    const cols = 4;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const baseX = 15 + col * ((100 - 30) / (cols - 1));
    const baseY = 18 + row * 24;
    const jitterX = (Math.random() - 0.5) * 8;
    const jitterY = (Math.random() - 0.5) * 6;
    // Half drift, half static
    const drift = Math.random() < 0.5;
    const speed = 2 + Math.random() * 3;
    const angle = Math.random() * Math.PI * 2;
    return {
      id: i,
      x: Math.max(8, Math.min(92, baseX + jitterX)),
      y: Math.max(12, Math.min(88, baseY + jitterY)),
      vx: drift ? Math.cos(angle) * speed : 0,
      vy: drift ? Math.sin(angle) * speed : 0,
      ar: item.ar,
      sq: item.sq,
      maqsad: item.maqsad,
      collected: false,
    };
  });
}

type Popup = { id: number; x: number; y: number; text: string; kind: "good" | "bad" };

function CollectorGame({ T, lang, onBack }: { T: typeof STR.ar; lang: Lang; onBack: () => void }) {
  // Hot game state lives in refs — only mirrored to React on tick.
  const targetRef = useRef<Maqsad>(pickTargetMaqsad());
  const playerRef = useRef({ x: 50, y: 50 });
  const itemsRef  = useRef<CollectorEntity[]>(spawnCollectorItems(targetRef.current));
  const scoreRef     = useRef(0);
  const livesRef     = useRef(COLLECT_INITIAL_LIVES);
  const collectedRef = useRef(0);
  const popupIdRef   = useRef(0);

  // Input state
  const keysRef    = useRef(new Set<string>());
  const touchVec   = useRef({ x: 0, y: 0 });

  // Re-render trigger (one bump per frame)
  const [, setTick] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");

  const restart = useCallback(() => {
    targetRef.current = pickTargetMaqsad();
    playerRef.current = { x: 50, y: 50 };
    itemsRef.current  = spawnCollectorItems(targetRef.current);
    scoreRef.current  = 0;
    livesRef.current  = COLLECT_INITIAL_LIVES;
    collectedRef.current = 0;
    touchVec.current  = { x: 0, y: 0 };
    setPopups([]);
    setStatus("playing");
    setTick((t) => t + 1);
  }, []);

  const spawnPopup = useCallback((x: number, y: number, text: string, kind: "good" | "bad") => {
    const id = ++popupIdRef.current;
    setPopups((prev) => [...prev, { id, x, y, text, kind }]);
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    }, 900);
  }, []);

  // ── Keyboard ──
  useEffect(() => {
    function down(e: KeyboardEvent) {
      // Block page scroll for arrow keys while inside the game.
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current.add(e.key.toLowerCase());
    }
    function up(e: KeyboardEvent) {
      keysRef.current.delete(e.key.toLowerCase());
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ── Game loop ──
  useEffect(() => {
    if (status !== "playing") return;
    let raf = 0;
    let last = performance.now();

    function step(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // ── Input vector ──
      let vx = touchVec.current.x;
      let vy = touchVec.current.y;
      const k = keysRef.current;
      if (k.has("arrowleft")  || k.has("a")) vx -= 1;
      if (k.has("arrowright") || k.has("d")) vx += 1;
      if (k.has("arrowup")    || k.has("w")) vy -= 1;
      if (k.has("arrowdown")  || k.has("s")) vy += 1;
      const mag = Math.hypot(vx, vy);
      if (mag > 0) { vx /= mag; vy /= mag; }

      // ── Move player ──
      const p = playerRef.current;
      p.x = Math.max(4, Math.min(96, p.x + vx * COLLECT_PLAYER_SPEED * dt));
      p.y = Math.max(6, Math.min(94, p.y + vy * COLLECT_PLAYER_SPEED * dt));

      // ── Update items + collisions ──
      const items = itemsRef.current;
      let won = false;
      let lost = false;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.collected) continue;
        // Drift + bounce
        if (it.vx || it.vy) {
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          if (it.x < 6  || it.x > 94) { it.vx = -it.vx; it.x = Math.max(6, Math.min(94, it.x)); }
          if (it.y < 10 || it.y > 90) { it.vy = -it.vy; it.y = Math.max(10, Math.min(90, it.y)); }
        }
        // Collision
        const d = Math.hypot(p.x - it.x, p.y - it.y);
        if (d < COLLECT_HIT_RADIUS) {
          it.collected = true;
          const correct = it.maqsad === targetRef.current;
          if (correct) {
            scoreRef.current += 10;
            collectedRef.current += 1;
            spawnPopup(it.x, it.y, "+10", "good");
            if (collectedRef.current >= COLLECT_TARGET_COUNT) won = true;
          } else {
            livesRef.current -= 1;
            spawnPopup(it.x, it.y, "−♥", "bad");
            if (livesRef.current <= 0) lost = true;
          }
        }
      }

      if (won)       { setStatus("won");  return; }
      if (lost)      { setStatus("lost"); return; }
      // Spawn a fresh wave when correct items run out but we're not done
      const correctRemaining = items.filter(
        (it) => !it.collected && it.maqsad === targetRef.current,
      ).length;
      if (correctRemaining === 0) {
        itemsRef.current = spawnCollectorItems(targetRef.current);
      }

      setTick((t) => (t + 1) & 0xffff);
      raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [status, spawnPopup]);

  // ── Render-time data ──
  const target = targetRef.current;
  const player = playerRef.current;
  const items  = itemsRef.current;
  const targetLabel = MAQSAD_LABELS[target][lang === "sq" ? "sq" : "ar"];

  // D-pad press handlers — set the unit vector while held.
  const press = (x: number, y: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    touchVec.current = { x, y };
  };
  const release = (e: React.PointerEvent) => {
    e.preventDefault();
    touchVec.current = { x: 0, y: 0 };
  };

  return (
    <GameFrame
      T={T}
      title={T.colTitle}
      onBack={onBack}
      onRestart={restart}
      hintKey="collector"
      howToPlay={T.colHowTo}
      whatYouLearn={T.colLearn}
    >
      <div className="gm-stat-row">
        <div className="gm-stat">
          <span className="gm-stat-label">{T.colTargetLabel}</span>
          <span className="gm-col-target-pill">{targetLabel}</span>
        </div>
        <div className="gm-stat">
          <span className="gm-stat-label">{T.hunLives}</span>
          <div className="gm-hearts">
            {[1, 2, 3].map((i) => (
              <span key={i} className={`gm-heart${i <= livesRef.current ? " on" : ""}`}>♥</span>
            ))}
          </div>
        </div>
        <Stat
          label={T.colCollectedLabel}
          value={`${collectedRef.current} / ${COLLECT_TARGET_COUNT}`}
          mono
        />
        <Stat label={T.spdScore} value={String(scoreRef.current)} mono />
      </div>

      <div
        className="gm-col-map"
        // Block native touch scroll inside the map so the D-pad presses don't
        // also yank the viewport on mobile.
        style={{ touchAction: "none" }}
      >
        {/* Items */}
        {items.map((it) => (
          <span
            key={it.id}
            className={`gm-col-item${it.collected ? " collected" : ""}`}
            style={{ left: `${it.x}%`, top: `${it.y}%` }}
            aria-hidden={it.collected}
          >
            <span className="gm-col-item-dot" />
            <span className="gm-col-item-text">{lang === "sq" ? it.sq : it.ar}</span>
          </span>
        ))}

        {/* Player */}
        <div
          className="gm-col-player"
          style={{ left: `${player.x}%`, top: `${player.y}%` }}
          aria-label="player"
        >
          <span className="gm-col-player-pulse" />
          <span className="gm-col-player-core" />
        </div>

        {/* Floating +10 / −♥ popups */}
        {popups.map((pop) => (
          <span
            key={pop.id}
            className={`gm-col-popup ${pop.kind}`}
            style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
          >
            {pop.text}
          </span>
        ))}
      </div>

      {/* Controls — D-pad for touch, hint for keyboard */}
      <div className="gm-col-controls">
        <p className="gm-col-hint gm-col-hint-keys">{T.colHintKeys}</p>
        <div className="gm-dpad" aria-label="dpad">
          <button className="gm-dpad-btn up"
            onPointerDown={press(0, -1)} onPointerUp={release} onPointerCancel={release}
            aria-label="up">▲</button>
          <button className="gm-dpad-btn left"
            onPointerDown={press(-1, 0)} onPointerUp={release} onPointerCancel={release}
            aria-label="left">◀</button>
          <span className="gm-dpad-center" aria-hidden />
          <button className="gm-dpad-btn right"
            onPointerDown={press(1, 0)} onPointerUp={release} onPointerCancel={release}
            aria-label="right">▶</button>
          <button className="gm-dpad-btn down"
            onPointerDown={press(0, 1)} onPointerUp={release} onPointerCancel={release}
            aria-label="down">▼</button>
        </div>
      </div>

      {status !== "playing" && (
        <WinModal>
          <div className={`gm-win-title ${status === "won" ? "good" : "bad"}`}>
            {status === "won" ? T.colWin : T.colLose}
          </div>
          <div className="gm-win-emoji">{status === "won" ? "🧭" : "🌱"}</div>
          <div className="gm-win-sub">
            {status === "won" ? T.colWinSub : T.colLoseSub}
          </div>
          <div className="gm-win-stats">
            <span>{T.spdScore}: <strong>{scoreRef.current}</strong></span>
            <span className="gm-win-sep" />
            <span>{T.colCollectedLabel}: <strong>{collectedRef.current} / {COLLECT_TARGET_COUNT}</strong></span>
          </div>
          <div className="gm-win-actions">
            <button className="gm-btn-primary" onClick={restart}>{T.memPlayAgain}</button>
            <button className="gm-btn-ghost" onClick={onBack}>{T.backToHub}</button>
          </div>
        </WinModal>
      )}
    </GameFrame>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Tiny shared sub-components
   ───────────────────────────────────────────────────────────────────── */

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="gm-stat">
      <span className="gm-stat-label">{label}</span>
      <span className={`gm-stat-value${mono ? " mono" : ""}`}>{value}</span>
    </div>
  );
}

function WinModal({ children }: { children: React.ReactNode }) {
  return (
    <div className="gm-win-backdrop">
      <div className="gm-win-card">{children}</div>
    </div>
  );
}

/* Memoize via outer constant — string template */
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=El+Messiri:wght@500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');

*,*::before,*::after{box-sizing:border-box}

@keyframes gm-fade   { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes gm-pop    { 0% { transform: scale(.92); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes gm-shake  { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
@keyframes gm-glow   { 0%, 100% { box-shadow: 0 6px 24px rgba(63,138,79,0.35); } 50% { box-shadow: 0 6px 36px rgba(63,138,79,0.55); } }
@keyframes gm-popup  { 0% { opacity: 0; transform: translateY(0) scale(.6); } 30% { opacity: 1; transform: translateY(-18px) scale(1.05); } 100% { opacity: 0; transform: translateY(-46px) scale(.95); } }
@keyframes gm-spinr  { to { transform: rotate(360deg); } }

.gm-shell{
  min-height:100vh;
  background:
    radial-gradient(ellipse at 50% 10%, #F7F3EB 0%, transparent 55%),
    linear-gradient(160deg,#E5E0D5 0%,#E5E0D5 100%);
  font-family:'Cairo','Tajawal',sans-serif;
  color:#3B2F1C;
}
.gm-inner{max-width:1100px;margin:0 auto;padding:36px 20px 64px;animation:gm-fade .35s ease}

/* ── HERO ── */
.gm-hero{text-align:center;margin-bottom:34px}
.gm-hero-icon{font-size:46px;line-height:1;margin-bottom:8px;filter:drop-shadow(0 6px 16px rgba(150,115,50,0.20))}
.gm-hero-title{font-family:'El Messiri','Cairo',serif;font-size:34px;font-weight:800;color:#4A0E1C;margin:0;letter-spacing:-0.4px}
.gm-hero-sub{font-size:14.5px;color:#796A62;margin:10px auto 0;max-width:560px;line-height:1.7;font-weight:500}

/* ── TILES ── */
.gm-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
@media(max-width:880px){.gm-tiles{grid-template-columns:1fr}}

/* Featured Learning Model hero — the flagship of the tools page. */
.gm-model-hero{
  display:block; text-decoration:none; color:inherit;
  margin-bottom:20px; border-radius:20px; overflow:hidden;
  background:linear-gradient(165deg,#FFFBF5 0%,#F7F3EB 100%);
  border:1.5px solid #B8A082;
  box-shadow:0 10px 30px rgba(150,115,50,0.14), inset 0 0 0 4px #E5E0D5, inset 0 0 0 5.5px rgba(194,160,89,0.4);
  transition:transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s;
}
.gm-model-hero:hover{ transform:translateY(-3px); box-shadow:0 18px 44px rgba(150,115,50,0.22), inset 0 0 0 4px #E5E0D5, inset 0 0 0 5.5px rgba(194,160,89,0.55); }
.gm-model-hero-band{ background:linear-gradient(135deg,#32101A,#4B3718); padding:9px 20px; }
.gm-model-hero-pin{ display:inline-block; color:#B8A082; font-size:11.5px; font-weight:900; letter-spacing:0.16em; text-transform:uppercase; }
.gm-model-hero-body{ display:grid; grid-template-columns:auto 1fr auto; gap:18px; align-items:center; padding:20px 24px; }
@media(max-width:640px){ .gm-model-hero-body{ grid-template-columns:1fr; text-align:center; } }
.gm-model-hero-icon{ font-size:48px; line-height:1; }
.gm-model-hero-text{ min-width:0; }
.gm-model-hero-title{ font-family:'El Messiri','Cairo',serif; font-size:24px; font-weight:700; color:#32101A; margin:0 0 6px; letter-spacing:-0.01em; }
.gm-model-hero-desc{ font-size:13px; color:#6B1E2D; line-height:1.85; margin:0; }
.gm-model-hero-cta{
  display:inline-flex; align-items:center; gap:8px;
  background:linear-gradient(180deg,#5B1526,#32101A);
  color:#B8A082; padding:11px 20px; border-radius:12px;
  font-size:13.5px; font-weight:900; white-space:nowrap;
  box-shadow:0 4px 12px rgba(0,0,0,0.20);
}
[dir="rtl"] .gm-model-hero-cta svg{ transform:scaleX(-1); }

.gm-tile{
  position:relative;text-align:start;
  display:flex;flex-direction:column;gap:14px;
  padding:22px 22px 18px;
  background:linear-gradient(160deg,#FFFBF5 0%,#F7F3EB 100%);
  border:1.5px solid #D8C49A;
  border-radius:20px;
  cursor:pointer;font-family:inherit;color:inherit;
  box-shadow:0 8px 28px rgba(150,115,50,0.10);
  transition:transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s, border-color .22s;
  overflow:hidden;
  animation:gm-fade .45s ease both;
}
.gm-tile::after{
  content:'';position:absolute;inset:0;pointer-events:none;border-radius:inherit;
  background:radial-gradient(ellipse at 100% 0%, var(--tile-tint) 0%, transparent 55%);
}
.gm-tile:hover{transform:translateY(-4px);border-color:#B8A082;box-shadow:0 16px 40px rgba(150,115,50,0.18)}
.gm-tile:focus-visible{outline:none;border-color:#B8A082;box-shadow:0 0 0 3px rgba(184,160,130,0.30), 0 12px 32px rgba(150,115,50,0.16)}

.gm-tile-emblem{
  width:62px;height:62px;border-radius:18px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#4A0E1C,#3a2e1a);
  border:1px solid rgba(224,194,119,0.35);
  box-shadow:0 6px 16px rgba(120,90,40,0.22), inset 0 1px 0 rgba(255,255,255,0.06);
  position:relative;z-index:1;
}
.gm-tile-emoji{font-size:32px;line-height:1}
.gm-tile-body{flex:1;display:flex;flex-direction:column;gap:6px;position:relative;z-index:1}
.gm-tile-title{font-family:'El Messiri','Cairo',serif;font-size:20px;font-weight:800;color:#4A0E1C;margin:0;line-height:1.2}
.gm-tile-desc{font-size:13px;color:#796A62;margin:0;line-height:1.7;font-weight:500}
.gm-tile-cta{
  display:inline-flex;align-items:center;gap:7px;align-self:flex-start;
  padding:9px 18px;border-radius:99px;
  background:linear-gradient(135deg,#4A0E1C,#3a2e1a);
  color:#D9C9B0;
  font-weight:800;font-size:13px;letter-spacing:.3px;
  border:1px solid rgba(224,194,119,0.30);
  box-shadow:0 5px 16px rgba(120,90,40,0.20);
  transition:all .18s;
  position:relative;z-index:1;
}
.gm-tile:hover .gm-tile-cta{color:#F0D690;transform:translateX(0)}
[dir="rtl"] .gm-tile-cta svg{transform:scaleX(-1)}

/* ── GAME FRAME ── */
.gm-game-head{
  display:flex;align-items:center;justify-content:space-between;gap:14px;
  margin-bottom:18px;
}
.gm-back, .gm-restart{
  display:inline-flex;align-items:center;gap:7px;
  padding:8px 14px;border-radius:10px;
  background:rgba(255,253,247,0.82);border:1.5px solid #D8C49A;
  color:#5A4A30;font-family:inherit;font-size:13px;font-weight:700;
  cursor:pointer;transition:all .15s;
}
.gm-back:hover, .gm-restart:hover{border-color:#B8A082;background:#FFFBF5;color:#4A0E1C}
[dir="rtl"] .gm-back svg{transform:scaleX(-1)}
.gm-game-title{
  flex:1;text-align:center;margin:0;
  font-family:'El Messiri','Cairo',serif;
  font-size:22px;font-weight:800;color:#4A0E1C;
}

/* ── HINT CARD ── */
.gm-hint-card{
  position:relative;
  background:
    radial-gradient(ellipse at 0% 0%, rgba(184,160,130,0.10), transparent 55%),
    linear-gradient(160deg,#FFFBF5 0%,#F7F3EB 100%);
  border:1.5px solid rgba(184,160,130,0.42);
  border-radius:16px;
  padding:16px 20px 14px;
  margin-bottom:18px;
  box-shadow:0 6px 18px rgba(150,115,50,0.10), inset 0 1px 0 rgba(255,255,255,0.55);
  animation:gm-fade .3s ease;
}
.gm-hint-close{
  position:absolute;top:8px;inset-inline-end:8px;
  display:flex;align-items:center;justify-content:center;
  width:26px;height:26px;border-radius:50%;
  background:rgba(255,253,247,0.7);
  border:1px solid rgba(184,160,130,0.30);
  color:#796A62;cursor:pointer;transition:all .15s;
  padding:0;
}
.gm-hint-close:hover{background:#FFFBF5;border-color:#B8A082;color:#4A0E1C}
.gm-hint-close:focus-visible{outline:2px solid #B8A082;outline-offset:2px}

.gm-hint-section{display:flex;flex-direction:column;gap:6px}
.gm-hint-title{
  display:inline-flex;align-items:center;gap:8px;
  font-family:'El Messiri','Cairo',serif;
  font-size:14px;font-weight:800;color:#4A0E1C;letter-spacing:.2px;
}
.gm-hint-ico{
  display:inline-flex;align-items:center;justify-content:center;
  width:22px;height:22px;border-radius:7px;flex-shrink:0;
  background:linear-gradient(135deg,#4A0E1C,#3a2e1a);color:#D9C9B0;
  border:1px solid rgba(224,194,119,0.40);
}
.gm-hint-body{
  margin:0;padding-inline-start:30px;
  font-size:13.5px;line-height:1.85;color:#5A4A30;font-weight:500;
}
.gm-hint-divider{
  height:1px;margin:10px 0;
  background:linear-gradient(90deg,transparent,rgba(184,160,130,0.30),transparent);
}

.gm-hint-pill{
  display:inline-flex;align-items:center;gap:7px;align-self:flex-start;
  padding:7px 14px;border-radius:99px;cursor:pointer;
  background:rgba(255,253,247,0.82);
  border:1.5px solid rgba(184,160,130,0.42);
  color:#796A62;font-family:inherit;font-size:12.5px;font-weight:800;
  margin-bottom:16px;
  transition:all .15s;
}
.gm-hint-pill:hover{background:#FFFBF5;border-color:#B8A082;color:#4A0E1C;transform:translateY(-1px);box-shadow:0 4px 12px rgba(150,115,50,0.12)}
.gm-hint-pill:focus-visible{outline:2px solid #B8A082;outline-offset:2px}

@media(max-width:520px){
  .gm-hint-card{padding:14px 16px 12px;border-radius:14px}
  .gm-hint-body{font-size:12.5px;padding-inline-start:0;margin-top:2px}
  .gm-hint-title{font-size:13px}
}

/* ── STAT ROW ── */
.gm-stat-row{
  display:flex;gap:14px;justify-content:center;flex-wrap:wrap;
  background:rgba(255,253,247,0.7);
  border:1px dashed #D8C49A;border-radius:14px;
  padding:13px 18px;margin-bottom:18px;
}
.gm-stat{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:80px}
.gm-stat-label{font-size:11px;font-weight:700;color:#A9863F;letter-spacing:1px;text-transform:uppercase}
.gm-stat-value{font-size:20px;font-weight:900;color:#4A0E1C}
.gm-stat-value.mono{font-family:'IBM Plex Mono',monospace;letter-spacing:.5px}
.gm-stat-value.hot{color:#C24F4F;animation:gm-pop .25s ease}

.gm-hearts{display:flex;gap:4px;align-items:center;height:24px}
.gm-heart{font-size:20px;color:rgba(107,30,45,0.20);transition:all .2s;line-height:1}
.gm-heart.on{color:#6B1E2D;text-shadow:0 0 6px rgba(163,51,51,0.35)}

/* ── MEMORY GAME ── */
.gm-mem-grid{
  display:grid;grid-template-columns:repeat(4,1fr);gap:12px;
  max-width:600px;margin:0 auto;
  perspective:900px;
}
@media(max-width:520px){.gm-mem-grid{gap:8px;grid-template-columns:repeat(4,1fr)}}

.gm-mcard{
  aspect-ratio:3/4;
  background:transparent;border:none;padding:0;cursor:pointer;
  perspective:900px;
}
.gm-mcard-inner{
  display:block;position:relative;width:100%;height:100%;
  transition:transform .55s cubic-bezier(.45,1.4,.55,1);
  transform-style:preserve-3d;
}
.gm-mcard.flipped .gm-mcard-inner{transform:rotateY(180deg)}
.gm-mcard-back, .gm-mcard-front{
  position:absolute;inset:0;backface-visibility:hidden;
  border-radius:14px;display:flex;align-items:center;justify-content:center;
  font-weight:800;text-align:center;padding:8px;
}
.gm-mcard-back{
  background:linear-gradient(135deg,#4A0E1C,#3a2e1a);
  border:1.5px solid rgba(224,194,119,0.40);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 14px rgba(120,90,40,0.18);
}
.gm-mcard-front{
  transform:rotateY(180deg);
  background:linear-gradient(160deg,#FFFBF5,#F7F3EB);
  border:1.5px solid #D8C49A;
  color:#4A0E1C;font-family:'El Messiri','Cairo',serif;
  font-size:15px;line-height:1.25;
  box-shadow:0 4px 14px rgba(150,115,50,0.10), inset 0 1px 0 rgba(255,255,255,0.55);
}
.gm-mcard.matched .gm-mcard-front{
  background:linear-gradient(160deg,#F6F7E8,#E4ECC2);
  border-color:#7BAE3B;
  color:#2F5A1B;
  animation:gm-glow 1.4s ease-in-out;
}
@media(max-width:520px){.gm-mcard-front{font-size:12px}}

/* ── HUNTER GAME ── */
.gm-hunter-card{
  position:relative;
  max-width:560px;margin:0 auto 22px;
  padding:36px 28px;border-radius:20px;
  background:linear-gradient(160deg,#FFFBF5,#F7F3EB);
  border:1.5px solid #D8C49A;
  box-shadow:0 10px 30px rgba(150,115,50,0.14), inset 0 1px 0 rgba(255,255,255,0.55);
  text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:12px;
  animation:gm-pop .25s ease;
  transition:transform .14s, border-color .14s;
}
.gm-hunter-card.fb-correct{border-color:#3F8A4F;box-shadow:0 10px 30px rgba(63,138,79,0.28)}
.gm-hunter-card.fb-wrong{border-color:#6B1E2D;animation:gm-shake .35s ease}
.gm-hunter-tag{
  font-size:11px;font-weight:800;color:#A9863F;
  letter-spacing:1.5px;text-transform:uppercase;
  background:rgba(194,160,89,0.12);
  border:1px solid rgba(194,160,89,0.30);
  padding:3px 12px;border-radius:99px;
}
.gm-hunter-q{
  font-family:'El Messiri','Cairo',serif;
  font-size:26px;font-weight:700;color:#4A0E1C;line-height:1.4;
}
.gm-hunter-popup{
  position:absolute;top:14px;inset-inline-end:18px;
  font-size:22px;font-weight:900;color:#3F8A4F;
  animation:gm-popup 1s ease forwards;pointer-events:none;
}

.gm-hunter-choices{
  display:grid;grid-template-columns:repeat(5,1fr);gap:10px;
  max-width:720px;margin:0 auto;
}
@media(max-width:600px){.gm-hunter-choices{grid-template-columns:repeat(3,1fr)}}
@media(max-width:380px){.gm-hunter-choices{grid-template-columns:repeat(2,1fr)}}

.gm-hunter-btn{
  padding:14px 12px;border-radius:14px;cursor:pointer;
  background:linear-gradient(160deg,#FFFBF5,#F7F3EB);
  border:1.5px solid #D8C49A;
  font-family:'El Messiri','Cairo',serif;font-size:16px;font-weight:700;color:#4A0E1C;
  transition:all .14s cubic-bezier(.22,1,.36,1);
  box-shadow:0 3px 10px rgba(150,115,50,0.10), inset 0 1px 0 rgba(255,255,255,0.55);
}
.gm-hunter-btn:hover:not(:disabled){border-color:#B8A082;transform:translateY(-2px);box-shadow:0 8px 18px rgba(150,115,50,0.18)}
.gm-hunter-btn:disabled{cursor:default}
.gm-hunter-btn.st-right{background:linear-gradient(160deg,#E2F0CB,#C9E29B);border-color:#7BAE3B;color:#2F5A1B}
.gm-hunter-btn.st-wrong{background:linear-gradient(160deg,#F4D2D2,#E8A6A6);border-color:#6B1E2D;color:#7A1818;animation:gm-shake .35s ease}
.gm-hunter-btn.st-reveal{background:linear-gradient(160deg,#E2F0CB,#C9E29B);border-color:#7BAE3B;color:#2F5A1B;opacity:.85}

/* ── SPEED GAME ── */
.gm-speed-bar{
  height:8px;border-radius:99px;overflow:hidden;
  background:rgba(194,160,89,0.16);
  border:1px solid rgba(194,160,89,0.30);
  margin-bottom:18px;
}
.gm-speed-bar-fill{height:100%;border-radius:99px;transition:width .9s linear, background .3s ease}

.gm-speed-card{
  position:relative;
  max-width:480px;margin:0 auto 22px;
  padding:40px 28px;border-radius:22px;
  background:linear-gradient(160deg,#FFFBF5,#F7F3EB);
  border:1.5px solid #D8C49A;
  box-shadow:0 12px 32px rgba(150,115,50,0.16), inset 0 1px 0 rgba(255,255,255,0.55);
  text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:14px;
  animation:gm-pop .22s ease;
}
.gm-speed-card.fb-right{border-color:#3F8A4F;box-shadow:0 12px 32px rgba(63,138,79,0.32)}
.gm-speed-card.fb-wrong{border-color:#6B1E2D;animation:gm-shake .3s ease}
.gm-speed-tag{
  font-size:11px;font-weight:800;color:#A9863F;
  letter-spacing:1.5px;text-transform:uppercase;
  background:rgba(194,160,89,0.12);
  border:1px solid rgba(194,160,89,0.30);
  padding:3px 12px;border-radius:99px;
}
.gm-speed-word{
  font-family:'El Messiri','Cairo',serif;
  font-size:42px;font-weight:800;color:#4A0E1C;
  letter-spacing:-.5px;line-height:1.1;
}
@media(max-width:520px){.gm-speed-word{font-size:30px}}
.gm-speed-streak{
  position:absolute;top:14px;inset-inline-end:18px;
  font-size:13px;font-weight:800;color:#C24F4F;
}

.gm-speed-choices{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:560px;margin:0 auto}
.gm-speed-btn{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  padding:22px 18px;border-radius:18px;cursor:pointer;
  font-family:inherit;font-weight:800;
  background:linear-gradient(135deg,#4A0E1C,#3a2e1a);color:#D9C9B0;
  border:1.5px solid rgba(224,194,119,0.40);
  box-shadow:0 8px 22px rgba(120,90,40,0.22), inset 0 1px 0 rgba(255,255,255,0.06);
  transition:transform .14s cubic-bezier(.22,1,.36,1), box-shadow .14s;
}
.gm-speed-btn:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(120,90,40,0.32);color:#F0D690}
.gm-speed-btn:active{transform:translateY(0)}
.gm-speed-btn-emoji{font-size:26px;line-height:1}
.gm-speed-btn-label{font-size:16px;letter-spacing:.5px}

/* ── WIN MODAL ── */
.gm-win-backdrop{
  position:fixed;inset:0;z-index:90;
  display:flex;align-items:center;justify-content:center;padding:18px;
  background:rgba(40,30,12,0.55);backdrop-filter:blur(6px);
  animation:gm-fade .25s ease;
}
.gm-win-card{
  max-width:420px;width:100%;
  background:linear-gradient(160deg,#FFFBF5,#F7F3EB);
  border:1.5px solid #B8A082;border-radius:22px;
  padding:30px 28px;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:12px;
  box-shadow:0 28px 80px rgba(80,60,20,0.35), inset 0 1px 0 rgba(255,255,255,0.55);
  animation:gm-pop .35s cubic-bezier(.22,1.4,.36,1);
}
.gm-win-title{
  font-family:'El Messiri','Cairo',serif;font-size:26px;font-weight:800;
  color:#4A0E1C;letter-spacing:-.3px;
}
.gm-win-title.good{color:#2F5A1B}
.gm-win-title.bad{color:#6B1E2D}
.gm-win-emoji{font-size:42px;line-height:1;filter:drop-shadow(0 6px 16px rgba(0,0,0,0.12))}
.gm-win-sub{font-size:14px;color:#796A62;line-height:1.65}
.gm-win-stats{display:flex;align-items:center;gap:12px;font-size:13.5px;color:#5A4A30;font-weight:700;flex-wrap:wrap;justify-content:center}
.gm-win-stats.stacked{flex-direction:column;gap:6px}
.gm-win-stats strong{color:#4A0E1C;font-weight:900}
.gm-win-sep{width:4px;height:4px;border-radius:50%;background:rgba(194,160,89,0.6)}

.gm-stars{display:flex;gap:6px}
.gm-star{font-size:34px;color:rgba(194,160,89,0.30);transition:all .18s}
.gm-star.on{color:#D9C9B0;text-shadow:0 0 16px rgba(224,194,119,0.6);transform:scale(1.08)}

.gm-win-actions{display:flex;gap:10px;margin-top:6px;flex-wrap:wrap;justify-content:center}
.gm-btn-primary{
  display:inline-flex;align-items:center;gap:7px;
  padding:11px 22px;border-radius:11px;cursor:pointer;
  background:linear-gradient(135deg,#4A0E1C,#3a2e1a);color:#D9C9B0;
  border:1px solid rgba(224,194,119,0.50);
  font-family:inherit;font-size:13.5px;font-weight:800;letter-spacing:.3px;
  box-shadow:0 6px 18px rgba(120,90,40,0.22);
  transition:all .15s;
}
.gm-btn-primary:hover{color:#F0D690;transform:translateY(-1px);box-shadow:0 10px 24px rgba(120,90,40,0.32)}
.gm-btn-ghost{
  display:inline-flex;align-items:center;gap:7px;
  padding:11px 20px;border-radius:11px;cursor:pointer;
  background:rgba(255,255,255,0.6);color:#5A4A30;
  border:1.5px solid #D8C49A;
  font-family:inherit;font-size:13.5px;font-weight:700;
  transition:all .15s;
}
.gm-btn-ghost:hover{background:#FFFBF5;border-color:#B8A082;color:#4A0E1C}

/* ── COLLECTOR GAME ── */

@keyframes gm-col-pulse{0%,100%{box-shadow:0 0 0 0 rgba(224,194,119,0.55), 0 6px 18px rgba(120,90,40,0.30);}50%{box-shadow:0 0 0 12px rgba(224,194,119,0.00), 0 6px 18px rgba(120,90,40,0.30);}}
@keyframes gm-col-itempulse{0%,100%{opacity:.9}50%{opacity:1}}
@keyframes gm-col-shrink{from{transform:translate(-50%,-50%) scale(1);opacity:1}to{transform:translate(-50%,-50%) scale(.4);opacity:0}}
@keyframes gm-col-popupflt{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}25%{opacity:1;transform:translate(-50%,-100%) scale(1.1)}100%{opacity:0;transform:translate(-50%,-200%) scale(.9)}}

.gm-col-target-pill{
  display:inline-flex;align-items:center;justify-content:center;
  padding:6px 16px;border-radius:99px;
  background:linear-gradient(135deg,#4A0E1C,#3a2e1a);color:#D9C9B0;
  font-family:'El Messiri','Cairo',serif;font-size:18px;font-weight:800;
  letter-spacing:.4px;
  border:1px solid rgba(224,194,119,0.45);
  box-shadow:0 4px 14px rgba(120,90,40,0.22), inset 0 1px 0 rgba(255,255,255,0.06);
}

.gm-col-map{
  position:relative;
  width:100%;max-width:760px;margin:0 auto;
  aspect-ratio:5 / 3.2;
  border-radius:20px;
  background:
    radial-gradient(ellipse at 50% 0%, #FFFBF5 0%, transparent 55%),
    radial-gradient(ellipse at 30% 100%, rgba(184,160,130,0.10), transparent 50%),
    linear-gradient(160deg,#F7F3EB 0%,#EDE3CC 100%);
  border:1.5px dashed #D8C49A;
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.55), 0 10px 28px rgba(150,115,50,0.12);
  overflow:hidden;
  user-select:none;
  -webkit-tap-highlight-color:transparent;
}
/* Subtle grid lines for an "arena" feel */
.gm-col-map::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background-image:
    repeating-linear-gradient(0deg, rgba(194,160,89,0.08) 0 1px, transparent 1px 56px),
    repeating-linear-gradient(90deg, rgba(194,160,89,0.08) 0 1px, transparent 1px 56px);
  opacity:.55;
}
/* Soft corner emblems */
.gm-col-map::after{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(circle at 8% 12%, rgba(184,160,130,0.18), transparent 9%),
    radial-gradient(circle at 92% 12%, rgba(184,160,130,0.18), transparent 9%),
    radial-gradient(circle at 8% 88%, rgba(184,160,130,0.18), transparent 9%),
    radial-gradient(circle at 92% 88%, rgba(184,160,130,0.18), transparent 9%);
}

.gm-col-item{
  position:absolute;transform:translate(-50%,-50%);
  display:inline-flex;align-items:center;gap:7px;
  padding:8px 14px;border-radius:14px;
  background:linear-gradient(160deg,#FFFBF5,#F7F3EB);
  border:1.5px solid #D8C49A;
  font-family:'El Messiri','Cairo',serif;
  font-size:14px;font-weight:700;color:#4A0E1C;
  box-shadow:0 4px 12px rgba(150,115,50,0.14), inset 0 1px 0 rgba(255,255,255,0.55);
  white-space:nowrap;
  pointer-events:none;
  animation:gm-col-itempulse 2.4s ease-in-out infinite;
  transition:transform .12s ease;
  will-change:left,top;
  z-index:2;
}
.gm-col-item-dot{
  width:6px;height:6px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#E5C57F 0%,#B8A082 55%,#9A7833 100%);
  box-shadow:0 0 0 2px rgba(255,253,247,0.95), 0 0 0 3px rgba(194,160,89,0.45);
  flex-shrink:0;
}
.gm-col-item-text{line-height:1.2}
.gm-col-item.collected{animation:gm-col-shrink .35s ease forwards;pointer-events:none}
@media(max-width:520px){.gm-col-item{font-size:12px;padding:6px 11px;border-radius:11px}.gm-col-item-dot{width:5px;height:5px}}

.gm-col-player{
  position:absolute;transform:translate(-50%,-50%);
  width:42px;height:42px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  pointer-events:none;
  z-index:5;
  will-change:left,top;
  transition:left 50ms linear, top 50ms linear;
}
.gm-col-player-pulse{
  position:absolute;inset:-6px;border-radius:50%;
  border:2px solid rgba(224,194,119,0.55);
  animation:gm-col-pulse 1.8s ease-out infinite;
}
.gm-col-player-core{
  position:relative;width:30px;height:30px;border-radius:50%;
  background:radial-gradient(circle at 35% 32%,#5a4a30 0%,#4A0E1C 55%,#32101A 100%);
  border:2px solid #D9C9B0;
  box-shadow:
    0 0 0 3px rgba(224,194,119,0.18),
    0 6px 18px rgba(0,0,0,0.30),
    inset 0 1px 0 rgba(255,255,255,0.10);
}
@media(max-width:520px){
  .gm-col-player{width:36px;height:36px}
  .gm-col-player-core{width:26px;height:26px}
}

.gm-col-popup{
  position:absolute;transform:translate(-50%,-50%);
  font-family:'IBM Plex Mono','Cairo',monospace;
  font-size:20px;font-weight:900;
  pointer-events:none;
  z-index:9;
  animation:gm-col-popupflt .9s ease forwards;
}
.gm-col-popup.good{color:#2F7A40;text-shadow:0 2px 8px rgba(63,138,79,0.30)}
.gm-col-popup.bad{color:#6B1E2D;text-shadow:0 2px 8px rgba(163,51,51,0.30)}

/* Controls */
.gm-col-controls{
  margin-top:18px;display:flex;align-items:center;justify-content:space-between;
  gap:14px;flex-wrap:wrap;
}
.gm-col-hint{
  margin:0;font-size:12.5px;font-weight:700;color:#796A62;letter-spacing:.3px;
}

.gm-dpad{
  display:grid;
  grid-template-columns:repeat(3,42px);
  grid-template-rows:repeat(3,42px);
  gap:6px;
  user-select:none;-webkit-user-select:none;
  touch-action:none;
}
.gm-dpad-btn{
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#4A0E1C,#3a2e1a);
  color:#D9C9B0;
  border:1.5px solid rgba(224,194,119,0.40);
  border-radius:12px;
  font-size:14px;font-weight:900;font-family:inherit;
  cursor:pointer;-webkit-tap-highlight-color:transparent;
  box-shadow:0 4px 12px rgba(120,90,40,0.18), inset 0 1px 0 rgba(255,255,255,0.06);
  transition:transform .08s ease, color .12s, box-shadow .12s;
}
.gm-dpad-btn:active{transform:scale(0.92);color:#F0D690;box-shadow:0 2px 6px rgba(120,90,40,0.30) inset}
.gm-dpad-btn.up{grid-column:2;grid-row:1}
.gm-dpad-btn.left{grid-column:1;grid-row:2}
.gm-dpad-btn.right{grid-column:3;grid-row:2}
.gm-dpad-btn.down{grid-column:2;grid-row:3}
.gm-dpad-center{
  grid-column:2;grid-row:2;
  display:block;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#E5C57F 0%,#B8A082 55%,#9A7833 100%);
  align-self:center;justify-self:center;
  width:14px;height:14px;
  box-shadow:0 0 0 3px rgba(255,253,247,0.85), 0 0 0 4px rgba(194,160,89,0.45);
}

@media(max-width:520px){
  .gm-col-controls{justify-content:center}
  .gm-col-hint-keys{display:none}
  .gm-dpad{grid-template-columns:repeat(3,52px);grid-template-rows:repeat(3,52px)}
  .gm-dpad-btn{font-size:16px}
}
@media(min-width:760px){
  /* Desktop: keep the D-pad visible as a fallback, but smaller */
  .gm-dpad{grid-template-columns:repeat(3,38px);grid-template-rows:repeat(3,38px)}
}
`;
