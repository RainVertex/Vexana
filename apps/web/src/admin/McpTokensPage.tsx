import { useCallback, useEffect, useState } from "react";
import { PageLayout } from "@internal/shared-ui";
import { Trans, useTranslation } from "@internal/i18n";
import { useApi } from "@internal/api-client/react";
import { useCurrentUser } from "../auth";

interface TokenRow {
  id: string;
  userId: string;
  name: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export function McpTokensPage() {
  const client = useApi();
  const me = useCurrentUser();
  const { t: tr } = useTranslation();
  const [rows, setRows] = useState<TokenRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showMint, setShowMint] = useState(false);
  const [mintForUser, setMintForUser] = useState("");
  const [mintName, setMintName] = useState("");
  const [mintScopes, setMintScopes] = useState("*");
  const [minted, setMinted] = useState<{ token: string; id: string; expiresAt: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const res = await client.adminScaffolderMcpTokens.list();
      setRows(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tokens");
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mint(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await client.adminScaffolderMcpTokens.mint({
        userId: mintForUser.trim(),
        name: mintName.trim(),
        scopes: mintScopes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setMinted(result);
      setShowMint(false);
      setMintForUser("");
      setMintName("");
      setMintScopes("*");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mint failed");
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this token? Existing MCP clients will start receiving 401s.")) return;
    setRevoking(id);
    try {
      await client.adminScaffolderMcpTokens.revoke(id);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setRevoking(null);
    }
  }

  if (me.role !== "admin") {
    return (
      <PageLayout title={tr("admin.mcpTokensTitle")} description={tr("common.adminOnly")}>
        <p className="text-sm text-app-text-muted">
          <Trans i18nKey="forbidden.body" components={{ strong: <strong /> }} />
        </p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={tr("admin.mcpTokensTitle")}
      description={tr("admin.mcpTokensDescription")}
      actions={
        <button
          type="button"
          onClick={() => setShowMint((s) => !s)}
          className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-foreground"
        >
          Mint token
        </button>
      }
    >
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {minted && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          <div className="font-medium text-amber-900">
            Token minted. Copy it now — it won&apos;t be shown again.
          </div>
          <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs text-app-text">
            {minted.token}
          </pre>
          <div className="mt-1 text-xs text-amber-800">
            id: {minted.id} · expires {new Date(minted.expiresAt).toLocaleString()}
          </div>
          <button
            type="button"
            onClick={() => setMinted(null)}
            className="mt-2 text-xs text-amber-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {showMint && (
        <form
          onSubmit={mint}
          className="mb-4 rounded-md border border-app-border bg-app-surface p-3 text-sm"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs">
              For user id
              <input
                type="text"
                required
                value={mintForUser}
                onChange={(e) => setMintForUser(e.target.value)}
                className="mt-1 w-full rounded border border-app-border bg-white px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs">
              Token name
              <input
                type="text"
                required
                value={mintName}
                onChange={(e) => setMintName(e.target.value)}
                className="mt-1 w-full rounded border border-app-border bg-white px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs">
              Scopes (comma-separated, * for all)
              <input
                type="text"
                value={mintScopes}
                onChange={(e) => setMintScopes(e.target.value)}
                className="mt-1 w-full rounded border border-app-border bg-white px-2 py-1 text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-app-primary px-3 py-1.5 text-xs font-medium text-app-primary-foreground"
            >
              Mint
            </button>
            <button
              type="button"
              onClick={() => setShowMint(false)}
              className="rounded-md border border-app-border px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!rows ? (
        <p className="text-sm text-app-text-muted">{tr("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-app-text-muted">{tr("admin.mcpTokensEmpty")}</p>
      ) : (
        <ul className="divide-y divide-app-border rounded-md border border-app-border bg-app-surface">
          {rows.map((t) => (
            <li key={t.id} className="px-3 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-app-text">{t.name}</div>
                  <div className="text-xs text-app-text-muted">
                    user {t.userId} · scopes [{t.scopes.join(", ")}]
                  </div>
                  <div className="text-xs text-app-text-muted">
                    last used {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : "never"} ·
                    expires {new Date(t.expiresAt).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={revoking === t.id}
                  onClick={() => revoke(t.id)}
                  className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  {revoking === t.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
