"use client";

import { useState } from "react";
import { Icons } from "./icons";
import type { Module, ModuleContent, Question, StageTrait } from "./types";
import { TextModal, ImageModal, VideoModal } from "./content-modals";
import { QuestionModal } from "./question-modal";
import { ModuleMainTraitSelector } from "./module-main-trait-selector";
import { SortableList } from "@/components/SortableList";
import { useConfirm } from "@/lib/confirm-dialog";

interface Props {
  mod: Module;
  stageTraits: StageTrait[];
  onRefresh: () => void;
}

type AddingContent = "TEXT" | "IMAGE" | "VIDEO" | null;

export function ModuleCard({ mod, stageTraits, onRefresh }: Props) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [addingContent, setAddingContent] = useState<AddingContent>(null);
  const [editingContent, setEditingContent] = useState<ModuleContent | null>(
    null,
  );
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const deleteModule = async () => {
    if (!(await confirm({
      message: "Ø³ÙŠØªÙ… Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³ØªÙˆÙ‰ ÙˆÙƒÙ„ Ù…Ø§ ÙŠØ­ØªÙˆÙŠÙ‡ Ù…Ù† Ù…Ø­ØªÙˆÙ‰ ÙˆØ£Ø³Ø¦Ù„Ø© ÙˆÙ…Ø­Ø§ÙˆÙ„Ø§Øª Ø§Ù„Ø·Ù„Ø§Ø¨ ÙÙŠÙ‡.",
      title: "Ø­Ø°Ù Ø§Ù„Ù…Ø³ØªÙˆÙ‰",
    }))) return;
    await fetch(`/api/school-admin/roadmap/modules/${mod.id}`, {
      method: "DELETE",
    });
    onRefresh();
  };

  const deleteContent = async (contentId: string) => {
    if (!(await confirm({ message: "Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ù…Ø­ØªÙˆÙ‰ØŸ" }))) return;
    await fetch(`/api/school-admin/roadmap/contents/${contentId}`, {
      method: "DELETE",
    });
    onRefresh();
  };

  const deleteQuestion = async (questionId: string) => {
    if (!(await confirm({ message: "Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¤Ø§Ù„ØŸ" }))) return;
    await fetch(`/api/school-admin/roadmap/questions/${questionId}`, {
      method: "DELETE",
    });
    onRefresh();
  };

  const reorderQuestions = async (next: Question[]) => {
    try {
      const r = await fetch(`/api/school-admin/roadmap/modules/${mod.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "questions", ids: next.map((q) => q.id) }),
      });
      if (!r.ok) onRefresh(); // snap back
    } catch {
      onRefresh();
    }
  };

  const reorderContents = async (next: ModuleContent[]) => {
    try {
      const r = await fetch(`/api/school-admin/roadmap/modules/${mod.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "contents", ids: next.map((c) => c.id) }),
      });
      if (!r.ok) onRefresh();
    } catch {
      onRefresh();
    }
  };

  const contents = mod.contents ?? [];
  const questions = mod.questions ?? [];
  const attemptCount = mod._count?.attempts ?? 0;
  const hasMainTrait = !!mod.main_trait_id;
  const mainTrait = stageTraits.find((t) => t.id === mod.main_trait_id);

  const renderContentPreview = (block: ModuleContent) => {
    if (block.type === "TEXT") {
      const preview = (block.body ?? "").slice(0, 80);
      return (
        <span className="rb-content-preview-text">
          {preview}
          {(block.body ?? "").length > 80 ? "..." : ""}
        </span>
      );
    }
    if (block.type === "IMAGE") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {block.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.image_url}
              alt={block.alt_text ?? "ØµÙˆØ±Ø©"}
              className="rb-content-thumb"
            />
          ) : (
            <span
              className="rb-content-preview-text"
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              {Icons.image} Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙˆØ±Ø©
            </span>
          )}
          {block.alt_text && (
            <span className="rb-content-preview-sub">{block.alt_text}</span>
          )}
        </div>
      );
    }
    if (block.type === "VIDEO") {
      const url = (block.video_url ?? "").slice(0, 50);
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            className="rb-content-preview-text"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {Icons.play}
            {url}
            {(block.video_url ?? "").length > 50 ? "..." : ""}
          </span>
          {block.video_title && (
            <span className="rb-content-preview-sub">{block.video_title}</span>
          )}
        </div>
      );
    }
    return null;
  };

  const contentTypeBadgeLabel = (type: string) =>
    ({ TEXT: "Ù†Øµ", IMAGE: "ØµÙˆØ±Ø©", VIDEO: "ÙÙŠØ¯ÙŠÙˆ" })[type] ?? type;

  const questionTypeLabel = (type: string) =>
    ({
      MCQ: "Ø§Ø®ØªÙŠØ§Ø± Ù…ØªØ¹Ø¯Ø¯",
      TF: "ØµØ­/Ø®Ø·Ø£",
      WRITTEN: "Ù…ÙƒØªÙˆØ¨",
      MATCHING: "Ù…Ø·Ø§Ø¨Ù‚Ø©",
    })[type] ?? type;

  const formatCorrectAnswer = (q: Question) => {
    if (q.type === "TF") return q.correct_answer === "true" ? "ØµØ­" : "Ø®Ø·Ø£";
    return q.correct_answer ?? "";
  };

  const editingContentType = editingContent?.type ?? null;

  return (
    <>
      <div className={`rb-module${open ? " open" : ""}`}>
        {/* Module Header */}
        <div className="rb-mod-head">
          <button className="rb-mod-toggle" onClick={() => setOpen((v) => !v)}>
            <span className="rb-mod-dot-wrap">
              {hasMainTrait ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#D9C9B0">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ) : (
                <span className="rb-mod-dot" />
              )}
            </span>
            <span className="rb-mod-info">
              <span className="rb-mod-name">{mod.title}</span>
              <span className="rb-mod-meta">
                <span>{contents.length} Ù…Ø­ØªÙˆÙ‰</span>
                <span className="rb-mod-meta-sep">Â·</span>
                <span>{questions.length} Ø³Ø¤Ø§Ù„</span>
                <span className="rb-mod-meta-sep">Â·</span>
                {mainTrait ? (
                  <span
                    style={{ color: "#B8A082", fontWeight: 700, fontSize: 10 }}
                  >
                    â˜… {mainTrait.name}
                  </span>
                ) : (
                  <span style={{ color: "#bbb", fontSize: 10 }}>
                    Ø¨Ù„Ø§ Ø³Ù…Ø© Ù…Ø´ØºÙ‘Ù„Ø©
                  </span>
                )}
                <span className="rb-mod-meta-sep">Â·</span>
                <span
                  className="rb-completion"
                  style={{
                    color: attemptCount > 0 ? "#16a34a" : "var(--muted)",
                  }}
                >
                  {attemptCount > 0 ? `âœ“ ${attemptCount} Ø£ÙƒÙ…Ù„ÙˆØ§` : "0 Ø£ÙƒÙ…Ù„ÙˆØ§"}
                </span>
              </span>
            </span>
            <span className={`rb-chevron dark${open ? " open" : ""}`}>
              {Icons.chevronDown}
            </span>
          </button>
          <button
            className="rb-icon-btn danger"
            onClick={deleteModule}
            title="Ø­Ø°Ù Ø§Ù„Ù…Ø³ØªÙˆÙ‰"
          >
            {Icons.trash}
          </button>
        </div>

        {/* Module Body */}
        {open && (
          <div className="rb-mod-body">
            {/* â”€â”€ CONTENT SECTION â”€â”€ */}
            <div className="rb-content-section">
              <div className="rb-section-label">
                <span className="rb-section-label-line" />
                <span className="rb-section-label-text">Ø¯Ø±Ø³</span>
              </div>

              {contents.length > 0 ? (
                <SortableList
                  items={contents}
                  onReorder={reorderContents}
                  className="rb-content-list"
                  gap={6}
                  renderItem={(block, { dragHandleProps }) => (
                    <div className="rb-content-block">
                      <span
                        className="rb-drag-handle"
                        {...dragHandleProps}
                        title="Ø§Ø³Ø­Ø¨ Ù„Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ±ØªÙŠØ¨"
                        aria-label="Drag to reorder"
                      >
                        {Icons.drag}
                      </span>
                      <span className={`rb-content-type-badge ${block.type}`}>
                        {contentTypeBadgeLabel(block.type)}
                      </span>
                      <div className="rb-content-preview">
                        {renderContentPreview(block)}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          className="rb-icon-btn"
                          onClick={() => setEditingContent(block)}
                          title="ØªØ¹Ø¯ÙŠÙ„"
                        >
                          {Icons.edit}
                        </button>
                        <button
                          className="rb-icon-btn danger"
                          onClick={() => deleteContent(block.id)}
                          title="Ø­Ø°Ù"
                        >
                          {Icons.trash}
                        </button>
                      </div>
                    </div>
                  )}
                />
              ) : (
                <div className="rb-empty-inline">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø­ØªÙˆÙ‰ Ø¨Ø¹Ø¯</div>
              )}

              <div className="rb-add-content-row">
                <button
                  className="rb-add-content-pill"
                  onClick={() => setAddingContent("TEXT")}
                >
                  {Icons.text} Ù†Øµ+
                </button>
                <button
                  className="rb-add-content-pill"
                  onClick={() => setAddingContent("IMAGE")}
                >
                  {Icons.image} ØµÙˆØ±Ø©+
                </button>
                <button
                  className="rb-add-content-pill"
                  onClick={() => setAddingContent("VIDEO")}
                >
                  {Icons.video} ÙÙŠØ¯ÙŠÙˆ+
                </button>
              </div>
            </div>

            {/* â”€â”€ DIVIDER â”€â”€ */}
            <div className="rb-section-divider">
              <span className="rb-divider-line" />
              <span className="rb-divider-diamond">â—†</span>
              <span className="rb-divider-line" />
            </div>

            {/* â”€â”€ QUESTIONS SECTION â”€â”€ */}
            <div className="rb-q-section">
              <div className="rb-section-label">
                <span className="rb-section-label-line" />
                <span className="rb-section-label-text">Ø£Ø³Ø¦Ù„Ø©</span>
              </div>

              {questions.length > 0 ? (
                <SortableList
                  items={questions}
                  onReorder={reorderQuestions}
                  className="rb-q-list"
                  gap={7}
                  renderItem={(q, { index, dragHandleProps }) => (
                    <div className="rb-q-item">
                      <span
                        className="rb-drag-handle"
                        {...dragHandleProps}
                        title="Ø§Ø³Ø­Ø¨ Ù„Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ±ØªÙŠØ¨"
                        aria-label="Drag to reorder"
                        style={{ ...dragHandleProps.style, alignSelf: "center" }}
                      >
                        {Icons.drag}
                      </span>
                      <span className="rb-q-num">{index + 1}</span>
                      <div className="rb-q-body">
                        <span className="rb-q-text" dir="rtl">
                          {q.text}
                        </span>
                        <div className="rb-q-tags">
                          <span className={`rb-tag ${q.type}`}>
                            {questionTypeLabel(q.type)}
                          </span>
                          {q.type !== "MATCHING" && (
                            <span className="rb-tag answer">
                              {Icons.check} {formatCorrectAnswer(q)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          className="rb-icon-btn"
                          onClick={() => setEditingQuestion(q)}
                          title="ØªØ¹Ø¯ÙŠÙ„"
                        >
                          {Icons.edit}
                        </button>
                        <button
                          className="rb-icon-btn danger"
                          onClick={() => deleteQuestion(q.id)}
                          title="Ø­Ø°Ù"
                        >
                          {Icons.trash}
                        </button>
                      </div>
                    </div>
                  )}
                />
              ) : (
                <div className="rb-empty-inline">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ø³Ø¦Ù„Ø© Ø¨Ø¹Ø¯</div>
              )}

              <button
                className="rb-add-q-btn"
                onClick={() => setAddingQuestion(true)}
              >
                {Icons.plus} Ø¥Ø¶Ø§ÙØ© Ø³Ø¤Ø§Ù„
              </button>
            </div>

            {/* â”€â”€ DIVIDER â”€â”€ */}
            {stageTraits.length > 0 && (
              <div className="rb-section-divider">
                <span className="rb-divider-line" />
                <span className="rb-divider-diamond">â—†</span>
                <span className="rb-divider-line" />
              </div>
            )}

            {/* â”€â”€ MAIN TRAIT SECTION â”€â”€ */}
            {stageTraits.length > 0 && (
              <div className="rb-q-section">
                <ModuleMainTraitSelector
                  moduleId={mod.id}
                  mainTraitId={mod.main_trait_id}
                  stageTraits={stageTraits}
                  onRefresh={onRefresh}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* â”€â”€ MODALS â”€â”€ */}
      {addingContent === "TEXT" && (
        <TextModal
          moduleId={mod.id}
          onClose={() => setAddingContent(null)}
          onSaved={() => {
            setAddingContent(null);
            onRefresh();
          }}
        />
      )}
      {addingContent === "IMAGE" && (
        <ImageModal
          moduleId={mod.id}
          onClose={() => setAddingContent(null)}
          onSaved={() => {
            setAddingContent(null);
            onRefresh();
          }}
        />
      )}
      {addingContent === "VIDEO" && (
        <VideoModal
          moduleId={mod.id}
          onClose={() => setAddingContent(null)}
          onSaved={() => {
            setAddingContent(null);
            onRefresh();
          }}
        />
      )}

      {editingContent && editingContentType === "TEXT" && (
        <TextModal
          moduleId={mod.id}
          content={editingContent}
          onClose={() => setEditingContent(null)}
          onSaved={() => {
            setEditingContent(null);
            onRefresh();
          }}
        />
      )}
      {editingContent && editingContentType === "IMAGE" && (
        <ImageModal
          moduleId={mod.id}
          content={editingContent}
          onClose={() => setEditingContent(null)}
          onSaved={() => {
            setEditingContent(null);
            onRefresh();
          }}
        />
      )}
      {editingContent && editingContentType === "VIDEO" && (
        <VideoModal
          moduleId={mod.id}
          content={editingContent}
          onClose={() => setEditingContent(null)}
          onSaved={() => {
            setEditingContent(null);
            onRefresh();
          }}
        />
      )}

      {addingQuestion && (
        <QuestionModal
          moduleId={mod.id}
          onClose={() => setAddingQuestion(false)}
          onSaved={() => {
            setAddingQuestion(false);
            onRefresh();
          }}
        />
      )}
      {editingQuestion && (
        <QuestionModal
          moduleId={mod.id}
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={() => {
            setEditingQuestion(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

