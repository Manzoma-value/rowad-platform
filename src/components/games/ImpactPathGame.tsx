"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Flag,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";

type Lang = "ar" | "sq";
type Localized = { ar: string; sq: string };
type Mission = {
  id: string;
  concept: Localized;
  maqsad: Localized;
  situation: Localized;
  question: Localized;
  choices: [Localized, Localized, Localized];
  correct: number;
  impact: Localized;
  trait: Localized;
  insight: Localized;
};

const MISSIONS: Mission[] = [
  {
    id: "intention",
    concept: { ar: "النية المثمرة", sq: "Nijeti frytdhënës" },
    maqsad: { ar: "النفس", sq: "Vetja" },
    situation: {
      ar: "قرر فريقك تجهيز مساحة قراءة مشتركة، لكن كل شخص بدأ يقترح أعمالًا مختلفة.",
      sq: "Grupi yt vendosi të përgatisë një hapësirë të përbashkët leximi, por secili nisi të propozojë punë të ndryshme.",
    },
    question: {
      ar: "ما القرار الذي يحوّل الفكرة إلى نية مثمرة؟",
      sq: "Cili vendim e kthen idenë në një nijet frytdhënës?",
    },
    choices: [
      { ar: "نبدأ بالأعمال الأسهل حتى نشعر بسرعة الإنجاز.", sq: "Të fillojmë me punët më të lehta që të ndiejmë shpejt arritjen." },
      { ar: "نحدد من نخدم، وما التغيير المطلوب، وعلامة اكتمال واضحة قبل توزيع المهام.", sq: "Të përcaktojmë kë i shërbejmë, ndryshimin e synuar dhe një shenjë të qartë përfundimi para ndarjes së detyrave." },
      { ar: "نوزع المهام فورًا بالتساوي، مهما كانت الحاجة.", sq: "T'i ndajmë detyrat menjëherë në mënyrë të barabartë, pavarësisht nevojës." },
    ],
    correct: 1,
    impact: { ar: "هدف مشترك وعمل أقل هدرًا", sq: "Qëllim i përbashkët dhe më pak punë e humbur" },
    trait: { ar: "الدراية", sq: "Drajah" },
    insight: {
      ar: "النية المثمرة لا تكتفي بالرغبة الطيبة؛ بل تربط القصد بالمستفيد والأثر ودليل الإنجاز.",
      sq: "Nijeti frytdhënës nuk mjaftohet me dëshirën e mirë; ai lidh qëllimin me pjesëmarrësin, ndikimin dhe dëshminë e arritjes.",
    },
  },
  {
    id: "time-path",
    concept: { ar: "مسار الزمن", sq: "Rrjedha e Kohës" },
    maqsad: { ar: "العقل", sq: "Mendja" },
    situation: {
      ar: "يتكرر تأخر تسليم مهمة المجموعة كل أسبوع، ويقترح البعض مجرد العمل لساعات أطول.",
      sq: "Dorëzimi i detyrës së grupit vonohet çdo javë dhe disa propozojnë thjesht të punohet më gjatë.",
    },
    question: {
      ar: "أي خطوة تكشف مسار المشكلة بدل علاج ظاهرها فقط؟",
      sq: "Cili hap zbulon rrjedhën e problemit, jo vetëm pamjen e tij?",
    },
    choices: [
      { ar: "نرسم ما يحدث من بداية المهمة حتى التسليم ونحدد لحظة التعطل المتكررة.", sq: "Të vizatojmë çfarë ndodh nga fillimi deri në dorëzim dhe të gjejmë çastin ku përsëritet pengesa." },
      { ar: "نضيف اجتماعًا طويلًا في نهاية كل أسبوع.", sq: "Të shtojmë një takim të gjatë në fund të çdo jave." },
      { ar: "ننتظر أسبوعًا آخر لعل المشكلة تختفي.", sq: "Të presim edhe një javë, ndoshta problemi zhduket." },
    ],
    correct: 0,
    impact: { ar: "تدخل في اللحظة المؤثرة لا بعد فواتها", sq: "Ndërhyrje në çastin vendimtar, jo pasi ai kalon" },
    trait: { ar: "الانتباه", sq: "Vëmendja" },
    insight: {
      ar: "فهم المسار الزمني يكشف أين يبدأ التغير وأين يمكن لتدخل صغير أن يصنع فرقًا كبيرًا.",
      sq: "Kuptimi i rrjedhës së kohës tregon ku nis ndryshimi dhe ku një ndërhyrje e vogël mund të sjellë dallim të madh.",
    },
  },
  {
    id: "strategy",
    concept: { ar: "التفكير الاستراتيجي", sq: "Mendimi Strategjik" },
    maqsad: { ar: "العقل", sq: "Mendja" },
    situation: {
      ar: "لديكم يوم واحد وموارد محدودة لإطلاق مبادرة توعوية، بينما قائمة الأفكار طويلة.",
      sq: "Keni një ditë dhe burime të kufizuara për një nismë ndërgjegjësimi, ndërsa lista e ideve është e gjatë.",
    },
    question: {
      ar: "ما الاختيار الأكثر استراتيجية؟",
      sq: "Cila zgjedhje është më strategjike?",
    },
    choices: [
      { ar: "ننشر كل الأفكار بسرعة حتى لا نحذف شيئًا.", sq: "T'i publikojmë shpejt të gjitha idetë që të mos heqim asgjë." },
      { ar: "نختار الفكرة الأكثر إعجابًا داخل الفريق.", sq: "Të zgjedhim idenë që pëlqehet më shumë brenda grupit." },
      { ar: "نحدد الأثر الأهم، ثم نختار أقل فعل قادر على تحقيقه ضمن الوقت والموارد.", sq: "Të përcaktojmë ndikimin më të rëndësishëm, pastaj veprimin më të vogël që e arrin brenda kohës dhe burimeve." },
    ],
    correct: 2,
    impact: { ar: "تركيز الموارد على النتيجة الأعلى قيمة", sq: "Përqendrim i burimeve te rezultati me vlerën më të madhe" },
    trait: { ar: "البصيرة", sq: "Mprehtësia" },
    insight: {
      ar: "الاستراتيجية اختيار واعٍ للأولوية والمسار، وليست جمع أكبر عدد من الأنشطة.",
      sq: "Strategjia është zgjedhje e vetëdijshme e përparësisë dhe rrugës, jo grumbullim i sa më shumë aktiviteteve.",
    },
  },
  {
    id: "social-structure",
    concept: { ar: "الهياكل الاجتماعية", sq: "Strukturat Shoqërore" },
    maqsad: { ar: "النسل", sq: "Pasardhësit" },
    situation: {
      ar: "في مشروع جماعي، يتحدث شخصان دائمًا بينما بقية الأعضاء لا يعرفون أدوارهم.",
      sq: "Në një projekt grupi, dy persona flasin gjithmonë, ndërsa të tjerët nuk i njohin rolet e tyre.",
    },
    question: {
      ar: "أي فعل يبني هيكلًا اجتماعيًا صحيًا؟",
      sq: "Cili veprim ndërton një strukturë shoqërore të shëndetshme?",
    },
    choices: [
      { ar: "نحدد الأدوار، ومسار القرار، ونقطة مساهمة واضحة لكل عضو مع مراجعة دورية.", sq: "Të përcaktojmë rolet, rrugën e vendimit dhe një kontribut të qartë për secilin, me rishikim periodik." },
      { ar: "نطلب من الأكثر خبرة تنفيذ كل شيء لضمان الجودة.", sq: "T'i kërkojmë më me përvojë të bëjë gjithçka për të garantuar cilësinë." },
      { ar: "نترك الفريق يتكيف وحده من غير اتفاقات.", sq: "Ta lëmë grupin të përshtatet vetë pa marrëveshje." },
    ],
    correct: 0,
    impact: { ar: "مشاركة أوسع وقرارات أوضح", sq: "Pjesëmarrje më e gjerë dhe vendime më të qarta" },
    trait: { ar: "التعاون", sq: "Bashkëpunimi" },
    insight: {
      ar: "الهيكل الجيد لا يلغي المرونة؛ بل يجعل المسؤولية والمشاركة وطريق القرار مرئية للجميع.",
      sq: "Struktura e mirë nuk e heq fleksibilitetin; ajo e bën përgjegjësinë, pjesëmarrjen dhe rrugën e vendimit të dukshme për të gjithë.",
    },
  },
  {
    id: "opportunity-risk",
    concept: { ar: "التوعية بالفرص والتهديدات", sq: "Ndërgjegjësimi për Mundësitë & Kërcënimet" },
    maqsad: { ar: "المال", sq: "Pasuria" },
    situation: {
      ar: "عرض شريك جديد دعم مبادرتكم بسرعة، لكن شروط التعاون وتأثيره طويل المدى غير واضحة.",
      sq: "Një partner i ri ofroi ta mbështesë shpejt nismën tuaj, por kushtet dhe ndikimi afatgjatë nuk janë të qarta.",
    },
    question: {
      ar: "كيف تتعاملون مع الفرصة بوعي؟",
      sq: "Si ta trajtoni mundësinë me vetëdije?",
    },
    choices: [
      { ar: "نرفض مباشرة لأن كل جديد يحمل مخاطرة.", sq: "Ta refuzojmë menjëherë sepse çdo gjë e re sjell rrezik." },
      { ar: "نقبل فورًا قبل أن تضيع الفرصة.", sq: "Ta pranojmë menjëherë para se të humbasë mundësia." },
      { ar: "نوازن المنفعة والمخاطر، نوضح الشروط، ثم نختبر تعاونًا محدودًا بمؤشرات واضحة.", sq: "Të peshojmë dobinë dhe rreziqet, të qartësojmë kushtet dhe të provojmë bashkëpunim të kufizuar me tregues të qartë." },
    ],
    correct: 2,
    impact: { ar: "استفادة محسوبة مع حماية الموارد", sq: "Përfitim i matur duke mbrojtur burimet" },
    trait: { ar: "الحكمة", sq: "Urtësia" },
    insight: {
      ar: "الوعي لا يعني الخوف من التهديد ولا الاندفاع خلف الفرصة؛ بل رؤية الاثنين واتخاذ خطوة قابلة للتعلم.",
      sq: "Vetëdija nuk do të thotë frikë nga kërcënimi apo nxitim pas mundësisë; ajo i sheh të dyja dhe zgjedh një hap nga i cili mund të mësohet.",
    },
  },
  {
    id: "pdca",
    concept: { ar: "خطط، أنجز، ادرس، أنفذ", sq: "Plano, Realizo, Studio, Zbato" },
    maqsad: { ar: "النفس", sq: "Vetja" },
    situation: {
      ar: "نفذتم تجربة صغيرة، ونجح جزء منها بينما لم يشارك بعض المستهدفين كما توقعتم.",
      sq: "Zbatuat një provë të vogël; një pjesë pati sukses, por disa nga të synuarit nuk morën pjesë siç prisnit.",
    },
    question: {
      ar: "ما الخطوة التي تكمل دورة التعلم؟",
      sq: "Cili hap e plotëson ciklin e të mësuarit?",
    },
    choices: [
      { ar: "نكرر الخطة نفسها لأن جزءًا منها نجح.", sq: "Ta përsërisim të njëjtin plan sepse një pjesë pati sukses." },
      { ar: "نقارن الدليل بالهدف، نفهم سبب الفجوة، نعدل الفعل، ثم نجرب من جديد.", sq: "Ta krahasojmë dëshminë me synimin, të kuptojmë boshllëkun, të përmirësojmë veprimin dhe të provojmë sërish." },
      { ar: "نكتب تقريرًا نهائيًا ونغلق المبادرة.", sq: "Të shkruajmë raportin përfundimtar dhe ta mbyllim nismën." },
    ],
    correct: 1,
    impact: { ar: "تحسين مستمر قائم على الدليل", sq: "Përmirësim i vazhdueshëm i mbështetur në dëshmi" },
    trait: { ar: "الإتقان", sq: "Përsosmëria" },
    insight: {
      ar: "اكتمال العمل ليس نهاية التعلم؛ دراسة الدليل وتعديل الفعل هما ما يحول التجربة إلى نمو.",
      sq: "Përfundimi i punës nuk është fundi i të mësuarit; studimi i dëshmisë dhe përmirësimi i veprimit e kthejnë përvojën në zhvillim.",
    },
  },
];

