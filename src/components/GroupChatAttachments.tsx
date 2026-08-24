import { FileText } from "lucide-react";
import { formatAttachmentSize, type TeacherGroupAttachment } from "@/lib/teacher-group-attachments";

export default function GroupChatAttachments({
  attachments,
  openLabel,
}: {
  attachments: TeacherGroupAttachment[];
  openLabel: string;
}) {
  if (!attachments.length) return null;
  return (
    <div className="group-chat-attachments">
      {attachments.map((attachment) => {
        if (attachment.kind === "IMAGE") {
          return (
            <a key={attachment.id} className="group-chat-image" href={attachment.url} target="_blank" rel="noreferrer" aria-label={`${openLabel}: ${attachment.name}`}>
              {/* Group images use a protected, session-aware API URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={attachment.url} alt={attachment.name} loading="lazy" />
            </a>
          );
        }
        if (attachment.kind === "VIDEO") {
          return (
            <div key={attachment.id} className="group-chat-video">
              <video src={attachment.url} controls preload="metadata" playsInline />
              <span>{attachment.name} · {formatAttachmentSize(attachment.size_bytes)}</span>
            </div>
          );
        }
        return (
          <a key={attachment.id} className="group-chat-pdf" href={attachment.url} target="_blank" rel="noreferrer">
            <FileText size={20} />
            <span><strong>{attachment.name}</strong><small>{formatAttachmentSize(attachment.size_bytes)}</small></span>
            <em>{openLabel}</em>
          </a>
        );
      })}
    </div>
  );
}
