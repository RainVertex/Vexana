import { useEffect, useMemo, useState } from "react";
import { useApi } from "@internal/api-client/react";
import type { LlmModelSummary, ProviderKind } from "@internal/shared-types";
import { SecretPicker } from "./SecretPicker";

// ProviderPicker — picks an Agent.modelProvider (which adapter to use) plus
// an LlmModel row (which model to talk to) and an optional Secret override
// for the API key. Used in the wizard's Model step and the detail page's
// Model tab.
//
// The provider radio is the source of truth; we then filter the available
// LlmModel rows to match. A v1 simplification: we infer the adapter kind
// from each model's provider.kind string (slugs like "anthropic-via-openai"
// stay in 'openai_compat'; "anthropic" or future "anthropic-native"
// providers go to the native adapter). When the registry doesn't yet have
// a model that fits the chosen adapter, we surface that with a help line.

const PROVIDER_OPTIONS: Array<{
  kind: ProviderKind;
  label: string;
  description: string;
}> = [
  {
    kind: "openai_compat",
    label: "OpenAI-compatible",
    description: "OpenAI, Ollama (local), vLLM, llama.cpp, or any chat.completions endpoint",
  },
  {
    kind: "anthropic",
    label: "Anthropic (native)",
    description: "Native @anthropic-ai/sdk — prompt caching, thinking, native tool_use blocks",
  },
  {
    kind: "gemini",
    label: "Google Gemini (native)",
    description: "Native @google/genai — functionDeclarations, multi-turn function calling",
  },
];

export interface ProviderPickerValue {
  modelProvider: ProviderKind;
  modelId: string;
  secretId: string | null;
}

export interface ProviderPickerProps {
  value: ProviderPickerValue;
  onChange: (value: ProviderPickerValue) => void;
}

function inferProviderKind(model: LlmModelSummary): ProviderKind {
  const slug = model.provider.kind.toLowerCase();
  // Heuristic mapping: native Anthropic providers should be configured with
  // kind='anthropic'; the existing seeded "anthropic-via-openai" stays as
  // openai_compat. A future migration may rename these for clarity.
  if (slug === "anthropic" || slug === "anthropic-native") return "anthropic";
  if (slug === "gemini" || slug === "google-genai") return "gemini";
  return "openai_compat";
}

export function ProviderPicker({ value, onChange }: ProviderPickerProps) {
  const api = useApi();
  const [models, setModels] = useState<LlmModelSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.llm
      .listModels()
      .then((r) => setModels(r.items))
      .catch((e) => setError(e.message ?? "Failed to load models"));
  }, [api]);

  const compatibleModels = useMemo(() => {
    if (!models) return [];
    return models.filter((m) => inferProviderKind(m) === value.modelProvider);
  }, [models, value.modelProvider]);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-app-text">Adapter</label>
        <div className="grid gap-2">
          {PROVIDER_OPTIONS.map((opt) => (
            <label
              key={opt.kind}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                value.modelProvider === opt.kind
                  ? "border-app-primary bg-app-primary-soft"
                  : "border-app-border bg-app-surface hover:bg-app-surface-hover"
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={opt.kind}
                checked={value.modelProvider === opt.kind}
                onChange={() => onChange({ ...value, modelProvider: opt.kind, modelId: "" })}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium text-app-text">{opt.label}</div>
                <div className="text-xs text-app-text-muted">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="provider-picker-model"
          className="mb-2 block text-sm font-medium text-app-text"
        >
          Model
        </label>
        <select
          id="provider-picker-model"
          value={value.modelId}
          onChange={(e) => onChange({ ...value, modelId: e.target.value })}
          className="w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary"
        >
          <option value="">— Select a model —</option>
          {compatibleModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName} — {m.provider.displayName}
              {m.costPer1kIn != null
                ? ` ($${m.costPer1kIn}/1k in, $${m.costPer1kOut}/1k out)`
                : " (free / local)"}
            </option>
          ))}
        </select>
        {models && compatibleModels.length === 0 && (
          <p className="mt-1 text-xs text-app-text-muted">
            No registered models match this adapter yet. An admin can add one in the LLM registry,
            or pick a different adapter.
          </p>
        )}
        {error && <p className="mt-1 text-xs text-app-danger">{error}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-app-text">API key</label>
        <SecretPicker
          value={value.secretId}
          onChange={(secretId) => onChange({ ...value, secretId })}
        />
        <p className="mt-1 text-xs text-app-text-muted">
          Choose an encrypted secret to override the provider's default env var. Leave on "Use
          provider default" for shared org keys.
        </p>
      </div>
    </div>
  );
}