const COPY = {
  ar: {
    eyebrow: "مغامرة تطبيقية قصيرة",
    title: "رحلة الأثر",
    subtitle: "حوّل المفهوم إلى قرار، والقرار إلى أثر يمكن رؤيته.",
    intro: "ستواجه ستة مواقف واقعية. في كل محطة اختر الفعل الذي يخدم المقصد ويحوّل المفهوم إلى أثر واضح. بعد كل اختيار سترى السمة التي ينمّيها القرار.",
    start: "ابدأ الرحلة",
    back: "العودة إلى أدوات التعلم",
    practice: "تدريب للتعلم — وليس تقييمًا للسمات",
    stations: "6 محطات",
    minutes: "4 دقائق",
    decisions: "قرارات واقعية",
    station: (n: number) => `المحطة ${n}`,
    score: "النقاط",
    streak: "السلسلة",
    concept: "المفهوم",
    maqsad: "المقصد",
    situation: "الموقف",
    choose: "اختر الفعل الأقرب لصناعة الأثر",
    correct: "قرار مؤثر!",
    rethink: "فكر في الأثر الأبعد",
    selected: "اختيارك",
    bestAction: "الفعل الأنسب",
    impact: "الأثر المرئي",
    trait: "السمة التي تُنمّى",
    why: "لماذا؟",
    next: "المحطة التالية",
    finish: "أكمل الرحلة",
    completeEyebrow: "وصلت إلى نهاية الطريق",
    completeTitle: "أكملت رحلة الأثر",
    completeSub: "أصبحت أقرب إلى رؤية السلسلة كاملة: مفهوم، فعل، أثر، ثم سمة تنمو مع التكرار.",
    correctOf: (n: number) => `${n} من 6 قرارات مؤثرة`,
    bestStreak: "أفضل سلسلة",
    stars: "نجوم الرحلة",
    qualification: "قدرتك التي تدربت عليها",
    qualificationText: "تمييز الفعل الذي يحوّل المفهوم إلى أثر قابل للملاحظة، وربط هذا الأثر بالسمة التي ينمّيها.",
    again: "أعد الرحلة",
    best: (n: number) => `أفضل نتيجة: ${n}`,
  },
  sq: {
    eyebrow: "Aventurë e shkurtër praktike",
    title: "Rruga e Ndikimit",
    subtitle: "Ktheje konceptin në vendim dhe vendimin në ndikim të dukshëm.",
    intro: "Do të përballesh me gjashtë situata reale. Në çdo stacion zgjidh veprimin që i shërben qëllimit dhe e kthen konceptin në ndikim të qartë. Pas çdo zgjedhjeje do të shohësh tiparin që zhvillon vendimi.",
    start: "Nis rrugëtimin",
    back: "Kthehu te mjetet mësimore",
    practice: "Ushtrim për të mësuar — jo vlerësim tiparesh",
    stations: "6 stacione",
    minutes: "4 minuta",
    decisions: "Vendime reale",
    station: (n: number) => `Stacioni ${n}`,
    score: "Pikët",
    streak: "Vargu",
    concept: "Koncepti",
    maqsad: "Qëllimi",
    situation: "Situata",
    choose: "Zgjidh veprimin që krijon ndikimin më të mirë",
    correct: "Vendim me ndikim!",
    rethink: "Mendo për ndikimin më të largët",
    selected: "Zgjedhja jote",
    bestAction: "Veprimi më i përshtatshëm",
    impact: "Ndikimi i dukshëm",
    trait: "Tipari që zhvillohet",
    why: "Pse?",
    next: "Stacioni tjetër",
    finish: "Përfundo rrugëtimin",
    completeEyebrow: "Arrite në fund të rrugës",
    completeTitle: "E përfundove Rrugën e Ndikimit",
    completeSub: "Tani je më afër ta shohësh të gjithë zinxhirin: koncept, veprim, ndikim dhe tipar që zhvillohet me përsëritje.",
    correctOf: (n: number) => `${n} nga 6 vendime me ndikim`,
    bestStreak: "Vargu më i mirë",
    stars: "Yjet e rrugëtimit",
    qualification: "Aftësia që ushtrove",
    qualificationText: "Të dallosh veprimin që e kthen konceptin në ndikim të vëzhgueshëm dhe ta lidhësh atë ndikim me tiparin që zhvillon.",
    again: "Rinis rrugëtimin",
    best: (n: number) => `Rezultati më i mirë: ${n}`,
  },
};

