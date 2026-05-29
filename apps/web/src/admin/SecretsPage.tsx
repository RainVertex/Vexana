import { useCallback, useEffect, useState } from "react";
import { PageLayout, ConfirmDialog } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { SecretDto } from "@internal/shared-types";
import { useCurrentUser } from "../auth";

// Admin secrets manager. Lists every Secret the caller can see (admin sees
// personal+team+org), surfaces the scope, and lets admins create org-scoped
// rows that any agent can attach to. Members can also create personal
// secrets here, but the wizard's inline SecretPicker is the primary path.
//
// Encryption / decryption never happens client-side: the value field is
// write-only (POST sends plaintext over HTTPS, server encrypts) and the
// list endpoint never returns the decrypted value. Deletion cascades to
// any Agent that references the secret (FK ON DELETE SET NULL, the
// agent stays but loses its API key override).

export function SecretsPage() {
  const api = useApi();
  const me = useCurrentUser();
  const [rows, setRows] = useState<SecretDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SecretDto | null>(null);

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<"personal" | "org">("org");

  const load = useCallback(async () => {
    try {
      const r = await api.secrets.list();
      setRows(r.items);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!name.trim() || !value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.secrets.create({
        name: name.trim(),
        value: value.trim(),
        scope,
      });
      setName("");
      setValue("");
      setScope("org");
      setCreating(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.secrets.delete(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (me.role !== "admin") {
    return (
      <PageLayout title="Secrets" description="Admin only.">
        <div className="text-sm text-app-text-muted">
          You need the <strong>admin</strong> role to view this page.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Secrets"
      description="Encrypted-at-rest API keys and credentials. Org-scoped secrets are visible to any agent."
    >
      {error && (
        <div className="mb-4 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-app-text-muted">
          Stored as AES-256-GCM with master key from{" "}
          <code className="text-app-text">APP_SECRET_MASTER_KEY</code>. Plaintext never returned by
          GET; only metadata is shown.
        </p>
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on hover:opacity-90"
        >
          {creating ? "Cancel" : "+ New secret"}
        </button>
      </div>

      {creating && (
        <div className="mb-4 rounded-md border border-app-border bg-app-surface p-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Org Anthropic key"
              className="w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text">Value</label>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text">Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "personal" | "org")}
              className="w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary"
            >
              <option value="org">Org — visible to any agent</option>
              <option value="personal">Personal — only visible to your agents</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void create()}
              disabled={busy || !name.trim() || !value.trim()}
              className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save secret"}
            </button>
          </div>
        </div>
      )}

      {!rows ? (
        <p className="text-sm text-app-text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-app-text-muted">No secrets yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-app-border bg-app-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-app-border">
              <tr className="text-left text-xs uppercase tracking-wide text-app-text-muted">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const scopeLabel = s.ownerUserId ? "personal" : s.ownerTeamId ? "team" : "org";
                return (
                  <tr key={s.id} className="border-t border-app-border">
                    <td className="px-4 py-3 text-app-text">{s.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          scopeLabel === "org"
                            ? "bg-app-primary-soft text-app-primary-soft-foreground"
                            : "bg-app-surface text-app-text-muted"
                        }`}
                      >
                        {scopeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-app-text-muted">
                      {s.ownerUserId ?? s.ownerTeamId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-app-text-muted">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(s)}
                        className="rounded-md border border-app-danger/40 bg-app-surface px-2.5 py-1 text-xs text-app-danger transition-colors hover:bg-app-danger hover:text-white"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete != null}
        title="Delete secret?"
        message={
          confirmDelete
            ? `Delete "${confirmDelete.name}"? Any agent currently using this secret will fall back to its provider's env var (which may not be set, breaking that agent).`
            : ""
        }
        destructive
        busy={busy}
        confirmLabel="Delete secret"
        onConfirm={() => void doDelete()}
        onClose={() => !busy && setConfirmDelete(null)}
      />
    </PageLayout>
  );
}
