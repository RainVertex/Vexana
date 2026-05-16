import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "@internal/api-client/react";
import type {
  ChatConversationDetailDto,
  ChatConversationSummaryDto,
  ChatMessageDto,
  ChatPreviewEvent,
} from "@internal/shared-types";
import { ConversationList } from "./ConversationList";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { useChatStream } from "./chatStream";

// Full-page chat surface. Three columns visually but two functionally:
// left rail with conversation list, main pane with messages + composer.
//
// Streaming + abort: useChatStream owns the SSE consumer. When a message is
// in flight, the Composer renders a Stop button; while a *_submit is running,
// Stop is disabled (stream.submitInFlight) so we don't orphan a GitHub team
// mid-runApproval. The card "Confirm" button sends the literal text
// "Confirm submission" as the next user message, keeping the confirmation
// flow inside the transcript and the audit trail.

export function ChatPage() {
  const api = useApi();
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();

  const [conversations, setConversations] = useState<ChatConversationSummaryDto[]>([]);
  const [active, setActive] = useState<ChatConversationDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { state: stream, send, abort, reset } = useChatStream(conversationId ?? null);

  // Load conversation list whenever we land on the page.
  useEffect(() => {
    api.chat.listConversations().then(setConversations).catch(console.error);
  }, [api]);

  // Load the active conversation's messages on navigation. Skip the fetch
  // when we already have this conversation loaded locally — handleSend
  // optimistically seeds active for a freshly-created conversation, and
  // re-fetching would clobber the user's just-sent message.
  useEffect(() => {
    if (!conversationId) {
      setActive(null);
      return;
    }
    if (active?.id === conversationId) return;
    setLoading(true);
    api.chat
      .getConversation(conversationId)
      .then((c) => {
        setActive(c);
        reset();
      })
      .catch((err) => {
        console.error(err);
        setActive(null);
      })
      .finally(() => setLoading(false));
  }, [api, conversationId, reset, active?.id]);

  // When a stream finishes, refresh the conversation so the new assistant
  // message + final tool calls land in persisted history, then reset the
  // stream. Without the reset, status stays "done" and stream.text keeps
  // rendering a live bubble on top of the now-persisted assistant message,
  // making it appear twice.
  useEffect(() => {
    if (stream.status !== "done" || !conversationId) return;
    Promise.all([api.chat.getConversation(conversationId), api.chat.listConversations()])
      .then(([detail, list]) => {
        setActive(detail);
        setConversations(list);
        reset();
      })
      .catch(console.error);
  }, [stream.status, conversationId, api, reset]);

  const handleNewChat = useCallback(() => {
    reset();
    navigate("/chat");
  }, [navigate, reset]);

  const handleDelete = useCallback(
    async (id: string) => {
      // Per memory rule, never use window.confirm — use a simple inline
      // confirmation chip instead. For v1 we use a two-step click pattern.
      if (pendingDeleteId !== id) {
        setPendingDeleteId(id);
        setTimeout(() => setPendingDeleteId(null), 3000);
        return;
      }
      await api.chat.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) navigate("/chat");
      setPendingDeleteId(null);
    },
    [api, conversationId, navigate, pendingDeleteId],
  );

  const handleSend = useCallback(
    async (text: string) => {
      let convId = conversationId;
      if (!convId) {
        // Auto-create a conversation if one isn't selected. Seed `active`
        // ourselves so the load-on-navigate effect skips its refetch and
        // our optimistic user message survives the route change.
        const conv = await api.chat.createConversation();
        setConversations((prev) => [conv, ...prev]);
        setActive({ ...conv, messages: [] });
        navigate(`/chat/${conv.id}`, { replace: true });
        convId = conv.id;
      }
      // Show the user's message immediately. The post-done refresh replaces
      // this optimistic row with the persisted one (different id) once the
      // stream finishes.
      const optimistic: ChatMessageDto = {
        id: `optimistic-${Date.now()}`,
        role: "user",
        content: text,
        toolCalls: null,
        agentRunId: null,
        createdAt: new Date().toISOString(),
      };
      setActive((prev) =>
        prev && prev.id === convId ? { ...prev, messages: [...prev.messages, optimistic] } : prev,
      );
      await send(text, convId);
    },
    [api, conversationId, navigate, send],
  );

  const handleConfirm = useCallback(
    (_p: ChatPreviewEvent) => {
      void send("Confirm submission");
    },
    [send],
  );
  const handleCancel = useCallback(
    (_p: ChatPreviewEvent) => {
      void send("Cancel, let me change something");
    },
    [send],
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <ConversationList
        conversations={conversations}
        activeId={conversationId ?? null}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
      />
      <main className="flex flex-1 flex-col bg-app-bg">
        <header className="border-b border-app-border bg-app-surface px-4 py-3">
          <h1 className="text-sm font-semibold text-app-text">
            {active?.title ?? "Platform Assistant"}
          </h1>
        </header>
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-app-text-muted">
            Loading…
          </div>
        ) : (
          <MessageList
            messages={active?.messages ?? []}
            stream={stream}
            onConfirmPreview={handleConfirm}
            onCancelPreview={handleCancel}
          />
        )}
        <Composer
          onSend={handleSend}
          onStop={abort}
          streaming={stream.status === "streaming"}
          stopDisabled={stream.submitInFlight}
        />
      </main>
    </div>
  );
}