const loc = (value: Localized, lang: Lang) => value[lang];

export default function ImpactPathGame({
  lang,
  onBack,
  onComplete,
}: {
  lang: Lang;
  onBack: () => void;
  onComplete: (score: number, completedStrongly: boolean, meta: Record<string, unknown>) => void;
}) {
  const T = COPY[lang];
  const [phase, setPhase] = useState<"intro" | "play" | "complete">("intro");
  const [missionIndex, setMissionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const submittedRef = useRef(false);
  const mission = MISSIONS[missionIndex];
  const answeredCorrectly = selected === mission.correct;
  const stars = useMemo(() => correctCount >= 5 ? 3 : correctCount >= 3 ? 2 : 1, [correctCount]);

  function returnToTop() {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  }

  function start() {
    submittedRef.current = false;
    setMissionIndex(0);
    setSelected(null);
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setPhase("play");
    returnToTop();
  }

  function choose(index: number) {
    if (selected !== null) return;
    const isCorrect = index === mission.correct;
    setSelected(index);
    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((current) => Math.max(current, nextStreak));
      setCorrectCount((current) => current + 1);
      setScore((current) => current + 100 + Math.min(nextStreak - 1, 4) * 20);
    } else {
      setStreak(0);
    }
  }

  function advance() {
    if (selected === null) return;
    if (missionIndex < MISSIONS.length - 1) {
      setMissionIndex((current) => current + 1);
      setSelected(null);
      returnToTop();
      return;
    }

    setPhase("complete");
    returnToTop();
    const nextBest = Math.max(bestScore ?? 0, score);
    if (nextBest !== bestScore) {
      window.localStorage.setItem("impactPathBest", String(nextBest));
      setBestScore(nextBest);
    }
    if (!submittedRef.current) {
      submittedRef.current = true;
      onComplete(score, correctCount >= 4, {
        correct: correctCount,
        total: MISSIONS.length,
        best_streak: bestStreak,
        stars,
      });
    }
  }

  const PreviousIcon = lang === "ar" ? ArrowRight : ArrowLeft;
  const NextIcon = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <main className="ip-shell" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="ip-atmosphere ip-atmosphere-one" />
      <div className="ip-atmosphere ip-atmosphere-two" />

      {phase === "intro" && (
        <section className="ip-intro">
          <button className="ip-back" type="button" onClick={onBack}>
            <PreviousIcon size={16} /> {T.back}
          </button>

          <div className="ip-intro-card">
            <div className="ip-compass" aria-hidden><Compass size={46} strokeWidth={1.5} /></div>
            <div className="ip-kicker"><Sparkles size={14} /> {T.eyebrow}</div>
            <h1>{T.title}</h1>
            <p className="ip-lead">{T.subtitle}</p>
            <p className="ip-intro-copy">{T.intro}</p>

            <div className="ip-road-preview" aria-hidden>
              {MISSIONS.map((item, index) => (
                <div className="ip-preview-stop" key={item.id}>
                  <span>{index + 1}</span>
                  {index < MISSIONS.length - 1 && <i />}
                </div>
              ))}
              <Flag size={22} />
            </div>

            <div className="ip-facts">
              <span><Target size={16} /> {T.stations}</span>
              <span><Compass size={16} /> {T.minutes}</span>
              <span><Lightbulb size={16} /> {T.decisions}</span>
            </div>
            <div className="ip-practice"><Check size={14} /> {T.practice}</div>
            <button className="ip-primary ip-start" type="button" onClick={start}>
              {T.start} <NextIcon size={18} />
            </button>
            {bestScore !== null && <span className="ip-best">{T.best(bestScore)}</span>}
          </div>
        </section>
      )}

      {phase === "play" && (
        <section className="ip-game">
          <header className="ip-game-head">
            <button className="ip-back" type="button" onClick={onBack}>
              <PreviousIcon size={16} /> {T.back}
            </button>
            <div className="ip-game-brand"><Compass size={20} /><strong>{T.title}</strong></div>
            <div className="ip-stats">
              <span><small>{T.score}</small><strong>{score}</strong></span>
              <span><small>{T.streak}</small><strong>×{streak}</strong></span>
            </div>
          </header>

          <div className="ip-road" aria-label={`${missionIndex + 1} / ${MISSIONS.length}`}>
            {MISSIONS.map((item, index) => {
              const state = index < missionIndex ? "done" : index === missionIndex ? "current" : "future";
              return (
                <div className={`ip-road-stop is-${state}`} key={item.id}>
                  <span>{state === "done" ? <Check size={14} /> : index + 1}</span>
                  {index < MISSIONS.length - 1 && <i><b /></i>}
                </div>
              );
            })}
            <Flag className={missionIndex === MISSIONS.length - 1 ? "is-near" : ""} size={20} />
          </div>

          <article className="ip-mission-card" key={mission.id}>
            <div className="ip-mission-top">
              <span className="ip-station">{T.station(missionIndex + 1)}</span>
              <div className="ip-tags">
                <span><small>{T.concept}</small>{loc(mission.concept, lang)}</span>
                <span><small>{T.maqsad}</small>{loc(mission.maqsad, lang)}</span>
              </div>
            </div>

            <div className="ip-situation">
              <span className="ip-situation-icon"><Compass size={21} /></span>
              <div><small>{T.situation}</small><p>{loc(mission.situation, lang)}</p></div>
            </div>

            <h2>{loc(mission.question, lang)}</h2>
            <p className="ip-choose-hint">{T.choose}</p>

            <div className="ip-choices">
              {mission.choices.map((choice, index) => {
                const isSelected = selected === index;
                const isCorrect = index === mission.correct;
                const revealedClass = selected === null ? "" : isCorrect ? " is-correct" : isSelected ? " is-wrong" : " is-muted";
                return (
                  <button
                    type="button"
                    key={choice.ar}
                    className={`ip-choice${revealedClass}`}
                    onClick={() => choose(index)}
                    disabled={selected !== null}
                    aria-pressed={isSelected}
                  >
                    <span className="ip-choice-letter">{String.fromCharCode(65 + index)}</span>
                    <span>{loc(choice, lang)}</span>
                    {selected !== null && isCorrect && <Check className="ip-choice-result" size={18} />}
                    {selected !== null && isSelected && !isCorrect && <X className="ip-choice-result" size={18} />}
                  </button>
                );
              })}
            </div>

            {selected !== null && (
              <div className={`ip-reveal ${answeredCorrectly ? "is-right" : "is-rethink"}`}>
                <div className="ip-feedback-title">
                  <span>{answeredCorrectly ? <Check size={18} /> : <Lightbulb size={18} />}</span>
                  <strong>{answeredCorrectly ? T.correct : T.rethink}</strong>
                </div>

                <div className="ip-impact-chain">
                  <div><small>{T.concept}</small><strong>{loc(mission.concept, lang)}</strong></div>
                  <NextIcon size={17} />
                  <div><small>{T.bestAction}</small><strong>{loc(mission.choices[mission.correct], lang)}</strong></div>
                  <NextIcon size={17} />
                  <div><small>{T.impact}</small><strong>{loc(mission.impact, lang)}</strong></div>
                  <NextIcon size={17} />
                  <div className="ip-trait"><small>{T.trait}</small><strong>{loc(mission.trait, lang)}</strong></div>
                </div>

                <p className="ip-insight"><strong>{T.why}</strong>{loc(mission.insight, lang)}</p>
                <button className="ip-primary" type="button" onClick={advance}>
                  {missionIndex === MISSIONS.length - 1 ? T.finish : T.next} <NextIcon size={17} />
                </button>
              </div>
            )}
          </article>
        </section>
      )}

      {phase === "complete" && (
        <section className="ip-complete">
          <div className="ip-complete-card">
            <div className="ip-trophy"><Trophy size={42} /></div>
            <span className="ip-complete-kicker">{T.completeEyebrow}</span>
            <h1>{T.completeTitle}</h1>
            <p>{T.completeSub}</p>
            <div className="ip-stars" aria-label={`${stars} / 3`}>
              {[1, 2, 3].map((star) => <Sparkles key={star} className={star <= stars ? "is-earned" : ""} size={31} />)}
            </div>
            <div className="ip-result-grid">
              <div><strong>{score}</strong><span>{T.score}</span></div>
              <div><strong>{T.correctOf(correctCount)}</strong><span>{T.stars}: {stars}/3</span></div>
              <div><strong>×{bestStreak}</strong><span>{T.bestStreak}</span></div>
            </div>
            <div className="ip-qualification">
              <Flag size={22} />
              <div><strong>{T.qualification}</strong><p>{T.qualificationText}</p></div>
            </div>
            <div className="ip-complete-actions">
              <button className="ip-primary" type="button" onClick={start}><RotateCcw size={17} /> {T.again}</button>
              <button className="ip-secondary" type="button" onClick={onBack}><PreviousIcon size={17} /> {T.back}</button>
            </div>
            {bestScore !== null && <span className="ip-best">{T.best(bestScore)}</span>}
          </div>
        </section>
      )}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
.ip-shell{--ink:#32101A;--wine:#6B1E2D;--wine2:#4A0E1C;--gold:#B8A082;--gold2:#8F765B;--paper:#FFFBF5;--cream:#F7F3EB;--mist:#EFEAE0;--line:#D9C9B0;--muted:#796A62;position:relative;isolation:isolate;min-height:calc(100vh - 40px);padding:24px;overflow-x:clip;color:var(--ink);font-family:'Cairo',sans-serif;background:radial-gradient(circle at 12% 8%,rgba(184,160,130,.18),transparent 34%),linear-gradient(155deg,#FFFBF5,#EFEAE0)}
.ip-atmosphere{position:absolute;z-index:-1;border-radius:999px;filter:blur(2px);pointer-events:none}.ip-atmosphere-one{width:340px;height:340px;inset:-160px auto auto -100px;background:rgba(107,30,45,.07)}.ip-atmosphere-two{width:280px;height:280px;inset:auto -120px -100px auto;background:rgba(184,160,130,.16)}
.ip-intro,.ip-complete{max-width:900px;margin:0 auto;min-height:calc(100vh - 88px);display:flex;flex-direction:column;justify-content:center;gap:16px}.ip-intro-card,.ip-complete-card{position:relative;overflow:hidden;text-align:center;padding:42px 46px;border:1px solid rgba(184,160,130,.54);border-radius:30px;background:rgba(255,251,245,.92);box-shadow:0 24px 70px rgba(107,30,45,.12)}
.ip-intro-card:before,.ip-complete-card:before{content:'';position:absolute;inset:0 0 auto;height:7px;background:linear-gradient(90deg,var(--wine2),var(--wine),var(--gold),var(--wine))}.ip-compass,.ip-trophy{width:88px;height:88px;margin:0 auto 18px;display:grid;place-items:center;border-radius:26px;color:var(--gold);background:linear-gradient(145deg,var(--wine2),var(--wine));box-shadow:0 18px 34px rgba(107,30,45,.22);transform:rotate(-3deg)}
.ip-kicker,.ip-complete-kicker{display:inline-flex;align-items:center;gap:7px;color:var(--wine);font-size:12px;font-weight:900;letter-spacing:.06em}.ip-intro h1,.ip-complete h1{margin:8px 0 4px;font-family:'El Messiri','Cairo',serif;font-size:clamp(34px,6vw,58px);line-height:1.15}.ip-lead{margin:0;color:var(--wine);font-size:18px;font-weight:800}.ip-intro-copy,.ip-complete-card>p{max-width:680px;margin:14px auto 0;color:var(--muted);font-size:14px;line-height:1.9}
.ip-road-preview{max-width:620px;margin:28px auto 18px;display:flex;align-items:center;justify-content:center;color:var(--wine)}.ip-preview-stop{display:flex;align-items:center;flex:1}.ip-preview-stop span{width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;border:2px solid var(--gold);border-radius:50%;background:var(--paper);color:var(--wine);font-size:12px;font-weight:900}.ip-preview-stop i{height:3px;flex:1;background:repeating-linear-gradient(90deg,var(--gold) 0 8px,transparent 8px 14px)}.ip-road-preview>svg{flex:0 0 auto;margin-inline-start:7px}
.ip-facts{display:flex;justify-content:center;flex-wrap:wrap;gap:10px}.ip-facts span,.ip-practice{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:999px;background:var(--cream);padding:8px 13px;color:var(--muted);font-size:12px;font-weight:800}.ip-practice{width:max-content;max-width:100%;margin:12px auto 0;color:#1B5E20;background:rgba(27,94,32,.07);border-color:rgba(27,94,32,.18)}
.ip-primary,.ip-secondary,.ip-back{font:inherit;cursor:pointer}.ip-primary{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:13px;background:linear-gradient(135deg,var(--wine),var(--wine2));color:#FFFBF5;padding:12px 20px;font-size:13px;font-weight:900;box-shadow:0 12px 26px rgba(107,30,45,.18);transition:transform .18s,box-shadow .18s}.ip-primary:hover{transform:translateY(-2px);box-shadow:0 16px 30px rgba(107,30,45,.24)}.ip-start{margin:22px auto 0;min-width:210px;padding:14px 24px}.ip-best{display:block;margin-top:12px;color:var(--gold2);font-size:11px;font-weight:900}
.ip-back{width:max-content;display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;color:var(--muted);font-size:12px;font-weight:800;padding:8px 3px}.ip-back:hover{color:var(--wine)}
.ip-game{max-width:1100px;margin:0 auto}.ip-game-head{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px}.ip-game-brand{display:flex;align-items:center;gap:8px;color:var(--wine)}.ip-stats{display:flex;justify-content:flex-end;gap:8px}.ip-stats>span{min-width:78px;padding:8px 12px;border:1px solid var(--line);border-radius:13px;background:rgba(255,251,245,.8);text-align:center}.ip-stats small{display:block;color:var(--muted);font-size:9px;font-weight:800}.ip-stats strong{font-size:17px;color:var(--wine)}
.ip-road{margin:18px auto;max-width:850px;display:flex;align-items:center;color:var(--muted)}.ip-road-stop{display:flex;align-items:center;flex:1}.ip-road-stop>span{width:31px;height:31px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;border:2px solid var(--line);background:var(--paper);font-size:11px;font-weight:900;transition:.3s}.ip-road-stop>i{position:relative;height:3px;flex:1;background:var(--line);overflow:hidden}.ip-road-stop>i b{position:absolute;inset:0;background:var(--wine);transform:scaleX(0);transform-origin:left;transition:.35s}.ip-road-stop.is-done>span{border-color:var(--wine);background:var(--wine);color:#FFFBF5}.ip-road-stop.is-done>i b{transform:scaleX(1)}.ip-road-stop.is-current>span{border-color:var(--gold);color:var(--wine);box-shadow:0 0 0 7px rgba(184,160,130,.16)}.ip-road>svg{margin-inline-start:6px}.ip-road>svg.is-near{color:var(--wine)}
[dir='rtl'] .ip-road-stop>i b{transform-origin:right}
.ip-mission-card{animation:ip-rise .35s ease both;border:1px solid rgba(184,160,130,.52);border-radius:26px;background:rgba(255,251,245,.94);padding:28px;box-shadow:0 20px 60px rgba(107,30,45,.10)}@keyframes ip-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.ip-mission-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.ip-station{display:inline-flex;padding:6px 12px;border-radius:999px;background:var(--wine);color:#FFFBF5;font-size:10px;font-weight:900}.ip-tags{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.ip-tags span{padding:7px 11px;border:1px solid var(--line);border-radius:11px;background:var(--cream);color:var(--wine);font-size:12px;font-weight:900}.ip-tags small{display:block;color:var(--muted);font-size:8px;font-weight:700}
.ip-situation{display:flex;align-items:flex-start;gap:14px;margin:20px 0;padding:18px;border:1px solid rgba(184,160,130,.42);border-radius:18px;background:linear-gradient(135deg,rgba(184,160,130,.14),rgba(255,251,245,.5))}.ip-situation-icon{width:42px;height:42px;display:grid;place-items:center;flex:0 0 auto;border-radius:13px;background:var(--wine);color:var(--gold)}.ip-situation small{color:var(--gold2);font-size:10px;font-weight:900}.ip-situation p{margin:3px 0 0;color:var(--ink);font-size:14px;line-height:1.8;font-weight:700}.ip-mission-card h2{margin:0;text-align:center;font-family:'El Messiri','Cairo',serif;font-size:clamp(20px,3vw,28px)}.ip-choose-hint{text-align:center;margin:5px 0 17px;color:var(--muted);font-size:11px}
.ip-choices{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}.ip-choice{position:relative;display:flex;align-items:flex-start;gap:11px;min-height:116px;text-align:start;border:1px solid var(--line);border-radius:17px;background:#FFFBF5;color:var(--ink);padding:16px;font:inherit;font-size:12.5px;line-height:1.75;font-weight:700;cursor:pointer;transition:.2s}.ip-choice:hover:not(:disabled){border-color:var(--gold);transform:translateY(-2px);box-shadow:0 10px 24px rgba(107,30,45,.08)}.ip-choice-letter{width:27px;height:27px;display:grid;place-items:center;flex:0 0 auto;border-radius:9px;background:var(--mist);color:var(--wine);font-size:11px;font-weight:900}.ip-choice.is-correct{border-color:rgba(27,94,32,.42);background:rgba(27,94,32,.06)}.ip-choice.is-correct .ip-choice-letter{background:#1B5E20;color:#FFFBF5}.ip-choice.is-wrong{border-color:rgba(107,30,45,.35);background:rgba(107,30,45,.055)}.ip-choice.is-muted{opacity:.48}.ip-choice-result{margin-inline-start:auto;flex:0 0 auto;color:#1B5E20}.ip-choice.is-wrong .ip-choice-result{color:var(--wine)}
.ip-reveal{margin-top:20px;padding:20px;border-radius:20px;border:1px solid rgba(27,94,32,.22);background:rgba(27,94,32,.045);animation:ip-rise .3s ease both}.ip-reveal.is-rethink{border-color:rgba(184,160,130,.5);background:rgba(184,160,130,.09)}.ip-feedback-title{display:flex;align-items:center;gap:9px;margin-bottom:15px;color:#1B5E20}.ip-reveal.is-rethink .ip-feedback-title{color:var(--wine)}.ip-feedback-title>span{width:31px;height:31px;display:grid;place-items:center;border-radius:10px;background:rgba(27,94,32,.1)}.ip-reveal.is-rethink .ip-feedback-title>span{background:rgba(107,30,45,.08)}
.ip-impact-chain{display:grid;grid-template-columns:1fr auto 1.7fr auto 1fr auto .8fr;align-items:stretch;gap:8px}.ip-impact-chain>div{display:flex;flex-direction:column;justify-content:center;min-width:0;padding:11px;border:1px solid var(--line);border-radius:13px;background:rgba(255,251,245,.82)}.ip-impact-chain>svg{align-self:center;color:var(--gold2)}.ip-impact-chain small{color:var(--muted);font-size:8.5px;font-weight:900}.ip-impact-chain strong{margin-top:3px;font-size:10.5px;line-height:1.55}.ip-impact-chain .ip-trait{border-color:rgba(107,30,45,.26);background:var(--wine);color:#FFFBF5}.ip-impact-chain .ip-trait small{color:var(--gold)}.ip-insight{display:flex;gap:8px;margin:14px 0;color:var(--muted);font-size:11.5px;line-height:1.8}.ip-insight strong{color:var(--wine);flex:0 0 auto}.ip-reveal>.ip-primary{margin-inline-start:auto}
.ip-complete-card{max-width:820px;margin:0 auto}.ip-trophy{transform:none}.ip-complete-kicker{color:var(--gold2)}.ip-stars{display:flex;justify-content:center;gap:8px;margin:20px 0;color:var(--line)}.ip-stars .is-earned{color:var(--gold);fill:rgba(184,160,130,.24);filter:drop-shadow(0 5px 8px rgba(184,160,130,.3))}.ip-result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.ip-result-grid>div{display:flex;flex-direction:column;justify-content:center;min-height:82px;border:1px solid var(--line);border-radius:16px;background:var(--cream);padding:12px}.ip-result-grid strong{color:var(--wine);font-size:18px}.ip-result-grid span{color:var(--muted);font-size:10px;font-weight:800}.ip-qualification{display:flex;align-items:flex-start;gap:13px;margin:18px 0;padding:17px;text-align:start;border:1px solid rgba(107,30,45,.2);border-radius:17px;background:rgba(107,30,45,.055);color:var(--wine)}.ip-qualification svg{flex:0 0 auto}.ip-qualification strong{font-size:12px}.ip-qualification p{margin:3px 0 0;color:var(--muted);font-size:11.5px;line-height:1.75}.ip-complete-actions{display:flex;justify-content:center;gap:10px}.ip-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--line);border-radius:13px;background:var(--paper);color:var(--wine);padding:12px 18px;font-size:12px;font-weight:900}
@media(max-width:820px){.ip-shell{padding:14px}.ip-intro,.ip-complete{min-height:calc(100vh - 60px)}.ip-intro-card,.ip-complete-card{padding:34px 22px;border-radius:23px}.ip-game-head{grid-template-columns:1fr auto}.ip-game-brand{display:none}.ip-choices{grid-template-columns:1fr}.ip-choice{min-height:0}.ip-impact-chain{grid-template-columns:1fr}.ip-impact-chain>svg{transform:rotate(90deg);justify-self:center}.ip-reveal>.ip-primary{width:100%}}
@media(max-width:560px){.ip-shell{padding:10px}.ip-intro-card,.ip-complete-card{padding:28px 15px}.ip-compass,.ip-trophy{width:72px;height:72px;border-radius:22px}.ip-intro h1,.ip-complete h1{font-size:34px}.ip-lead{font-size:15px}.ip-intro-copy{font-size:12.5px}.ip-road-preview{margin-top:20px}.ip-preview-stop span{width:28px;height:28px}.ip-facts span{font-size:10px;padding:7px 9px}.ip-game-head{align-items:flex-start}.ip-back{font-size:0}.ip-back svg{width:20px;height:20px}.ip-stats>span{min-width:61px;padding:6px 8px}.ip-road{margin:14px 3px}.ip-road-stop>span{width:26px;height:26px}.ip-mission-card{padding:17px 13px;border-radius:20px}.ip-mission-top{flex-direction:column}.ip-tags{justify-content:flex-start}.ip-situation{padding:14px;margin:14px 0}.ip-situation p{font-size:12.5px}.ip-mission-card h2{font-size:20px}.ip-choice{padding:13px;font-size:12px}.ip-reveal{padding:14px}.ip-result-grid{grid-template-columns:1fr}.ip-result-grid>div{min-height:62px}.ip-complete-actions{flex-direction:column}.ip-complete-actions button{width:100%}}
@media(prefers-reduced-motion:reduce){.ip-mission-card,.ip-reveal{animation:none}.ip-primary,.ip-choice{transition:none}}
`;
