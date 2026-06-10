import { useState, type FormEvent } from "react";
import { useTranslation } from "@internal/i18n";
import type { CurrentUser, DocCommentRow } from "@internal/shared-types";

export interface CommentsPanelProps {
  comments: DocCommentRow[];
  loading: boolean;
  error: string | null;
  currentUser: CurrentUser | null;
  onPost: (body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function CommentsPanel({
  comments,
  loading,
  error,
  currentUser,
  onPost,
  onDelete,
}: CommentsPanelProps) {
  const { t } = useTranslation("devdocs");
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    setPostError(null);
    try {
      await onPost(body);
      setDraft("");
    } catch (err) {
      setPostError(err instanceof Error ? err.message : t("errors.failedPostComment"));
    } finally {
      setPosting(false);
    }
  }

  function canDelete(authorId: string | null | undefined): boolean {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    return authorId === currentUser.id;
  }

  return (
    <section className="mt-8 border-t border-app-border pt-6">
      <h2 className="text-sm font-semibold text-app-text mb-3">{t("comments.heading")}</h2>
      {error && <p className="text-xs text-app-danger mb-2">{error}</p>}
      {loading && <p className="text-xs text-app-text-muted">{t("comments.loading")}</p>}
      {!loading && comments.length === 0 && (
        <p className="text-xs text-app-text-muted">{t("comments.empty")}</p>
      )}
      <ul className="space-y-3 mb-4">
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded border border-app-border bg-app-surface px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-app-text">
                {c.author?.displayName ?? c.author?.githubLogin ?? t("comments.unknownAuthor")}
              </span>
              <span className="text-[11px] text-app-text-muted">{formatTime(c.createdAt)}</span>
            </div>
            <div className="whitespace-pre-wrap text-app-text">{c.body}</div>
            {canDelete(c.author?.id) && (
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="mt-1 text-[11px] text-app-text-muted hover:text-app-danger"
              >
                {t("comments.delete")}
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder={t("comments.placeholder")}
          className="w-full rounded border border-app-border bg-app-surface-hover px-2 py-1.5 text-sm"
        />
        {postError && <p className="text-xs text-app-danger">{postError}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={posting || !draft.trim()}
            className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on hover:opacity-90 disabled:opacity-50"
          >
            {posting ? t("comments.posting") : t("comments.post")}
          </button>
        </div>
      </form>
    </section>
  );
}
