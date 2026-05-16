import { useEffect, useRef, useState } from "react";
import { useApi } from "@internal/api-client/react";
import type { CatalogEntityKind, Team } from "@internal/shared-types";

const KINDS: CatalogEntityKind[] = [
  "service",
  "api",
  "library",
  "website",
  "database",
  "infrastructure",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function RegisterEntityDialog({ open, onClose, onCreated }: Props) {
  const api = useApi();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<CatalogEntityKind>("service");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [tags, setTags] = useState("");
  const [ownerTeamIds, setOwnerTeamIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api.teams
      .list()
      .then((res) => setTeams(res.items))
      .catch(() => setTeams([]));
  }, [api, open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  function reset() {
    setKind("service");
    setName("");
    setDescription("");
    setRepoUrl("");
    setTags("");
    setOwnerTeamIds([]);
    setError(null);
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.catalog.create({
        kind,
        name: name.trim(),
        description: description.trim() || undefined,
        repoUrl: repoUrl.trim() || undefined,
        tags:
          tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean) || undefined,
        ownerTeamIds: ownerTeamIds.length > 0 ? ownerTeamIds : undefined,
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register entity");
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-lg border border-app-border bg-app-surface p-0 text-app-text backdrop:bg-black/40"
    >
      <form onSubmit={handleSubmit} className="w-[480px] max-w-[90vw] p-5">
        <h2 className="mb-4 text-lg font-semibold">Register existing service</h2>

        <Field label="Kind">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CatalogEntityKind)}
            className={inputClass}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. payments-svc"
            className={inputClass}
          />
        </Field>

        <Field label="Description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this do?"
            className={inputClass}
          />
        </Field>

        <Field label="Repository URL">
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/org/repo"
            className={inputClass}
          />
        </Field>

        <Field label="Owner teams (cmd/ctrl-click for multiple)">
          <select
            multiple
            value={ownerTeamIds}
            onChange={(e) =>
              setOwnerTeamIds(Array.from(e.target.selectedOptions, (opt) => opt.value))
            }
            className={`${inputClass} h-24`}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tags (comma-separated)">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="rest, typescript"
            className={inputClass}
          />
        </Field>

        {error && <p className="mt-2 text-sm text-app-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-app-border px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on disabled:opacity-50"
          >
            {submitting ? "Registering…" : "Register"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

const inputClass =
  "w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs text-app-text-muted">
        {label}
        {required && <span className="text-app-danger"> *</span>}
      </span>
      {children}
    </label>
  );
}
