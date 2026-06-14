"use client";

/**
 * ModelIntro — animated onboarding intro shown before the Rowad board.
 *
 *  - Stage 1 variant: introduces the 5 levels (with one-line meanings)
 *    and the 5 maqasid. Shown every visit while the teacher is still in
 *    STAGE1_PENDING (i.e. until Stage 1 is passed).
 *  - Stage 2 variant: congratulates on passing Stage 1 and explains what
 *    changes in Stage 2 (detailed concept cards + the info button).
 *
 * Pure presentation — the parent decides when to show it and what
 * happens on start (onStart flips to the board).
 */

type Lang = "ar" | "sq" | "en";

const LEVELS = [
  {
    n: 1,
    ar: { name: "الاتباع", desc: "الالتزام بالتوجيهات وتنفيذ المهام بدقة وأمانة" },
    sq: { name: "Ndjekja", desc: "Zbatimi i udhëzimeve dhe kryerja e saktë e detyrave" },
  },
  {
    n: 2,
    ar: { name: "الاستبانة", desc: "فهم القواعد والأسس واستيضاح منهج العمل" },
    sq: { name: "Sqarimi", desc: "Kuptimi i rregullave, bazave dhe metodologjisë së punës" },
  },
  {
    n: 3,
    ar: { name: "القيادة", desc: "قيادة الفريق وتوجيهه نحو تحقيق الأهداف" },
    sq: { name: "Lidershipi", desc: "Udhëheqja e ekipit drejt arritjes së objektivave" },
  },
  {
    n: 4,
    ar: { name: "التمكين", desc: "الإتقان والتحسين المستمر وتمكين الآخرين" },
    sq: { name: "Fuqizimi", desc: "Përsosja, përmirësimi i vazhdueshëm dhe fuqizimi i të tjerëve" },
  },
  {
    n: 5,
    ar: { name: "الريادة", desc: "صناعة الأثر والمبادرة وريادة المستقبل" },
    sq: { name: "Pionierizmi", desc: "Krijimi i ndikimit, iniciativa dhe udhëheqja e së ardhmes" },
  },
];

const MAQASID = [
  {
    key: "DEEN",
    ar: { name: "الدين", desc: "حفظ الإيمان والعبادة" },
    sq: { name: "Feja", desc: "Ruajtja e besimit dhe adhurimit" },
    glyph: "☪",
  },
  {
    key: "NAFS",
    ar: { name: "النفس", desc: "حفظ الحياة والكرامة" },
    sq: { name: "Vetja", desc: "Ruajtja e jetës dhe dinjitetit" },
    glyph: "♥",
  },
  {
    key: "AQL",
    ar: { name: "العقل", desc: "حفظ الفكر والتعلم" },
    sq: { name: "Mendja", desc: "Ruajtja e mendimit dhe mësimit" },
    glyph: "✦",
  },
  {
    key: "NASL",
    ar: { name: "النسل", desc: "حفظ الأسرة والأجيال" },
    sq: { name: "Pasardhësit", desc: "Ruajtja e familjes dhe brezave" },
    glyph: "❀",
  },
  {
    key: "MAL",
    ar: { name: "المال", desc: "حفظ الثروة والموارد" },
    sq: { name: "Pasuria", desc: "Ruajtja e pasurisë dhe burimeve" },
    glyph: "◈",
  },
];

// Stage 2 detail fields the cards now carry
const S2_FIELDS = [
  { ar: { name: "المفهوم الاستراتيجي", desc: "جوهر المفهوم ودوره في المنظومة" }, sq: { name: "Koncepti strategjik", desc: "Thelbi i konceptit dhe roli i tij në sistem" } },
  { ar: { name: "الواجب", desc: "ما المطلوب منك عمليًا" }, sq: { name: "Detyra", desc: "Çfarë kërkohet prej teje praktikisht" } },
  { ar: { name: "الأجر", desc: "الثواب المرتبط بالمفهوم" }, sq: { name: "Shpërblimi", desc: "Shpërblimi i lidhur me konceptin" } },
  { ar: { name: "الثمرة", desc: "الأثر الدنيوي الملموس" }, sq: { name: "Fryti", desc: "Ndikimi konkret në jetë" } },
  { ar: { name: "مؤشر التحقق", desc: "كيف تقيس أنك حققته" }, sq: { name: "Treguesi i verifikimit", desc: "Si matet arritja e tij" } },
];

