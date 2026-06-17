import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore } from "@internal/api-client";
import type {
  ChatConversationSummaryDto,
  ChatConversationDetailDto,
  ChatConfigDto,
} from "@feature/chat-shared";

export function createChatClient(core: ApiCore) {
  return {
    listConversations: () => core.request<ChatConversationSummaryDto[]>(`/api/chat/conversations`),
    createConversation: (body: { title?: string } = {}) =>
      core.request<ChatConversationSummaryDto>(`/api/chat/conversations`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getConfig: () => core.request<ChatConfigDto>(`/api/chat/config`),
    getConversation: (id: string) =>
      core.request<ChatConversationDetailDto>(`/api/chat/conversations/${encodeURIComponent(id)}`),
    deleteConversation: (id: string) =>
      core.request<void>(`/api/chat/conversations/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  };
}

export function useChatApi() {
  const core = useApiCore();
  return useMemo(() => createChatClient(core), [core]);
}
