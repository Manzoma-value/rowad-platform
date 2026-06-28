// Shared types + helpers for the owner-report builder + viewer.

export type BlockType = "TEXT" | "HEADING" | "HIGHLIGHT" | "BULLET_LIST";

export type ReportBlock = {
  id: string;
  type: BlockType;
  title?: string;
  body?: string;
  items?: string[];
};

export type ReportImage  = { url: string; path: string; caption?: string };
export type ReportFile   = { url: string; path: string; name: string; size?: number; mime?: string };
export type ReportLink   = { title: string; description?: string; url: string };

export type ReportStatus = "DRAFT" | "PUBLISHED";

export function newBlockId(): string {
  return `b_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function emptyBlock(type: BlockType): ReportBlock {
  switch (type) {
    case "BULLET_LIST": return { id: newBlockId(), type, title: "", items: [""] };
    case "HEADING":     return { id: newBlockId(), type, title: "" };
    case "HIGHLIGHT":   return { id: newBlockId(), type, body: "" };
    default:            return { id: newBlockId(), type: "TEXT", body: "" };
  }
}

// Public-facing labels used in both the builder and the viewer.
// AR is the canonical, SQ provided for parity.
export const REPORT_LABELS = {
  ar: {
    formalReport: "تقرير رسمي",
    issuedBy:     "إدارة المنصة",
    publishedOn:  "تاريخ النشر",
    reportDate:   "تاريخ التقرير",
    school:       "المدرسة",
    introduction: "مقدمة تنفيذية",
    closingNote:  "الخاتمة",
    images:       "المرفقات المرئية",
    attachments:  "ملفات قابلة للتنزيل",
    links:        "روابط ومراجع",
    download:     "تنزيل",
    open:         "فتح الرابط",
    blockText:      "فقرة",
    blockHeading:   "عنوان قسم",
    blockHighlight: "ملاحظة مهمة",
    blockList:      "قائمة نقاط",
  },
  sq: {
    formalReport: "Raport zyrtar",
    issuedBy:     "Administrata e platformës",
    publishedOn:  "Data e publikimit",
    reportDate:   "Data e raportit",
    school:       "Shkolla",
    introduction: "Hyrje ekzekutive",
    closingNote:  "Përmbyllja",
    images:       "Galeria",
    attachments:  "Skedarë për shkarkim",
    links:        "Burime dhe lidhje",
    download:     "Shkarko",
    open:         "Hap lidhjen",
    blockText:      "Paragraf",
    blockHeading:   "Titull seksioni",
    blockHighlight: "Shënim i rëndësishëm",
    blockList:      "Listë me pika",
  },
} as const;

export type RLang = keyof typeof REPORT_LABELS;
export const pickReportLang = (l: string): RLang => (l === "sq" ? "sq" : "ar");