const TXT = {
  ar: {
    badge1: "المرحلة الأولى",
    badge2: "المرحلة الثانية",
    welcome: "مرحباً بك في",
    modelName: "النموذج التعليمي للرواد",
    intro1Sub:
      "قبل أن تبدأ، تعرّف على بنية النموذج: خمسة مستويات تصاعدية تتقاطع مع خمسة مقاصد كلية — معاً تشكّل خريطة 5×5 تحتضن خمسة وعشرين مفهوماً.",
    levelsTitle: "المستويات الخمسة",
    levelsHint: "رحلة تصاعدية من الاتباع إلى الريادة",
    maqasidTitle: "المقاصد الخمسة",
    maqasidHint: "الأعمدة الكلية التي يخدمها كل مفهوم",
    mission1Title: "مهمتك في المرحلة الأولى",
    mission1Body:
      "ستظهر لك ٢٥ بطاقة مفهوم. اسحب كل بطاقة إلى الخانة الصحيحة — تقاطع المستوى المناسب مع المقصد المناسب. اعتمد على فهمك وحدسك؛ هذه المرحلة تقيس إدراكك الأولي للنموذج.",
    start1: "ابدأ المرحلة الأولى",
    // Stage 2
    congrats: "أحسنت! اجتزت المرحلة الأولى بنجاح",
    intro2Sub:
      "في هذه المرحلة تتعمق أكثر: البطاقات نفسها، لكنها الآن تحمل تفاصيل كاملة عن كل مفهوم. اقرأ، افهم، ثم أعد توزيع البطاقات الخمس والعشرين بدقة أكبر.",
    whatsNew: "الجديد في هذه المرحلة",
    s2InfoTip:
      "اضغط زر «تفاصيل» أو «i» على أي بطاقة لقراءة هذه الحقول كاملة قبل وضعها في مكانها.",
    mission2Title: "مهمتك في المرحلة الثانية",
    mission2Body:
      "وزّع البطاقات الـ٢٥ من جديد مستعيناً بالتفاصيل المعروضة. التقييم هنا يقيس الفهم العميق — خذ وقتك في قراءة كل بطاقة.",
    start2: "ابدأ المرحلة الثانية",
    skipNote: "ستجد هذه المقدمة في كل مرة حتى تجتاز المرحلة",
  },
  sq: {
    badge1: "Faza e Parë",
    badge2: "Faza e Dytë",
    welcome: "Mirë se vini në",
    modelName: "Modelin Edukativ të Pionierëve",
    intro1Sub:
      "Para se të fillosh, njihu me strukturën e modelit: pesë nivele ngjitëse që kryqëzohen me pesë qëllime madhore — së bashku formojnë hartën 5×5 me njëzet e pesë koncepte.",
    levelsTitle: "Pesë Nivelet",
    levelsHint: "Një udhëtim ngjitës nga Ndjekja deri te Pionierizmi",
    maqasidTitle: "Pesë Qëllimet",
    maqasidHint: "Shtyllat madhore që çdo koncept u shërben",
    mission1Title: "Misioni yt në Fazën e Parë",
    mission1Body:
      "Do të shfaqen 25 karta konceptesh. Tërhiq secilën kartë në qelizën e saktë — kryqëzimi i nivelit të duhur me qëllimin e duhur. Mbështetu te kuptimi dhe intuita jote; kjo fazë mat perceptimin tënd fillestar të modelit.",
    start1: "Fillo Fazën e Parë",
    // Stage 2
    congrats: "Bravo! E kalove Fazën e Parë me sukses",
    intro2Sub:
      "Në këtë fazë thellohesh më shumë: kartat janë të njëjtat, por tani mbartin detaje të plota për çdo koncept. Lexo, kupto, pastaj rishpërnda të 25 kartat me saktësi më të madhe.",
    whatsNew: "Çfarë ka të re në këtë fazë",
    s2InfoTip:
      "Kliko butonin «Detaje» ose «i» në çdo kartë për t'i lexuar këto fusha të plota para se ta vendosësh.",
    mission2Title: "Misioni yt në Fazën e Dytë",
    mission2Body:
      "Rishpërndaji 25 kartat duke u mbështetur te detajet e shfaqura. Vlerësimi këtu mat kuptimin e thellë — merr kohën të lexosh çdo kartë.",
    start2: "Fillo Fazën e Dytë",
    skipNote: "Kjo hyrje do të shfaqet sa herë derisa ta kalosh fazën",
  },
} as const;

