// النموذج التعليمي للرواد — default content + per-school seeder.
//
// The 5×5 model: 5 rows (levels) × 5 columns (maqasid). Column order matches the
// printed template: الدين، النفس، العقل، النسل، المال → DEEN, NAFS, AQL, NASL, MAL.
//
// Answer key per concept = (level = correct row) + (maqsad = correct column).
// Per the educational team: the 25 spec concepts are placed in listed order
// (first 5 → row 1, etc.); the extra Level-1 concept (التدبير الاقتصادي) is moved
// to the last level so every row has exactly 5. `order` = column index 0..4.
//
// Arabic is filled now; Albanian (`*_sq`) is left null to be filled later.
// Content is per-school and editable, so the seeder only creates rows when a
// school's model has none — it never overwrites existing (possibly edited) content.

import type { PrismaClient, Maqsad } from "@prisma/client";

// Column order used across the model (left→right in the template is RTL: الدين first)
export const COLUMN_ORDER: Maqsad[] = ["DEEN", "NAFS", "AQL", "NASL", "MAL"];

export const DEFAULT_LEVELS: { order: number; name_ar: string; name_sq: string | null }[] = [
  { order: 1, name_ar: "المستوى الأول — الاتباع", name_sq: null },
  { order: 2, name_ar: "المستوى الثاني — الاستبانة", name_sq: null },
  { order: 3, name_ar: "المستوى الثالث — القيادة", name_sq: null },
  { order: 4, name_ar: "المستوى الرابع — التمكين", name_sq: null },
  { order: 5, name_ar: "المستوى الخامس — الريادة", name_sq: null },
];

export type ConceptSeed = {
  level: number;
  maqsad: Maqsad;
  order: number;
  name_ar: string;
  strategic_ar: string;
  duty_ar: string;
  reward_ar: string;
  fruit_ar: string;
  verification_ar: string;
};

