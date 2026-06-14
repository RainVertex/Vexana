import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@internal/api-client";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type {
  GithubInstallationSummary,
  TeamPolicyViolation,
  UserSummary,
} from "@internal/shared-types";
import { UserPicker } from "./UserPicker";

// Shared "Request a team" form body, used by both the dialog and the full page.
export interface RequestTeamFormProps {
  // createdTeamSlug is almost always null since requests need approval first.
  onSubmitted: (createdTeamSlug: string | null) => void;
  onCancel?: () => void;
  variant?: "dialog" | "page";
}

interface SubmitError {
  message: string;
  policyViolation: TeamPolicyViolation | null;
}

export function RequestTeamForm({
  onSubmitted,
  onCancel,
  variant = "dialog",
}: RequestTeamFormProps) {
  const api = useApi();
  const { t } = useTranslation("teams");
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mirrorToGithub, setMirrorToGithub] = useState(false);
  const [installations, setInstallations] = useState<GithubInstallationSummary[]>([]);
  const [installationsLoaded, setInstallationsLoaded] = useState(false);
  const [githubIntegrationId, setGithubIntegrationId] = useState("");
  const [pickedMaintainers, setPickedMaintainers] = useState<UserSummary[]>([]);
  const [pickedMembers, setPickedMembers] = useState<UserSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SubmitError | null>(null);

  useEffect(() => {
    setInstallationsLoaded(false);
    api.integrations
      .githubInstallations()
      .then((res) => setInstallations(res.items))
      .catch(() => setInstallations([]))
      .finally(() => setInstallationsLoaded(true));
  }, [api]);

  const slugError = error?.policyViolation?.field === "slug" ? error.policyViolation.message : null;
  const nameError = error?.policyViolation?.field === "name" ? error.policyViolation.message : null;
  const generalError = error && !error.policyViolation ? error.message : null;

  const canSubmit = useMemo(() => {
    if (!slug || !name) return false;
    if (mirrorToGithub && !githubIntegrationId) return false;
    return !busy;
  }, [busy, mirrorToGithub, githubIntegrationId, slug, name]);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.teamRequests.submit({
        slug,
        name,
        description: description || undefined,
        mirrorToGithub,
        githubIntegrationId: mirrorToGithub ? githubIntegrationId : undefined,
        proposedMaintainerUserIds: pickedMaintainers.map((u) => u.id),
        proposedMemberUserIds: pickedMembers.map((u) => u.id),
      });
      onSubmitted(res.createdTeamSlug ?? null);
    } catch (err) {
      setError(toSubmitError(err, t("errors.submissionFailed")));
    } finally {
      setBusy(false);
    }
  }

  // A user appears once across both lists; picking in one moves them out of the other.
  const excludeIds = useMemo(
    () => [...pickedMaintainers.map((u) => u.id), ...pickedMembers.map((u) => u.id)],
    [pickedMaintainers, pickedMembers],
  );
  function addMaintainer(u: UserSummary) {
    setPickedMaintainers((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, u]));
    setPickedMembers((prev) => prev.filter((p) => p.id !== u.id));
  }
  function addMember(u: UserSummary) {
    setPickedMembers((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, u]));
    setPickedMaintainers((prev) => prev.filter((p) => p.id !== u.id));
  }
  function removeMaintainer(id: string) {
    setPickedMaintainers((prev) => prev.filter((u) => u.id !== id));
  }
  function removeMember(id: string) {
    setPickedMembers((prev) => prev.filter((u) => u.id !== id));
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-app-border bg-app-surface px-2 py-1 text-app-text";

  return (
    <div className={variant === "page" ? "max-w-xl space-y-4 text-sm" : "space-y-3 text-sm"}>
      <label className="block">
        <span className="text-xs text-app-text-muted">{t("form.teamNameLabel")}</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("form.teamNamePlaceholder")}
          disabled={busy}
          className={inputClass}
        />
        {nameError && <p className="mt-1 text-xs text-app-danger">{nameError}</p>}
      </label>

      <label className="block">
        <span className="text-xs text-app-text-muted">{t("form.slugLabel")}</span>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={t("form.slugPlaceholder")}
          disabled={busy}
          className={inputClass}
        />
        {slugError && <p className="mt-1 text-xs text-app-danger">{slugError}</p>}
      </label>

      <label className="block">
        <span className="text-xs text-app-text-muted">{t("form.descriptionLabel")}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
          rows={3}
          className={inputClass}
        />
      </label>

      <section className="space-y-2">
        <div>
          <div className="text-xs text-app-text-muted">{t("form.maintainersLabel")}</div>
          {pickedMaintainers.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-1">
              {pickedMaintainers.map((u) => (
                <UserChip
                  key={u.id}
                  user={u}
                  disabled={busy}
                  onRemove={() => removeMaintainer(u.id)}
                />
              ))}
            </ul>
          )}
          <div className="mt-1">
            <UserPicker
              excludeIds={excludeIds}
              onSelect={addMaintainer}
              placeholder={t("form.addMaintainerPlaceholder")}
              disabled={busy}
            />
          </div>
        </div>

        <div>
          <div className="text-xs text-app-text-muted">{t("form.membersLabel")}</div>
          {pickedMembers.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-1">
              {pickedMembers.map((u) => (
                <UserChip key={u.id} user={u} disabled={busy} onRemove={() => removeMember(u.id)} />
              ))}
            </ul>
          )}
          <div className="mt-1">
            <UserPicker
              excludeIds={excludeIds}
              onSelect={addMember}
              placeholder={t("form.addMemberPlaceholder")}
              disabled={busy}
            />
          </div>
        </div>

        <p className="text-xs text-app-text-muted">{t("form.noMembersHint")}</p>
      </section>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={mirrorToGithub}
          onChange={(e) => setMirrorToGithub(e.target.checked)}
          disabled={busy}
        />
        <span className="text-app-text">{t("form.mirrorToGithub")}</span>
      </label>

      {mirrorToGithub && (
        <label className="block">
          <span className="text-xs text-app-text-muted">{t("form.whichGithubOrg")}</span>
          <select
            value={githubIntegrationId}
            onChange={(e) => setGithubIntegrationId(e.target.value)}
            disabled={busy || !installationsLoaded || installations.length === 0}
            className={inputClass}
          >
            <option value="">{t("form.selectOrgPlaceholder")}</option>
            {installations.map((i) => (
              <option key={i.integrationId} value={i.integrationId}>
                {i.accountLogin} ({i.name})
              </option>
            ))}
          </select>
          {installationsLoaded && installations.length === 0 && (
            <p className="mt-1 text-xs text-app-text-muted">{t("form.noGithubIntegrations")}</p>
          )}
          {(pickedMaintainers.length > 0 || pickedMembers.length > 0) && (
            <p className="mt-1 text-xs text-app-text-muted">{t("form.githubMembersHint")}</p>
          )}
        </label>
      )}

      {generalError && <div className="text-xs text-app-danger">{generalError}</div>}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-3 py-1 text-app-text-muted hover:bg-app-surface-hover"
          >
            {t("actions.cancel")}
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="rounded-md bg-app-primary px-3 py-1 text- disabled:opacity-50"
        >
          {busy ? t("actions.submitting") : t("actions.submit")}
        </button>
      </div>
    </div>
  );
}

function toSubmitError(err: unknown, fallback: string): SubmitError {
  if (err instanceof ApiError) {
    return {
      message: err.message,
      policyViolation: readPolicyViolationFromApiError(err),
    };
  }
  return {
    message: err instanceof Error ? err.message : fallback,
    policyViolation: null,
  };
}

interface UserChipProps {
  user: UserSummary;
  onRemove: () => void;
  disabled?: boolean;
}

function UserChip({ user, onRemove, disabled }: UserChipProps) {
  const { t } = useTranslation("teams");
  return (
    <li className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-xs text-app-text">
      <span>{user.displayName}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={t("members.removeAriaLabel", { name: user.displayName })}
        className="text-app-text-muted hover:text-app-danger disabled:opacity-50"
      >
        ×
      </button>
    </li>
  );
}

function readPolicyViolationFromApiError(err: ApiError): TeamPolicyViolation | null {
  // api-client surfaces only `error`, so match the validator's slug message shape.
  if (err.status === 422 && /slug must/i.test(err.message)) {
    return { policyKind: "name_pattern", field: "slug", message: err.message };
  }
  return null;
}
