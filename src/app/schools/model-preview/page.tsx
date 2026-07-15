"use client";

import { useState } from "react";
import ModelFlow from "@/components/games/ModelFlow";
import RowadBoard, { type Card } from "@/components/games/RowadBoard";

const cards: Card[] = Array.from({ length: 25 }, (_, index) => ({
  id: `preview-${index + 1}`,
  name_ar: ["الإيمان", "الوعي", "العلم", "الإرادة", "العمل"][index % 5] + ` ${Math.floor(index / 5) + 1}`,
  name_sq: `Koncepti ${index + 1}`,
  strategic_ar: "مفهوم استراتيجي يربط بين المعرفة والسلوك والأثر.",
  description_ar: "وصف مختصر يساعد المستخدم على فهم المفهوم قبل وضعه في النموذج.",
  duty_ar: "تطبيق المفهوم في الممارسة اليومية.",
  reward_ar: "تعزيز الأثر الإيجابي.",
  fruit_ar: "نمو متوازن ومستدام.",
  verification_ar: "مؤشر واضح وقابل للملاحظة.",
}));

const levels = Array.from({ length: 5 }, (_, index) => ({
  order: index + 1,
  name_ar: ["الوعي", "الفهم", "التطبيق", "التمكين", "الأثر"][index],
  name_sq: `Niveli ${index + 1}`,
}));

export default function ModelPreviewPage() {
  const [view, setView] = useState<"landing" | "stage1" | "stage2">("stage1");
  return (
    <main style={{ padding: 16, background: "#efeae0", minHeight: "100vh" }}>
      <nav style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setView("landing")}>Landing</button>
        <button onClick={() => setView("stage1")}>Stage 1</button>
        <button onClick={() => setView("stage2")}>Stage 2</button>
      </nav>
      {view === "landing" ? (
        <ModelFlow backHref="/" />
      ) : (
        <RowadBoard
          lang="ar"
          title="النموذج التعليمي للرواد"
          levels={levels}
          cards={cards}
          detailed={view === "stage2"}
          initial={[]}
          onSubmit={() => undefined}
          submitting={false}
        />
      )}
    </main>
  );
}
