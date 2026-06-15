import type OpenAI from "openai";

// Image attachments ride along with the user text as native multimodal content, the chat model reads them directly.

export interface PendingAttachment {
  dataUrl: string;
}

// Single source of truth for how a user message is shaped, used for the live turn and history replay.
// Plain text when there are no images, otherwise a content array with the text followed by each image.
export function buildUserContent(
  text: string,
  attachments: { dataUrl: string }[],
): string | OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  if (attachments.length === 0) return text;
  const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
  const trimmed = text.trim();
  if (trimmed) parts.push({ type: "text", text: trimmed });
  for (const a of attachments) {
    parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
  }
  return parts;
}
