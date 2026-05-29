import type { ProviderKind } from "@internal/shared-types";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { openaiCompatAdapter } from "./openaiCompat";
import type { ProviderAdapter } from "./providerAdapter";

// Adapter registry. selectAdapter(profile.modelProvider) is the only entry
// point streamExecutor and runAgent need to know about, every provider
// returns an OpenAI-shaped AdapterResult so the rest of the loop is
// model-agnostic.
//
// The kind comes from Agent.modelProvider on the row (set when an agent is
// created in the wizard). Existing rows default to 'openai_compat' so the
// pre-Pass-2 OpenAI/Ollama/Anthropic-via-shim path keeps working unchanged.

const REGISTRY: Record<ProviderKind, ProviderAdapter> = {
  openai_compat: openaiCompatAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
};

export function selectAdapter(kind: ProviderKind | string): ProviderAdapter {
  const adapter = REGISTRY[kind as ProviderKind];
  if (!adapter) {
    throw new Error(
      `Unknown modelProvider '${kind}'. Expected one of: openai_compat, anthropic, gemini.`,
    );
  }
  return adapter;
}

export type { ProviderAdapter, AdapterRequest, AdapterResult } from "./providerAdapter";
