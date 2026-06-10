// Scrollable message log: persisted messages, optimistic/live turn, errors, and autoscroll.
import { useEffect, useRef } from "react";
import type { ChatMessageDto } from "@internal/shared-types";
import { useTranslation } from "@internal/i18n";
import { MessageBubble } from "./MessageBubble";
import type { ChatStreamState } from "./chatStream";

interface Props {
  messages: ChatMessageDto[];
  // Optimistic user message rendered while the current turn is streaming.
  pendingUserMessage?: ChatMessageDto | null;
  stream: ChatStreamState;
  userName?: string;
  userAvatarUrl?: string | null;
  assistantName?: string;
  assistantAvatarUrl?: string | null;
}

export function MessageList({
  messages,
  pendingUserMessage,
  stream,
  userName,
  userAvatarUrl,
  assistantName,
  assistantAvatarUrl,
}: Props) {
  const { t } = useTranslation("chat");
  const containerRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);

  // Autoscroll the log's own container only, so mounting the widget never scrolls the page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: didInitialScroll.current ? "smooth" : "auto" });
    didInitialScroll.current = true;
  }, [messages, stream.text, stream.reasoning, stream.toolCalls.length]);

  return (
    <div ref={containerRef} className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
      {messages.length === 0 && stream.status === "idle" && (
        <div className="mx-auto max-w-md rounded-app-lg border border-app-border bg-app-surface p-4 text-center text-sm text-app-text-muted">
          <p className="mb-1 font-medium text-app-text">{t("welcome.title")}</p>
          <p>{t("welcome.body")}</p>
        </div>
      )}
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          assistantName={assistantName}
          assistantAvatarUrl={assistantAvatarUrl}
        />
      ))}
      {pendingUserMessage && (
        <MessageBubble
          key={pendingUserMessage.id}
          message={pendingUserMessage}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          assistantName={assistantName}
          assistantAvatarUrl={assistantAvatarUrl}
        />
      )}
      {(stream.status === "streaming" ||
        stream.status === "done" ||
        (stream.status !== "idle" &&
          (stream.text || stream.reasoning || stream.toolCalls.length > 0))) && (
        <MessageBubble
          message={{
            id: "live",
            role: "assistant",
            content: stream.text,
            reasoning: stream.reasoning,
            reasoningStartedAt: stream.reasoningStartedAt,
            reasoningDurationMs: stream.reasoningDurationMs,
          }}
          liveCalls={stream.toolCalls}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          assistantName={assistantName}
          assistantAvatarUrl={assistantAvatarUrl}
        />
      )}
      {stream.status === "error" && stream.error && (
        <div className="rounded-app-md border border-app-border bg-app-danger-soft px-3 py-2 text-sm text-app-danger-foreground">
          {stream.error}
        </div>
      )}
    </div>
  );
}