export const DEFAULT_CONCEPTS: ConceptSeed[] = [
  // ── Level 1 — الاتباع ──
  {
    level: 1, maqsad: "DEEN", order: 0,
    name_ar: "النية المثمرة",
    strategic_ar: "بوصلة توجه مسار الحياة لتحقيق غاية ورؤية وأثر في ثوانٍ معدودة.",
    duty_ar: "استحضار القصد والقوة الفاعلة.",
    reward_ar: "الثواب العظيم في الآخرة.",
    fruit_ar: "الإفادة الدنيوية والإنتاجية العالية.",
    verification_ar: "قياس نسبة الالتزام بتحقيق المهام وربطها بالهوية الفردية.",
  },
  {
    level: 1, maqsad: "NAFS", order: 1,
    name_ar: "مسار الزمن",
    strategic_ar: "تحليل القوى النفسية للطالب عبر الزمن، أفضل أداء مقابل الحالة الفعلية.",
    duty_ar: "الالتزام بالجدول الزمني للفعل.",
    reward_ar: "بركة الوقت واستثماره.",
    fruit_ar: "سرعة الإنجاز وتحقيق المآلات.",
    verification_ar: "وجود جدول تشغيلي دقيق وقياس الانحراف الزمني في المشاريع.",
  },
  {
    level: 1, maqsad: "AQL", order: 2,
    name_ar: "المآلات",
    strategic_ar: "القدرة على التنبؤ بالنتائج بعيدة المدى للأفعال والقرارات.",
    duty_ar: "النظر في عواقب الأفعال.",
    reward_ar: "الوقاية من المفاسد.",
    fruit_ar: "استدامة نجاح المشروع ومنع الفشل.",
    verification_ar: "تقديم تقرير تحليل مآلات لكل قرار استراتيجي في المشروع.",
  },
  {
    level: 1, maqsad: "NASL", order: 3,
    name_ar: "التفكير الاستراتيجي",
    strategic_ar: "الانتقال من حل المشكلات الحالية إلى تغيير البيئة الكلية.",
    duty_ar: "طلب القدرة على الإمامة.",
    reward_ar: "علو الهمة والمرتبة.",
    fruit_ar: "التفوق والتمكين رغم قلة العدد.",
    verification_ar: "تصميم نماذج وحلول إبداعية تسبق المنافسين وتغير الواقع.",
  },
  {
    level: 1, maqsad: "MAL", order: 4,
    name_ar: "الهياكل الاجتماعية",
    strategic_ar: "فهم المجتمع ككيان مهيكل ينظم العلاقات بين الأفراد لتحقيق نفع.",
    duty_ar: "الانضباط داخل الهيكل التنظيمي.",
    reward_ar: "ثواب العمل الجماعي والوحدة.",
    fruit_ar: "كفاءة إدارية وتحقيق أهداف المنظمة.",
    verification_ar: "بناء هيكل تنظيمي للمشروع يحدد الأدوار والمسؤوليات بدقة.",
  },

  // ── Level 2 — الاستبانة ──
  {
    level: 2, maqsad: "DEEN", order: 0,
    name_ar: "قواعد التنمية الشرعية",
    strategic_ar: "بناء المشاريع وفق أصول شرعية تضمن التنمية المستدامة.",
    duty_ar: "الالتزام بمقاصد الشريعة.",
    reward_ar: "البركة والتوفيق الإلهي.",
    fruit_ar: "قبول مجتمعي وشرعي واسع للمنتج.",
    verification_ar: "مطابقة مخرجات المشروع مع مقاصد الشريعة.",
  },
  {
    level: 2, maqsad: "NAFS", order: 1,
    name_ar: "الماضي والحاضر والمستقبل — نفسي",
    strategic_ar: "إحياء الذاكرة التاريخية لدعم الواجب الحالي وبناء المستقبل.",
    duty_ar: "استلهام العبر من عظماء التاريخ.",
    reward_ar: "الاتصال بتراث الأمة.",
    fruit_ar: "شخصية واثقة مرتبطة بجذورها.",
    verification_ar: "اختيار شخصية تاريخية ومحاكاة سلوكها القيادي في إدارة المشروع.",
  },
  {
    level: 2, maqsad: "AQL", order: 2,
    name_ar: "تدبير أمر الأمة / المجلة",
    strategic_ar: "فهم القواعد التشريعية والعدلية، مثل مجلة الأحكام العدلية، لإدارة المجتمع.",
    duty_ar: "تطبيق العدل والقانون.",
    reward_ar: "إقامة القسط بين الناس.",
    fruit_ar: "استقرار النظام الاجتماعي والمؤسسي.",
    verification_ar: "صياغة لوائح داخلية للمشروع مستمدة من القواعد الفقهية الكلية.",
  },
  {
    level: 2, maqsad: "NASL", order: 3,
    name_ar: "آليات كسب المال",
    strategic_ar: "فهم الدورة المالية بمفهوم المقاصد الكلي، مثل الإنتاج والتبادل.",
    duty_ar: "الكسب من حلال وتجنب الربا.",
    reward_ar: "طيب المأكل واستجابة الدعاء.",
    fruit_ar: "تداول الثروة ونمو الاقتصاد الكلي.",
    verification_ar: "تطوير نموذج ربحي للمشروع يضمن تداول المال ومنع الاحتكار.",
  },
  {
    level: 2, maqsad: "MAL", order: 4,
    name_ar: "الماضي والحاضر والمستقبل — عقلي",
    strategic_ar: "استخدام الحافظة لإدراك الواقع والمخيلة لإنتاج المستقبل.",
    duty_ar: "إدراك الواقع بدقة.",
    reward_ar: "إعمال العقل والتفكر.",
    fruit_ar: "ابتكار حلول مستقبلية واختراعات.",
    verification_ar: "تصميم نموذج أولي لمختبر ابتكار أو منتج مستقبلي.",
  },

  // ── Level 3 — القيادة ──
  {
    level: 3, maqsad: "DEEN", order: 0,
    name_ar: "الطاقة الروحية",
    strategic_ar: "شحن المحرك الداخلي بالقيم والعبادات لتحمل مشاق القيادة.",
    duty_ar: "تزكية النفس وتقويتها.",
    reward_ar: "الطمأنينة والقوة الروحية.",
    fruit_ar: "الصمود أمام الأزمات والتحديات الكبرى.",
    verification_ar: "سجل الانضباط القيمي والروحي لأعضاء فريق المشروع.",
  },
  {
    level: 3, maqsad: "NAFS", order: 1,
    name_ar: "الحاجات للإنسان",
    strategic_ar: "فهم الدوافع البشرية الأساسية لتوجيه السلوك الفردي والجماعي.",
    duty_ar: "تلبية حاجات المجتمع.",
    reward_ar: "نفع الناس وإغاثة الملهوف.",
    fruit_ar: "ولاء الأفراد وتماسك النسيج الاجتماعي.",
    verification_ar: "استخدام نظرية المحفز لتعديل سلوك فريق العمل نحو الإنتاج.",
  },
  {
    level: 3, maqsad: "AQL", order: 2,
    name_ar: "برنامج تأهيل إداري وسياسي",
    strategic_ar: "اكتساب المهارات القيادية اللازمة لإدارة الهياكل الكبرى.",
    duty_ar: "تطوير الكفاءة القيادية.",
    reward_ar: "أداء الأمانة الإدارية.",
    fruit_ar: "إدارة فاعلة للمؤسسات والدولة.",
    verification_ar: "اجتياز دورات التأهيل الإداري وتقديم خطة قيادة مؤسسية.",
  },
  {
    level: 3, maqsad: "NASL", order: 3,
    name_ar: "طرق تكوين المنظمات",
    strategic_ar: "مهارات بناء المؤسسات والمشاريع من الفكرة إلى الإنشاء.",
    duty_ar: "بناء الكيانات المرابطة.",
    reward_ar: "أجر الصدقة الجارية، مثل المنظمة.",
    fruit_ar: "وجود مؤسسات قوية تدعم الرؤية.",
    verification_ar: "تأسيس مشروع في شكل كيان اجتماعي مهيكل، مثل شركة أو جمعية.",
  },
  {
    level: 3, maqsad: "MAL", order: 4,
    name_ar: "التفكير التشغيلي",
    strategic_ar: "إتقان مهارات التخطيط والتنظيم والتوجيه والرقابة اليومية.",
    duty_ar: "دقة التنفيذ اليومي.",
    reward_ar: "الإتقان في العمل.",
    fruit_ar: "جودة المخرجات وتقليل الهدر.",
    verification_ar: "وجود دليل إجرائي ونظام رقابة لعمليات المشروع.",
  },

  // ── Level 4 — التمكين ──
  {
    level: 4, maqsad: "DEEN", order: 0,
    name_ar: "التصاحب",
    strategic_ar: "بناء علاقات تكاملية بين الأعضاء تقوم على التفاهم والتكافل.",
    duty_ar: "النصح والتعاون على البر.",
    reward_ar: "ثواب الحب في الله والتعاون.",
    fruit_ar: "فريق عمل منسجم يحقق المستحيل.",
    verification_ar: "تقييم مستوى التفاهم والتكافل داخل أسرة الرواد.",
  },
  {
    level: 4, maqsad: "NAFS", order: 1,
    name_ar: "خطط، أنجز، ادرس، أنفذ",
    strategic_ar: "تطبيق دورة التحسين المستمر في جميع العمليات.",
    duty_ar: "المراجعة والتحسين الدائم.",
    reward_ar: "المحاسبة وتصحيح المسار.",
    fruit_ar: "منتجات ذات جودة عالمية منافسة.",
    verification_ar: "تطبيق منهجية PDSA في معالجة إشكالات المشروع.",
  },
  {
    level: 4, maqsad: "AQL", order: 2,
    name_ar: "القيادة",
    strategic_ar: "ممارسة القيادة بالرؤية وتحريك الآخرين نحو الغايات.",
    duty_ar: "حماية الرؤية وتوجيه الصف.",
    reward_ar: "إمامة الناس في الخير.",
    fruit_ar: "تحقيق المستهدفات الاستراتيجية للوطن.",
    verification_ar: "نجاح القائد في قيادة فريقه لإنتاج منتج استراتيجي معتمد.",
  },
  {
    level: 4, maqsad: "NASL", order: 3,
    name_ar: "تنويع المؤثرات الحيوية",
    strategic_ar: "القدرة على التعامل مع المتغيرات البيئية بمرونة وذكاء.",
    duty_ar: "اليقظة والجاهزية للمتغيرات.",
    reward_ar: "الحكمة وبصيرة المؤمن.",
    fruit_ar: "استقرار المشروع في البيئات المتقلبة.",
    verification_ar: "قدرة المشروع على الاستمرار رغم تغير الظروف الخارجية.",
  },
  {
    level: 4, maqsad: "MAL", order: 4,
    name_ar: "أصبح كل مقصد في الآخر",
    strategic_ar: "الوصول إلى حالة التكامل حيث يخدم كل مقصد المقاصد الأخرى.",
    duty_ar: "تحقيق الشمولية في الفعل.",
    reward_ar: "كمال الإيمان والعمل.",
    fruit_ar: "منتج متكامل دينيًا ونفسيًا وعقليًا وماليًا.",
    verification_ar: "مصفوفة ربط مخرجات المشروع بجميع مقاصد الشريعة الخمسة.",
  },

  // ── Level 5 — الريادة (last cell holds التدبير الاقتصادي, moved from Level 1) ──
  {
    level: 5, maqsad: "DEEN", order: 0,
    name_ar: "القياس التنموي",
    strategic_ar: "استخدام أدوات إحصائية ورياضية لقياس أثر المشروع الفعلي.",
    duty_ar: "الصدق في نقل النتائج.",
    reward_ar: "الأمانة في الشهادة.",
    fruit_ar: "بيانات دقيقة تدعم اتخاذ القرار.",
    verification_ar: "تقديم تقرير الأثر النهائي للمشروع.",
  },
  {
    level: 5, maqsad: "NAFS", order: 1,
    name_ar: "المسار / الهدف / الوصف",
    strategic_ar: "القدرة على وصف الطريق بدقة وتحديد المحطات الرئيسية.",
    duty_ar: "توضيح المسار للآخرين.",
    reward_ar: "الهداية والدلالة على الخير.",
    fruit_ar: "وضوح الرؤية واختصار الزمن.",
    verification_ar: "رسم خارطة طريق تفصيلية لمستقبل المشروع.",
  },
  {
    level: 5, maqsad: "AQL", order: 2,
    name_ar: "التوعية بالفرص والتهديدات",
    strategic_ar: "تحليل SWOT المعمق للبيئة الوطنية والدولية.",
    duty_ar: "حماية الكيان من المخاطر.",
    reward_ar: "الجهاد المعرفي والدفاع عن الأمة.",
    fruit_ar: "اقتناص الفرص الاستراتيجية للنمو.",
    verification_ar: "تحليل نقاط القوة والضعف والفرص والتهديدات للمشروع.",
  },
  {
    level: 5, maqsad: "NASL", order: 3,
    name_ar: "الاستراتيجية الوطنية",
    strategic_ar: "ربط مخرجات المشروع بالاستراتيجية الكلية للمملكة.",
    duty_ar: "المساهمة في نهضة الوطن.",
    reward_ar: "طاعة ولي الأمر ونفع الرعية.",
    fruit_ar: "تحقيق رؤية 2030 واقعًا ملموسًا.",
    verification_ar: "مواءمة نهائية للمشروع مع برامج تحقيق الرؤية الوطنية.",
  },
  {
    level: 5, maqsad: "MAL", order: 4,
    name_ar: "التدبير الاقتصادي",
    strategic_ar: "دراسة موارد الأرض، مثل الإدارة والعلم والمال والأرض، وكيفية توظيفها.",
    duty_ar: "حفظ الموارد وتنميتها.",
    reward_ar: "العفة والكفاف والغنى عن الناس.",
    fruit_ar: "الاستقلال المالي وتحقيق الرفاه.",
    verification_ar: "إعداد ميزانية تقديرية وخطة استثمار للموارد المتاحة.",
  },
];

/**
 * Idempotently ensure a school has its own Rowad model + levels + concepts.
 * Creates content only when missing, so admin/owner edits are never overwritten.
 * Returns the model id.
 */
export async function seedRowadModel(
  prisma: PrismaClient,
  schoolId: string,
): Promise<string> {
  const model = await prisma.rowadModel.upsert({
    where: { school_id: schoolId },
    update: {},
    create: { school_id: schoolId },
  });

  const levelCount = await prisma.rowadLevel.count({
    where: { model_id: model.id },
  });
  if (levelCount === 0) {
    await prisma.rowadLevel.createMany({
      data: DEFAULT_LEVELS.map((l) => ({ ...l, model_id: model.id })),
    });
  }

  const conceptCount = await prisma.rowadConcept.count({
    where: { model_id: model.id },
  });
  if (conceptCount === 0) {
    await prisma.rowadConcept.createMany({
      data: DEFAULT_CONCEPTS.map((c) => ({ ...c, model_id: model.id })),
    });
  }

  return model.id;
}
