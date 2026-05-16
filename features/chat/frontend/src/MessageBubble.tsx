import type { ChatMessageDto, ChatPreviewEvent } from "@internal/shared-types";
import { ToolCallChip } from "./ToolCallChip";
import { PreviewCard } from "./PreviewCard";
import type { ChatToolCallView } from "./chatStream";

interface Props {
  message: ChatMessageDto | LiveAssistantMessage;
  previews?: ChatPreviewEvent[];
  liveCalls?: ChatToolCallView[];
  onConfirmPreview?: (preview: ChatPreviewEvent) => void;
  onCancelPreview?: (preview: ChatPreviewEvent) => void;
  /** Disable preview confirm/cancel buttons (e.g. */
  previewsDisabled?: boolean;
}

export interface LiveAssistantMessage {
  id: "live";
  role: "assistant";
  content: string;
}

function isLive(m: Props["message"]): m is LiveAssistantMessage {
  return m.id === "live";
}

export function MessageBubble({
  message,
  previews = [],
  liveCalls = [],
  onConfirmPreview,
  onCancelPreview,
  previewsDisabled,
}: Props) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-app-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-app-primary-soft text-app-primary-soft-foreground"
            : "bg-app-surface text-app-text border border-app-border"
        }`}
      >
        {!isUser && liveCalls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {liveCalls.map((c) => (
              <ToolCallChip key={c.id} call={c} />
            ))}
          </div>
        )}
        {!isUser && !isLive(message) && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {message.toolCalls.map((c, i) => (
              <ToolCallChip
                key={i}
                call={{
                  id: String(i),
                  name: c.name,
                  args: (c.input as Record<string, unknown>) ?? {},
                  result: c.output,
                  error: c.isError ? String(c.output) : undefined,
                  done: true,
                }}
              />
            ))}
          </div>
        )}
        {message.content && <div className="whitespace-pre-wrap">{message.content}</div>}
        {!isUser &&
          previews.map((p) => (
            <PreviewCard
              key={p.shortHandle}
              preview={p}
              disabled={previewsDisabled}
              onConfirm={() => onConfirmPreview?.(p)}
              onCancel={() => onCancelPreview?.(p)}
            />
          ))}
      </div>
    </div>
  );
}
