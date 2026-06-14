import type { ProviderKind } from "@internal/shared-types";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { openaiCompatAdapter } from "./openaiCompat";
import { openaiResponsesAdapter } from "./openaiResponses";
import type { ProviderAdapter } from "./providerAdapter";

// Provider adapter registry; every adapter returns an OpenAI-shaped AdapterResult.

const REGISTRY: Record<ProviderKind, ProviderAdapter> = {
  openai_compat: openaiCompatAdapter,
  openai_responses: openaiResponsesAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
};

export function selectAdapter(kind: ProviderKind | string): ProviderAdapter {
  const adapter = REGISTRY[kind as ProviderKind];
  if (!adapter) {
    throw new Error(
      `Unknown provider kind '${kind}'. Expected one of: openai_compat, openai_responses, anthropic, gemini.`,
    );
  }
  return adapter;
}

// Official OpenAI uses the Responses API (reasoning summaries); other OpenAI-wire providers
// (Ollama, vLLM, llama.cpp) stay on chat.completions via openai_compat.
export function providerKindFromProvider(provider: { kind: string }): ProviderKind {
  switch (provider.kind) {
    case "anthropic":
      return "anthropic";
    case "gemini":
      return "gemini";
    case "openai":
      return "openai_responses";
    default:
      return "openai_compat";
  }
}

export type { ProviderAdapter, AdapterRequest, AdapterResult } from "./providerAdapter";
