// Plane integration detail — sync status, manual "Sync now", and the
// user-mapping panel where admins reconcile platform users to Plane members
// when email auto-match doesn't pick them up.

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type {
  PlaneIntegrationStatusDto,
  PlaneMemberDto,
  PlaneUserMappingDto,
  UserSummary,
} from "@internal/shared-types";

export function IntegrationDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const api = useApi();
  const [status, setStatus] = useState<PlaneIntegrationStatusDto | null>(null);
  const [mappings, setMappings] = useState<PlaneUserMappingDto[]>([]);
  const [unmapped, setUnmapped] = useState<PlaneMemberDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([
        api.workspace.getIntegration(id),
        api.workspace.listMembers(id),
      ]);
      setStatus(s);
      setMappings(m.mappings);
      setUnmapped(m.unmappedMembers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  }, [api, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSync() {
    setBusy(true);
    try {
      await api.workspace.sync(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageLayout
      title={status?.name ?? "Plane integration"}
      description={status ? `Workspace: ${status.workspaceName ?? status.workspaceSlug}` : ""}
      actions={
        <button
          type="button"
          onClick={handleSync}
          disabled={busy}
          className="rounded-md bg-app-primary px-3 py-1 text-sm text-app-primary-on disabled:opacity-50"
        >
          {busy ? "Syncing…" : "Sync now"}
        </button>
      }
    >
      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}

      {status && (
        <section className="mb-6 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Stat label="Projects" value={String(status.projectCount)} />
          <Stat label="Members" value={String(status.memberCount)} />
          <Stat label="Unmapped" value={String(status.unmappedMemberCount)} />
          <Stat
            label="Last full sync"
            value={
              status.lastFullSyncAt ? new Date(status.lastFullSyncAt).toLocaleString() : "never"
            }
          />
        </section>
      )}

      {status && (
        <WebhookSecretPanel integrationId={id} hasSecret={status.hasWebhookSecret} onSaved={load} />
      )}

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold text-app-text">Mapped users</h3>
        {mappings.length === 0 ? (
          <p className="text-xs text-app-text-muted">No mappings yet.</p>
        ) : (
          <ul className="divide-y divide-app-border rounded-md border border-app-border">
            {mappings.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="text-app-text">
                    {m.user.displayName}{" "}
                    <span className="text-app-text-muted">({m.user.email})</span>
                  </div>
                  <div className="text-xs text-app-text-muted">
                    Plane: {m.member.displayName} ({m.member.email})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await api.workspace.unmapUser(id, m.id);
                    await load();
                  }}
                  className="text-xs text-app-danger hover:underline"
                >
                  Unmap
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-app-text">
          Unmapped Plane members ({unmapped.length})
        </h3>
        {unmapped.length === 0 ? (
          <p className="text-xs text-app-text-muted">All members are mapped.</p>
        ) : (
          <ul className="space-y-2">
            {unmapped.map((member) => (
              <UnmappedMemberRow
                key={member.id}
                member={member}
                onMap={async (platformUserId) => {
                  await api.workspace.mapUser(id, {
                    platformUserId,
                    planeMemberId: member.id,
                  });
                  await load();
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </PageLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-app-border bg-app-surface p-3">
      <div className="text-xs uppercase tracking-wide text-app-text-muted">{label}</div>
      <div className="mt-1 text-app-text">{value}</div>
    </div>
  );
}

// Plane generates the webhook secret on its side and shows it once. The
// admin pastes it here so our receiver can verify incoming signatures.
function WebhookSecretPanel({
  integrationId,
  hasSecret,
  onSaved,
}: {
  integrationId: string;
  hasSecret: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const api = useApi();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!value.trim()) {
      setError("Paste the secret Plane gave you.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.integrations.setWebhookSecret(integrationId, value.trim());
      setValue("");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-md border border-app-border bg-app-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-app-text">Webhook secret</h3>
        <span className={`text-xs ${hasSecret ? "text-app-text-muted" : "text-app-danger"}`}>
          {hasSecret ? "✓ set" : "not set — webhooks will be rejected"}
        </span>
      </div>
      <p className="mb-2 text-xs text-app-text-muted">
        Plane shows this secret <em>once</em> when you create or rotate the webhook (looks like{" "}
        <code>plane_wh_…</code>). Paste it here so we can verify incoming signatures.
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hasSecret ? "Paste a new secret to rotate…" : "plane_wh_…"}
          className="flex-1 rounded border border-app-border bg-app-bg px-2 py-1.5 text-sm text-app-text"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-app-danger">{error}</p>}
    </section>
  );
}

function UnmappedMemberRow({
  member,
  onMap,
}: {
  member: PlaneMemberDto;
  onMap: (platformUserId: string) => Promise<void>;
}) {
  const api = useApi();
  const [query, setQuery] = useState(member.email);
  const [results, setResults] = useState<UserSummary[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    api.users
      .search(query, 5)
      .then((res) => setResults(res.items))
      .catch(() => setResults([]));
  }, [api, query]);

  return (
    <li className="rounded-md border border-app-border bg-app-surface p-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-app-text">{member.displayName}</div>
          <div className="text-xs text-app-text-muted">{member.email}</div>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search platform user…"
          className="rounded border border-app-border bg-app-bg px-2 py-1 text-xs"
        />
      </div>
      {results.length > 0 && (
        <ul className="mt-2 space-y-1">
          {results.map((u) => (
            <li key={u.id} className="flex items-center justify-between text-xs">
              <span>
                {u.displayName} <span className="text-app-text-muted">({u.email})</span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onMap(u.id);
                  } finally {
                    setBusy(false);
                  }
                }}
                className="rounded bg-app-primary px-2 py-0.5 text-app-primary-on"
              >
                Map
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
