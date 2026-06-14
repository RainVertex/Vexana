// Admin UI to attach external MCP servers to an agent: add/edit/remove, discover their tools, pick
// an allowlist, and run the OAuth authorize dance. Rendered on the agent detail page.
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type {
  AgentMcpServerSummary,
  CreateAgentMcpServerInput,
  McpAuthKind,
  McpProbeResult,
  McpToolInfo,
} from "@internal/shared-types";

const inputCls =
  "w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary";

interface ProbeState {
  loading: boolean;
  result?: McpProbeResult;
}

export function McpServersEditor({ agentId }: { agentId: string }) {
  const api = useApi();
  const { t } = useTranslation("agents");
  const [searchParams, setSearchParams] = useSearchParams();
  const [servers, setServers] = useState<AgentMcpServerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [probes, setProbes] = useState<Record<string, ProbeState>>({});

  const load = useCallback(() => {
    api.agents
      .listMcpServers(agentId)
      .then((res) => {
        setServers(res.items);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("mcp.errors.loadFailed")));
  }, [api, agentId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Returning from the OAuth dance lands here with ?mcp_oauth=connected. Refresh status and clear it.
  useEffect(() => {
    if (searchParams.get("mcp_oauth")) {
      void load();
      const next = new URLSearchParams(searchParams);
      next.delete("mcp_oauth");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, load]);

  async function probe(serverId: string) {
    setProbes((p) => ({ ...p, [serverId]: { loading: true } }));
    try {
      const result = await api.agents.probeMcpServer(agentId, serverId);
      setProbes((p) => ({ ...p, [serverId]: { loading: false, result } }));
    } catch (err) {
      setProbes((p) => ({
        ...p,
        [serverId]: {
          loading: false,
          result: { status: "error", message: err instanceof Error ? err.message : "error" },
        },
      }));
    }
  }

  async function remove(serverId: string) {
    try {
      await api.agents.deleteMcpServer(agentId, serverId);
      setConfirmId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mcp.errors.deleteFailed"));
    }
  }

  async function toggleEnabled(server: AgentMcpServerSummary) {
    try {
      await api.agents.updateMcpServer(agentId, server.id, { enabled: !server.enabled });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mcp.errors.saveFailed"));
    }
  }

  async function saveAllowlist(serverId: string, allow: string[]) {
    try {
      await api.agents.updateMcpServer(agentId, serverId, { toolAllowlist: allow });
      setProbes((p) => ({ ...p, [serverId]: { loading: false } }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mcp.errors.saveFailed"));
    }
  }

  if (servers === null) {
    return (
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-app-text">{t("mcp.title")}</h2>
        <p className="text-sm text-app-text-muted">{t("loading.agent")}</p>
      </section>
    );
  }

  const confirmTarget = servers.find((s) => s.id === confirmId);

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-app-text">{t("mcp.title")}</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text hover:bg-app-surface-hover"
          >
            {t("mcp.addServer")}
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-app-text-muted">{t("mcp.description")}</p>
      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}

      {adding && (
        <ServerForm
          onCancel={() => setAdding(false)}
          onSubmit={async (body) => {
            await api.agents.createMcpServer(agentId, body);
            setAdding(false);
            load();
          }}
        />
      )}

      {servers.length === 0 && !adding ? (
        <p className="text-sm text-app-text-muted">{t("mcp.none")}</p>
      ) : (
        <ul className="grid gap-2">
          {servers.map((server) => {
            const probeState = probes[server.id];
            const isEditing = editingId === server.id;
            return (
              <li
                key={server.id}
                className="rounded-md border border-app-border bg-app-surface p-3"
              >
                {isEditing ? (
                  <ServerForm
                    initial={server}
                    onCancel={() => setEditingId(null)}
                    onSubmit={async (body) => {
                      await api.agents.updateMcpServer(agentId, server.id, body);
                      setEditingId(null);
                      load();
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-app-text">{server.label}</span>
                          <span className="rounded-full border border-app-border px-2 py-0.5 text-[10px] uppercase text-app-text-muted">
                            {t(`mcp.auth${capitalize(server.authKind)}`)}
                          </span>
                          {!server.enabled && (
                            <span className="text-[10px] uppercase text-app-text-muted">
                              {t("mcp.disabled")}
                            </span>
                          )}
                        </div>
                        <div className="truncate font-mono text-xs text-app-text-muted">
                          {server.url}
                        </div>
                        <StatusLine server={server} t={t} />
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void toggleEnabled(server)}
                          className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text hover:bg-app-surface-hover"
                        >
                          {server.enabled ? t("mcp.disabled") : t("mcp.enabled")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(server.id)}
                          className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text hover:bg-app-surface-hover"
                        >
                          {t("actions.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void probe(server.id)}
                          disabled={probeState?.loading}
                          className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text hover:bg-app-surface-hover disabled:opacity-50"
                        >
                          {probeState?.loading ? t("mcp.discovering") : t("mcp.discoverTools")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(server.id)}
                          className="rounded-md border border-app-danger px-2 py-1 text-xs text-app-danger hover:bg-app-danger/10"
                        >
                          {t("mcp.delete")}
                        </button>
                      </div>
                    </div>

                    {probeState?.result && (
                      <ProbePanel
                        result={probeState.result}
                        server={server}
                        onSaveAllowlist={(allow) => void saveAllowlist(server.id, allow)}
                        onReDiscover={() => void probe(server.id)}
                        t={t}
                      />
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={t("mcp.confirmDeleteTitle")}
        message={t("mcp.confirmDeleteMessage", { label: confirmTarget?.label ?? "" })}
        confirmLabel={t("mcp.delete")}
        destructive
        onConfirm={() => confirmId && void remove(confirmId)}
        onClose={() => setConfirmId(null)}
      />
    </section>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type TFn = ReturnType<typeof useTranslation>["t"];

function StatusLine({ server, t }: { server: AgentMcpServerSummary; t: TFn }) {
  if (server.authKind === "oauth" && server.oauthConnected) {
    return <div className="text-xs text-app-success">{t("mcp.oauthConnected")}</div>;
  }
  if (server.lastError) {
    return <div className="text-xs text-app-danger">{server.lastError}</div>;
  }
  return (
    <div className="text-xs text-app-text-muted">
      {server.lastConnectedAt
        ? t("mcp.lastConnected", { when: new Date(server.lastConnectedAt).toLocaleString() })
        : t("mcp.neverConnected")}
    </div>
  );
}

function ProbePanel({
  result,
  server,
  onSaveAllowlist,
  onReDiscover,
  t,
}: {
  result: McpProbeResult;
  server: AgentMcpServerSummary;
  onSaveAllowlist: (allow: string[]) => void;
  onReDiscover: () => void;
  t: TFn;
}) {
  const [selected, setSelected] = useState<string[]>(server.toolAllowlist);

  if (result.status === "needs_auth") {
    return (
      <div className="mt-3 rounded-md border border-app-border bg-app-bg-sunken p-2 text-xs">
        <p className="mb-2 text-app-text-muted">{t("mcp.statusNeedsAuth")}</p>
        <a
          href={result.authUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-md bg-app-primary px-3 py-1.5 font-medium text-app-primary-foreground hover:opacity-90"
        >
          {t("mcp.authorize")}
        </a>
      </div>
    );
  }
  if (result.status === "error") {
    return <p className="mt-3 text-xs text-app-danger">{result.message}</p>;
  }

  const tools: McpToolInfo[] = result.tools;
  function toggle(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  return (
    <div className="mt-3 rounded-md border border-app-border bg-app-bg-sunken p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-app-text">{t("mcp.toolsTitle")}</span>
        <button
          type="button"
          onClick={onReDiscover}
          className="text-xs text-app-text-muted hover:underline"
        >
          {t("mcp.reDiscover")}
        </button>
      </div>
      <p className="mb-2 text-[11px] text-app-text-muted">{t("mcp.allToolsHint")}</p>
      <div className="grid gap-1">
        {tools.map((tool) => (
          <label key={tool.name} className="flex items-start gap-2 text-xs text-app-text">
            <input
              type="checkbox"
              checked={selected.includes(tool.name)}
              onChange={() => toggle(tool.name)}
              className="mt-0.5 text-app-primary focus:ring-app-primary"
            />
            <span>
              <span className="font-mono">{tool.name}</span>
              {tool.description && (
                <span className="block text-[11px] text-app-text-muted">{tool.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => onSaveAllowlist(selected)}
          className="rounded-md bg-app-primary px-3 py-1.5 text-xs font-medium text-app-primary-foreground hover:opacity-90"
        >
          {t("mcp.saveAllowlist")}
        </button>
      </div>
    </div>
  );
}

function ServerForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: AgentMcpServerSummary;
  onSubmit: (body: CreateAgentMcpServerInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation("agents");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [authKind, setAuthKind] = useState<McpAuthKind>(initial?.authKind ?? "none");
  const [bearerToken, setBearerToken] = useState("");
  const [oauthScope, setOauthScope] = useState(initial?.oauthScope ?? "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit() {
    setFormError(null);
    if (!label.trim() || !url.trim()) return;
    const body: CreateAgentMcpServerInput = {
      label: label.trim(),
      url: url.trim(),
      authKind,
      oauthScope: authKind === "oauth" ? oauthScope.trim() || null : null,
    };
    // Only send a bearer token when the admin typed one, so editing keeps the stored value.
    if (authKind === "bearer" && bearerToken.trim()) body.bearerToken = bearerToken.trim();
    setSaving(true);
    try {
      await onSubmit(body);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("mcp.errors.saveFailed"));
      setSaving(false);
    }
  }

  return (
    <div className="mb-3 grid gap-2 rounded-md border border-app-border bg-app-bg-sunken p-3">
      {formError && <p className="text-xs text-app-danger">{formError}</p>}
      <label className="text-xs text-app-text-muted">
        {t("mcp.labelField")}
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
      </label>
      <label className="text-xs text-app-text-muted">
        {t("mcp.urlField")}
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("mcp.urlPlaceholder")}
          className={inputCls}
        />
      </label>
      <label className="text-xs text-app-text-muted">
        {t("mcp.authKindField")}
        <select
          value={authKind}
          onChange={(e) => setAuthKind(e.target.value as McpAuthKind)}
          className={inputCls}
        >
          <option value="none">{t("mcp.authNone")}</option>
          <option value="bearer">{t("mcp.authBearer")}</option>
          <option value="oauth">{t("mcp.authOauth")}</option>
        </select>
      </label>
      {authKind === "bearer" && (
        <label className="text-xs text-app-text-muted">
          {t("mcp.bearerTokenField")}
          <input
            type="password"
            value={bearerToken}
            onChange={(e) => setBearerToken(e.target.value)}
            placeholder={t("mcp.bearerTokenPlaceholder")}
            className={inputCls}
          />
          {initial?.hasBearerToken && (
            <span className="mt-1 block text-[11px] text-app-text-muted">
              {t("mcp.bearerTokenKeep")}
            </span>
          )}
        </label>
      )}
      {authKind === "oauth" && (
        <label className="text-xs text-app-text-muted">
          {t("mcp.scopeField")}
          <input
            value={oauthScope}
            onChange={(e) => setOauthScope(e.target.value)}
            placeholder={t("mcp.scopePlaceholder")}
            className={inputCls}
          />
        </label>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-app-border px-3 py-1.5 text-xs text-app-text hover:bg-app-surface-hover"
        >
          {t("mcp.cancel")}
        </button>
        <button
          type="button"
          disabled={saving || !label.trim() || !url.trim()}
          onClick={() => void submit()}
          className="rounded-md bg-app-primary px-3 py-1.5 text-xs font-medium text-app-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {initial ? t("mcp.save") : t("mcp.add")}
        </button>
      </div>
    </div>
  );
}
