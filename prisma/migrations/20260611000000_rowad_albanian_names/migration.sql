-- Backfill Albanian names for the Rowad model.
-- Only touches rows where name_sq IS NULL — never overwrites manual edits.

-- ── Levels ──
UPDATE "rowad_levels" SET "name_sq" = 'Niveli i Parë — Ndjekja'
  WHERE "name_sq" IS NULL AND "name_ar" = 'المستوى الأول — الاتباع';
UPDATE "rowad_levels" SET "name_sq" = 'Niveli i Dytë — Sqarimi'
  WHERE "name_sq" IS NULL AND "name_ar" = 'المستوى الثاني — الاستبانة';
UPDATE "rowad_levels" SET "name_sq" = 'Niveli i Tretë — Lidershipi'
  WHERE "name_sq" IS NULL AND "name_ar" = 'المستوى الثالث — القيادة';
UPDATE "rowad_levels" SET "name_sq" = 'Niveli i Katërt — Fuqizimi'
  WHERE "name_sq" IS NULL AND "name_ar" = 'المستوى الرابع — التمكين';
UPDATE "rowad_levels" SET "name_sq" = 'Niveli i Pestë — Pionierizmi'
  WHERE "name_sq" IS NULL AND "name_ar" = 'المستوى الخامس — الريادة';

-- ── Concepts ──
UPDATE "rowad_concepts" SET "name_sq" = 'Qëllimi i Frytshëm'
  WHERE "name_sq" IS NULL AND "name_ar" = 'النية المثمرة';
UPDATE "rowad_concepts" SET "name_sq" = 'Rrjedha e Kohës'
  WHERE "name_sq" IS NULL AND "name_ar" = 'مسار الزمن';
UPDATE "rowad_concepts" SET "name_sq" = 'Pasojat'
  WHERE "name_sq" IS NULL AND "name_ar" = 'المآلات';
UPDATE "rowad_concepts" SET "name_sq" = 'Mendimi Strategjik'
  WHERE "name_sq" IS NULL AND "name_ar" = 'التفكير الاستراتيجي';
UPDATE "rowad_concepts" SET "name_sq" = 'Strukturat Shoqërore'
  WHERE "name_sq" IS NULL AND "name_ar" = 'الهياكل الاجتماعية';
UPDATE "rowad_concepts" SET "name_sq" = 'Parimet e Zhvillimit Sheriatik'
  WHERE "name_sq" IS NULL AND "name_ar" = 'قواعد التنمية الشرعية';
UPDATE "rowad_concepts" SET "name_sq" = 'E shkuara, e tashmja & e ardhmja — Psikologjike'
  WHERE "name_sq" IS NULL AND "name_ar" = 'الماضي والحاضر والمستقبل — نفسي';
UPDATE "rowad_concepts" SET "name_sq" = 'Qeverisja e Umetit / Mexhella'
  WHERE "name_sq" IS NULL AND "name_ar" = 'تدبير أمر الأمة / المجلة';
UPDATE "rowad_concepts" SET "name_sq" = 'Mekanizmat e Fitimit'
  WHERE "name_sq" IS NULL AND "name_ar" = 'آليات كسب المال';
UPDATE "rowad_concepts" SET "name_sq" = 'E shkuara, e tashmja & e ardhmja — Intelektuale'
  WHERE "name_sq" IS NULL AND "name_ar" = 'الماضي والحاضر والمستقبل — عقلي';
UPDATE "rowad_concepts" SET "name_sq" = 'Energjia Shpirtërore'
  WHERE "name_sq" IS NULL AND "name_ar" = 'الطاقة الروحية';
UPDATE "rowad_concepts" SET "name_sq" = 'Nevojat Njerëzore'
  WHERE "name_sq" IS NULL AND "name_ar" = 'الحاجات للإنسان';
UPDATE "rowad_concepts" SET "name_sq" = 'Kualifikim Administrativ & Politik'
  WHERE "name_sq" IS NULL AND "name_ar" = 'برنامج تأهيل إداري وسياسي';
UPDATE "rowad_concepts" SET "name_sq" = 'Metodat e Formimit të Organizatave'
  WHERE "name_sq" IS NULL AND "name_ar" = 'طرق تكوين المنظمات';
UPDATE "rowad_concepts" SET "name_sq" = 'Mendimi Operacional'
  WHERE "name_sq" IS NULL AND "name_ar" = 'التفكير التشغيلي';
UPDATE "rowad_concepts" SET "name_sq" = 'Shoqërimi'
  WHERE "name_sq" IS NULL AND "name_ar" = 'التصاحب';
UPDATE "rowad_concepts" SET "name_sq" = 'Plano, Realizo, Studio, Zbato'
  WHERE "name_sq" IS NULL AND "name_ar" = 'خطط، أنجز، ادرس، أنفذ';
UPDATE "rowad_concepts" SET "name_sq" = 'Lidershipi'
  WHERE "name_sq" IS NULL AND "name_ar" = 'القيادة';
UPDATE "rowad_concepts" SET "name_sq" = 'Diversifikimi i Faktorëve Vitalë'
  WHERE "name_sq" IS NULL AND "name_ar" = 'تنويع المؤثرات الحيوية';
UPDATE "rowad_concepts" SET "name_sq" = 'Çdo qëllim i ndërthurur me të tjerët'
  WHERE "name_sq" IS NULL AND "name_ar" = 'أصبح كل مقصد في الآخر';
UPDATE "rowad_concepts" SET "name_sq" = 'Matja e Zhvillimit'
  WHERE "name_sq" IS NULL AND "name_ar" = 'القياس التنموي';
UPDATE "rowad_concepts" SET "name_sq" = 'Rrugëtimi / Synimi / Përshkrimi'
  WHERE "name_sq" IS NULL AND "name_ar" = 'المسار / الهدف / الوصف';
UPDATE "rowad_concepts" SET "name_sq" = 'Ndërgjegjësimi për Mundësitë & Kërcënimet'
  WHERE "name_sq" IS NULL AND "name_ar" = 'التوعية بالفرص والتهديدات';
UPDATE "rowad_concepts" SET "name_sq" = 'Strategjia Kombëtare'
  WHERE "name_sq" IS NULL AND "name_ar" = 'الاستراتيجية الوطنية';
UPDATE "rowad_concepts" SET "name_sq" = 'Qeverisja Ekonomike'
  WHERE "name_sq" IS NULL AND "name_ar" = 'التدبير الاقتصادي';
