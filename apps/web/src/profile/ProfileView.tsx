import { useAuth, useCurrentUser } from "../auth";
import { ProfileAvatar } from "./ProfileAvatar";

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  member: "Member",
  viewer: "Viewer",
};

export function ProfileView() {
  const user = useCurrentUser();
  const { signOut } = useAuth();

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <ProfileAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="lg" />
        <div className="min-w-0">
          <div className="font-medium text-app-text truncate">{user.displayName}</div>
          <div className="text-sm text-app-text-muted truncate">{user.email}</div>
          <div className="text-xs text-app-text-muted truncate">
            @{user.githubLogin} · {roleLabels[user.role] ?? user.role}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Field label="Display name" value={user.displayName} />
        <Field label="Email" value={user.email} />
        <Field label="GitHub" value={`@${user.githubLogin}`} />
        <Field label="Role" value={roleLabels[user.role] ?? user.role} />
        <Field
          label="Last login"
          value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}
        />
        <Field label="Status" value={user.status} />
      </dl>

      <p className="text-xs text-app-text-muted mb-6">
        Your name, email, and avatar are sourced from GitHub. To change them, update your GitHub
        profile. Role changes are handled by an administrator.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-app-text-muted hover:text-app-danger transition-colors"
        >
          Sign out
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
