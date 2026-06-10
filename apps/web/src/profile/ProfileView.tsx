import { useTranslation } from "@internal/i18n";
import { useAuth, useCurrentUser } from "../auth";
import { ProfileAvatar } from "./ProfileAvatar";

const ROLE_KEYS: Record<string, string> = {
  admin: "profile.roleAdmin",
  member: "profile.roleMember",
  viewer: "profile.roleViewer",
};

export function ProfileView() {
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const roleLabel = ROLE_KEYS[user.role] ? t(ROLE_KEYS[user.role]) : user.role;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <ProfileAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="lg" />
        <div className="min-w-0">
          <div className="font-medium text-app-text truncate">{user.displayName}</div>
          <div className="text-sm text-app-text-muted truncate">{user.email}</div>
          <div className="text-xs text-app-text-muted truncate">
            @{user.githubLogin} · {roleLabel}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Field label={t("profile.fieldDisplayName")} value={user.displayName} />
        <Field label={t("profile.fieldEmail")} value={user.email} />
        <Field label={t("profile.fieldGithub")} value={`@${user.githubLogin}`} />
        <Field label={t("profile.fieldRole")} value={roleLabel} />
        <Field
          label={t("profile.fieldLastLogin")}
          value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}
        />
        <Field label={t("profile.fieldStatus")} value={user.status} />
      </dl>

      <p className="text-xs text-app-text-muted mb-6">{t("profile.sourcedNote")}</p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-app-text-muted hover:text-app-danger transition-colors"
        >
          {t("profile.signOut")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-app-text-muted uppercase tracking-wide mb-1">
        {label}
      </dt>
      <dd className="text-sm text-app-text break-words">{value}</dd>
    </div>
  );
}