export default function ModelIntro({
  stage,
  lang,
  onStart,
}: {
  stage: "STAGE1" | "STAGE2";
  lang: Lang;
  onStart: () => void;
}) {
  const L: "ar" | "sq" = lang === "sq" ? "sq" : "ar";
  const t = TXT[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const isS1 = stage === "STAGE1";

  return (
    <div className="mi-shell" dir={dir}>
      {/* floating background ornaments */}
      <div className="mi-orb mi-orb-a" aria-hidden />
      <div className="mi-orb mi-orb-b" aria-hidden />
      <OrnamentRing className="mi-ring mi-ring-a" />
      <OrnamentRing className="mi-ring mi-ring-b" />

      <div className="mi-inner">
        {/* ── Header ── */}
        <header className="mi-head">
          <span className="mi-badge mi-anim" style={{ animationDelay: ".05s" }}>
            {isS1 ? t.badge1 : t.badge2}
          </span>
          {isS1 ? (
            <>
              <p className="mi-welcome mi-anim" style={{ animationDelay: ".15s" }}>{t.welcome}</p>
              <h1 className="mi-title mi-anim" style={{ animationDelay: ".25s" }}>{t.modelName}</h1>
            </>
          ) : (
            <>
              <div className="mi-congrats-medal mi-pop" style={{ animationDelay: ".15s" }} aria-hidden>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
                  <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
                </svg>
              </div>
              <h1 className="mi-title mi-anim" style={{ animationDelay: ".25s" }}>{t.congrats}</h1>
            </>
          )}
          <div className="mi-rule mi-anim" style={{ animationDelay: ".35s" }}>
            <span className="mi-rule-line" /><span className="mi-rule-gem" /><span className="mi-rule-line" />
          </div>
          <p className="mi-sub mi-anim" style={{ animationDelay: ".45s" }}>
            {isS1 ? t.intro1Sub : t.intro2Sub}
          </p>
        </header>

        {isS1 ? (
          <>
            {/* ── The 5 levels — ascending staircase ── */}
            <section className="mi-section">
              <div className="mi-sec-head mi-anim" style={{ animationDelay: ".55s" }}>
                <h2 className="mi-sec-title">{t.levelsTitle}</h2>
                <p className="mi-sec-hint">{t.levelsHint}</p>
              </div>
              <div className="mi-levels">
                <span className="mi-levels-spine" aria-hidden />
                {LEVELS.map((lv, i) => (
                  <div
                    key={lv.n}
                    className="mi-level mi-anim"
                    style={{ animationDelay: `${0.65 + i * 0.13}s` }}
                  >
                    <span className="mi-level-medal">
                      <span className="mi-level-num">{lv.n}</span>
                    </span>
                    <span className="mi-level-body">
                      <span className="mi-level-name">{lv[L].name}</span>
                      <span className="mi-level-desc">{lv[L].desc}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── The 5 maqasid ── */}
            <section className="mi-section">
              <div className="mi-sec-head mi-anim" style={{ animationDelay: "1.35s" }}>
                <h2 className="mi-sec-title">{t.maqasidTitle}</h2>
                <p className="mi-sec-hint">{t.maqasidHint}</p>
              </div>
              <div className="mi-maqasid">
                {MAQASID.map((m, i) => (
                  <div
                    key={m.key}
                    className="mi-maqsad mi-pop"
                    style={{ animationDelay: `${1.45 + i * 0.11}s` }}
                  >
                    <span className="mi-maqsad-glyph" aria-hidden>{m.glyph}</span>
                    <span className="mi-maqsad-name">{m[L].name}</span>
                    <span className="mi-maqsad-desc">{m[L].desc}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Mission ── */}
            <section className="mi-mission mi-anim" style={{ animationDelay: "2.05s" }}>
              <h3 className="mi-mission-title">{t.mission1Title}</h3>
              <p className="mi-mission-body">{t.mission1Body}</p>
            </section>

            <button
              className="mi-cta mi-anim"
              style={{ animationDelay: "2.2s" }}
              onClick={onStart}
              type="button"
            >
              {t.start1}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                {L === "ar" ? <path d="M19 12H5M12 5l-7 7 7 7" /> : <path d="M5 12h14M12 5l7 7-7 7" />}
              </svg>
            </button>
          </>
        ) : (
          <>
            {/* ── Stage-2: what's new ── */}
            <section className="mi-section">
              <div className="mi-sec-head mi-anim" style={{ animationDelay: ".55s" }}>
                <h2 className="mi-sec-title">{t.whatsNew}</h2>
              </div>
              <div className="mi-fields">
                {S2_FIELDS.map((f, i) => (
                  <div
                    key={i}
                    className="mi-field mi-pop"
                    style={{ animationDelay: `${0.65 + i * 0.12}s` }}
                  >
                    <span className="mi-field-dot" aria-hidden />
                    <span className="mi-field-name">{f[L].name}</span>
                    <span className="mi-field-desc">{f[L].desc}</span>
                  </div>
                ))}
              </div>
              <div className="mi-tip mi-anim" style={{ animationDelay: "1.3s" }}>
                <span className="mi-tip-i" aria-hidden>i</span>
                <p className="mi-tip-text">{t.s2InfoTip}</p>
              </div>
            </section>

            <section className="mi-mission mi-anim" style={{ animationDelay: "1.45s" }}>
              <h3 className="mi-mission-title">{t.mission2Title}</h3>
              <p className="mi-mission-body">{t.mission2Body}</p>
            </section>

            <button
              className="mi-cta mi-anim"
              style={{ animationDelay: "1.6s" }}
              onClick={onStart}
              type="button"
            >
              {t.start2}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                {L === "ar" ? <path d="M19 12H5M12 5l-7 7 7 7" /> : <path d="M5 12h14M12 5l7 7-7 7" />}
              </svg>
            </button>
          </>
        )}

        <p className="mi-note mi-anim" style={{ animationDelay: isS1 ? "2.35s" : "1.75s" }}>
          {t.skipNote}
        </p>
      </div>

      <style>{css}</style>
    </div>
  );
}

/* decorative slow-spinning geometric ring */
function OrnamentRing({ className }: { className?: string }) {
  return (
    <svg className={className} width="340" height="340" viewBox="0 0 340 340" fill="none" aria-hidden>
      <g stroke="#C2A059" fill="none">
        <circle cx="170" cy="170" r="160" strokeWidth="0.8" opacity=".5" />
        <circle cx="170" cy="170" r="128" strokeWidth="0.6" strokeDasharray="3 7" opacity=".45" />
        <circle cx="170" cy="170" r="92" strokeWidth="0.6" opacity=".4" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={170 - Math.cos(a) * 160} y1={170 - Math.sin(a) * 160}
              x2={170 + Math.cos(a) * 160} y2={170 + Math.sin(a) * 160}
              strokeWidth="0.45" opacity=".3"
            />
          );
        })}
      </g>
    </svg>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=El+Messiri:wght@500;600;700;800&display=swap');

@keyframes miUp   { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:none; } }
@keyframes miPop  { 0% { opacity:0; transform:scale(.82); } 70% { transform:scale(1.04); } 100% { opacity:1; transform:scale(1); } }
@keyframes miSpin { to { transform:rotate(360deg); } }
@keyframes miFloat{ 0%,100% { transform:translateY(0); } 50% { transform:translateY(-14px); } }
@keyframes miGlow { 0%,100% { box-shadow:0 10px 30px rgba(120,90,40,.28), 0 0 0 0 rgba(224,194,119,.35); } 50% { box-shadow:0 10px 36px rgba(120,90,40,.34), 0 0 0 10px rgba(224,194,119,0); } }
@keyframes miSpine{ from { transform:scaleY(0); } to { transform:scaleY(1); } }
@keyframes miShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }

.mi-shell{
  position:relative; min-height:100vh; overflow:hidden;
  font-family:'Cairo','Tajawal',sans-serif; color:#3B2F1C;
  background:
    radial-gradient(ellipse at 50% 8%, #F8F1E0 0%, transparent 50%),
    linear-gradient(160deg,#EFE6D2 0%,#E9DFC7 100%);
}
.mi-anim{ opacity:0; animation:miUp .7s cubic-bezier(.22,1,.36,1) forwards; }
.mi-pop { opacity:0; animation:miPop .55s cubic-bezier(.22,1.3,.36,1) forwards; }
@media (prefers-reduced-motion: reduce){
  .mi-anim,.mi-pop{ animation-duration:.01s !important; animation-delay:0s !important; }
  .mi-orb,.mi-ring,.mi-cta{ animation:none !important; }
}

.mi-orb{ position:absolute; border-radius:50%; pointer-events:none; filter:blur(50px); }
.mi-orb-a{ width:420px; height:420px; top:-140px; inset-inline-end:-120px;
  background:radial-gradient(circle, rgba(229,185,60,.16), transparent 65%); animation:miFloat 9s ease-in-out infinite; }
.mi-orb-b{ width:360px; height:360px; bottom:-120px; inset-inline-start:-110px;
  background:radial-gradient(circle, rgba(194,160,89,.14), transparent 65%); animation:miFloat 11s ease-in-out infinite reverse; }
.mi-ring{ position:absolute; pointer-events:none; opacity:.12; }
.mi-ring-a{ top:-90px; inset-inline-start:-100px; animation:miSpin 90s linear infinite; }
.mi-ring-b{ bottom:-120px; inset-inline-end:-110px; animation:miSpin 120s linear infinite reverse; }

.mi-inner{ position:relative; z-index:1; max-width:880px; margin:0 auto; padding:48px 20px 64px;
  display:flex; flex-direction:column; align-items:center; }

/* ── Head ── */
.mi-head{ text-align:center; max-width:640px; }
.mi-badge{
  display:inline-block; padding:6px 22px; border-radius:99px;
  background:linear-gradient(135deg,#2b2417,#3a2e1a); color:#E0C277;
  font-size:13px; font-weight:800; letter-spacing:1.5px;
  border:1px solid rgba(224,194,119,.45);
  box-shadow:0 6px 18px rgba(120,90,40,.22);
}
.mi-welcome{ margin:18px 0 0; font-size:15px; font-weight:700; color:#A9863F; letter-spacing:.5px; }
.mi-title{
  margin:6px 0 0; font-family:'El Messiri','Cairo',serif;
  font-size:38px; font-weight:800; line-height:1.25; letter-spacing:-.5px;
  background:linear-gradient(100deg,#3B2F1C 30%, #9A7833 50%, #3B2F1C 70%);
  background-size:200% auto; -webkit-background-clip:text; background-clip:text; color:transparent;
  animation:miUp .7s cubic-bezier(.22,1,.36,1) forwards, miShimmer 5s linear 1.2s infinite;
}
.mi-congrats-medal{
  width:84px; height:84px; margin:18px auto 0; border-radius:50%;
  display:flex; align-items:center; justify-content:center; color:#9A7833;
  background:radial-gradient(circle at 35% 30%, #FBF2D9, #F2E2B5);
  border:1.5px solid rgba(194,160,89,.55);
  box-shadow:0 10px 28px rgba(150,115,50,.22), inset 0 1px 0 rgba(255,255,255,.7);
}
.mi-rule{ display:flex; align-items:center; justify-content:center; gap:10px; margin:18px auto 0; max-width:280px; }
.mi-rule-line{ flex:1; height:1px; background:linear-gradient(90deg,transparent,rgba(194,160,89,.6),transparent); }
.mi-rule-gem{ width:7px; height:7px; transform:rotate(45deg); background:#C2A059; box-shadow:0 0 10px rgba(194,160,89,.5); }
.mi-sub{ margin:16px 0 0; font-size:15.5px; font-weight:600; color:#7A6440; line-height:2; }

/* ── Sections ── */
.mi-section{ width:100%; margin-top:44px; }
.mi-sec-head{ text-align:center; margin-bottom:22px; }
.mi-sec-title{
  margin:0; font-family:'El Messiri','Cairo',serif;
  font-size:24px; font-weight:800; color:#2b2417;
}
.mi-sec-hint{ margin:6px 0 0; font-size:13px; font-weight:600; color:#A9863F; }

/* ── Levels staircase ── */
.mi-levels{ position:relative; display:flex; flex-direction:column; gap:12px; max-width:620px; margin:0 auto; padding-inline-start:10px; }
.mi-levels-spine{
  position:absolute; top:26px; bottom:26px; inset-inline-start:32px; width:2px;
  background:linear-gradient(180deg, rgba(194,160,89,.0), rgba(194,160,89,.55) 12%, rgba(194,160,89,.55) 88%, rgba(194,160,89,0));
  transform-origin:top; animation:miSpine 1.4s cubic-bezier(.22,1,.36,1) .7s both;
}
.mi-level{
  display:flex; align-items:center; gap:16px;
  background:linear-gradient(160deg,#FFFCF1 0%,#F4ECD9 100%);
  border:1.5px solid rgba(216,196,154,.9); border-radius:16px;
  padding:14px 18px; position:relative; z-index:1;
  box-shadow:0 4px 14px rgba(150,115,50,.10), inset 0 1px 0 rgba(255,255,255,.55);
  transition:transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s;
}
.mi-level:hover{ transform:translateY(-2px); box-shadow:0 10px 24px rgba(150,115,50,.16); border-color:#C2A059; }
.mi-level-medal{
  width:46px; height:46px; flex-shrink:0; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  background:linear-gradient(135deg,#2b2417,#3a2e1a);
  border:1.5px solid rgba(224,194,119,.5);
  box-shadow:0 4px 12px rgba(120,90,40,.25), inset 0 1px 0 rgba(255,255,255,.08);
}
.mi-level-num{ font-family:'El Messiri','Cairo',serif; font-size:20px; font-weight:800; color:#E0C277; line-height:1; }
.mi-level-body{ display:flex; flex-direction:column; gap:3px; min-width:0; }
.mi-level-name{ font-family:'El Messiri','Cairo',serif; font-size:18px; font-weight:800; color:#2b2417; }
.mi-level-desc{ font-size:13px; font-weight:600; color:#7A6440; line-height:1.7; }

/* ── Maqasid row ── */
.mi-maqasid{ display:grid; grid-template-columns:repeat(5,1fr); gap:12px; }
@media(max-width:760px){ .mi-maqasid{ grid-template-columns:repeat(2,1fr); } .mi-maqasid > :last-child{ grid-column:1 / -1; } }
.mi-maqsad{
  display:flex; flex-direction:column; align-items:center; gap:7px; text-align:center;
  background:linear-gradient(170deg,#FFFCF1 0%,#F4ECD9 100%);
  border:1.5px solid rgba(216,196,154,.9); border-radius:18px;
  padding:20px 12px 16px;
  box-shadow:0 4px 14px rgba(150,115,50,.10), inset 0 1px 0 rgba(255,255,255,.55);
  transition:transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s, border-color .22s;
}
.mi-maqsad:hover{ transform:translateY(-4px); border-color:#C2A059; box-shadow:0 12px 28px rgba(150,115,50,.18); }
.mi-maqsad-glyph{
  width:44px; height:44px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:20px; color:#9A7833;
  background:radial-gradient(circle at 35% 30%, #FBF2D9, #F0DFAE);
  border:1.5px solid rgba(194,160,89,.5);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 3px 8px rgba(150,115,50,.14);
}
.mi-maqsad-name{ font-family:'El Messiri','Cairo',serif; font-size:17px; font-weight:800; color:#2b2417; }
.mi-maqsad-desc{ font-size:11.5px; font-weight:600; color:#7A6440; line-height:1.6; }

/* ── Stage-2 fields ── */
.mi-fields{ display:flex; flex-direction:column; gap:10px; max-width:620px; margin:0 auto; }
.mi-field{
  display:flex; align-items:center; gap:12px; flex-wrap:wrap;
  background:linear-gradient(160deg,#FFFCF1 0%,#F4ECD9 100%);
  border:1.5px solid rgba(216,196,154,.9); border-radius:14px; padding:13px 18px;
  box-shadow:0 3px 10px rgba(150,115,50,.09), inset 0 1px 0 rgba(255,255,255,.55);
}
.mi-field-dot{
  width:9px; height:9px; border-radius:50%; flex-shrink:0;
  background:radial-gradient(circle at 35% 30%, #E5C57F 0%, #C2A059 55%, #9A7833 100%);
  box-shadow:0 0 0 3px rgba(194,160,89,.18);
}
.mi-field-name{ font-family:'El Messiri','Cairo',serif; font-size:15.5px; font-weight:800; color:#2b2417; }
.mi-field-desc{ font-size:12.5px; font-weight:600; color:#7A6440; }
.mi-tip{
  display:flex; align-items:flex-start; gap:12px; max-width:620px; margin:16px auto 0;
  background:rgba(194,160,89,.10); border:1.5px dashed rgba(194,160,89,.5);
  border-radius:14px; padding:14px 18px;
}
.mi-tip-i{
  width:26px; height:26px; flex-shrink:0; border-radius:8px;
  display:flex; align-items:center; justify-content:center;
  font-size:14px; font-weight:900; font-style:italic; color:#E0C277;
  background:linear-gradient(135deg,#2b2417,#3a2e1a);
  border:1px solid rgba(224,194,119,.4);
}
.mi-tip-text{ margin:0; font-size:13.5px; font-weight:600; color:#5A4A30; line-height:1.85; }

/* ── Mission ── */
.mi-mission{
  width:100%; max-width:640px; margin-top:40px; text-align:center;
  background:linear-gradient(135deg,#2b2417,#3a2e1a);
  border:1.5px solid rgba(224,194,119,.4); border-radius:20px; padding:26px 28px;
  box-shadow:0 14px 36px rgba(60,45,15,.3), inset 0 1px 0 rgba(255,255,255,.06);
}
.mi-mission-title{
  margin:0 0 10px; font-family:'El Messiri','Cairo',serif;
  font-size:19px; font-weight:800; color:#E0C277;
}
.mi-mission-body{ margin:0; font-size:14px; font-weight:600; color:rgba(240,224,185,.85); line-height:2; }

/* ── CTA ── */
.mi-cta{
  display:inline-flex; align-items:center; gap:12px;
  margin-top:30px; padding:17px 46px; border-radius:14px; cursor:pointer;
  font-family:'Cairo',sans-serif; font-size:17px; font-weight:900; letter-spacing:.3px;
  color:#2b2417; border:1px solid rgba(120,90,40,.35);
  background:linear-gradient(135deg,#E0C277 0%, #C2A059 55%, #B8963A 100%);
  animation:miUp .7s cubic-bezier(.22,1,.36,1) forwards, miGlow 2.6s ease-in-out 2.8s infinite;
  transition:transform .18s cubic-bezier(.22,1,.36,1);
}
.mi-cta:hover{ transform:translateY(-3px) scale(1.02); }
.mi-cta:active{ transform:translateY(-1px) scale(1); }
.mi-cta:focus-visible{ outline:3px solid rgba(43,36,23,.45); outline-offset:3px; }

.mi-note{ margin-top:18px; font-size:12px; font-weight:600; color:#A9863F; opacity:.8; }

@media(max-width:560px){
  .mi-inner{ padding:32px 14px 48px; }
  .mi-title{ font-size:27px; }
  .mi-sub{ font-size:14px; }
  .mi-sec-title{ font-size:20px; }
  .mi-level{ padding:12px 14px; gap:12px; }
  .mi-level-medal{ width:40px; height:40px; }
  .mi-level-num{ font-size:17px; }
  .mi-level-name{ font-size:16px; }
  .mi-level-desc{ font-size:12px; }
  .mi-levels-spine{ inset-inline-start:29px; }
  .mi-mission{ padding:20px 18px; }
  .mi-cta{ width:100%; justify-content:center; padding:16px 24px; }
}
`;
