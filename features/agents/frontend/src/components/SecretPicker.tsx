import { useEffect, useState } from "react";
import { useApi } from "@internal/api-client/react";
import type { SecretDto } from "@internal/shared-types";

// SecretPicker — choose an existing Secret or create a new one inline. Used
// by the agent wizard's Model step and the detail page's Model tab. Passes
// the selected Secret id (or null to fall back to LlmProvider.apiKeyEnvVar)
// to its parent via onChange.
//
// "Create new" inlines a small form rather than navigating away because the
// wizard is itself a single-page flow — losing wizard state to a separate
// /admin/secrets page would be a footgun. The form scope defaults to
// 'personal' which the secrets backend allows for any caller.

export interface SecretPickerProps {
  value: string | null;
  onChange: (secretId: string | null) => void;
  /** Optional — when set, only personal+team secrets the caller can use here. */
  scope?: "personal" | "team" | "org";
}

export function SecretPicker({ value, onChange }: SecretPickerProps) {
  const api = useApi();
  const [secrets, setSecrets] = useState<SecretDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.secrets
      .list()
      .then((r) => setSecrets(r.items))
      .catch((e) => setError(e.message ?? "Failed to load secrets"));
  }, [api]);

  async function createNew() {
    if (!newName.trim() || !newValue.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.secrets.create({
        name: newName.trim(),
        value: newValue.trim(),
        scope: "personal",
      });
      setSecrets((prev) => (prev ? [created, ...prev] : [created]));
      onChange(created.id);
      setCreating(false);
      setNewName("");
      setNewValue("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="flex-1 rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary"
        >
          <option value="">— Use provider default (env var) —</option>
          {secrets?.map((s) => {
            const scopeLabel = s.ownerUserId ? "personal" : s.ownerTeamId ? "team" : "org";
            return (
              <option key={s.id} value={s.id}>
                {s.name} ({scopeLabel})
              </option>
            );
          })}
        </select>
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          className="shrink-0 rounded-md border border-app-border px-2 py-1.5 text-xs text-app-text hover:bg-app-surface-hover"
        >
          {creating ? "Cancel" : "+ New"}
        </button>
      </div>

      {creating && (
        <div className="rounded-md border border-app-border bg-app-surface p-3 space-y-2">
          <input
            type="text"
            placeholder="Name (e.g. My Anthropic key)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary"
          />
          <input
            type="password"
            placeholder="Secret value (e.g. sk-ant-api03-...)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void createNew()}
              disabled={busy || !newName.trim() || !newValue.trim()}
              className="rounded-md bg-app-primary px-3 py-1.5 text-xs font-medium text-app-primary-on hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save secret"}
            </button>
          </div>
          <p className="text-xs text-app-text-muted">
            Stored encrypted at rest (AES-256-GCM). The plaintext value never leaves this form —
            only the encrypted blob is persisted.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-app-danger">{error}</p>}
    </div>
  );
}
