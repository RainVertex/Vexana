import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { PlaneStateDto, PlaneWorkItemDetailDto } from "@internal/shared-types";

export function WorkItemDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const api = useApi();
  const [item, setItem] = useState<PlaneWorkItemDetailDto | null>(null);
  const [states, setStates] = useState<PlaneStateDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [updatingState, setUpdatingState] = useState(false);

  const load = useCallback(async () => {
    try {
      const fresh = await api.workspace.getWorkItem(id);
      setItem(fresh);
      const project = await api.workspace.getProject(fresh.projectId);
      setStates(project.states);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load work item");
    }
  }, [api, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await api.workspace.postComment(id, commentText.trim());
      setCommentText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  async function changeState(stateExternalId: string) {
    setUpdatingState(true);
    setError(null);
    try {
      await api.workspace.updateWorkItem(id, { stateExternalId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change state");
    } finally {
      setUpdatingState(false);
    }
  }

  return (
    <PageLayout
      title={
        item ? `${item.project?.identifier ?? ""}-${item.sequenceId} · ${item.name}` : "Work item"
      }
      actions={
        item?.project ? (
          <Link
            to={`/workspace/projects/${item.projectId}`}
            className="rounded-md border border-app-border px-3 py-1 text-sm text-app-text hover:bg-app-surface-hover"
          >
            Back to {item.project.name}
          </Link>
        ) : null
      }
    >
      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}
      {!error && !item && <p className="text-sm text-app-text-muted">Loading…</p>}
      {item && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
          <div className="space-y-4">
            <section>
              <h3 className="mb-1 text-xs uppercase tracking-wide text-app-text-muted">
                Description
              </h3>
              {item.description ? (
                <pre className="whitespace-pre-wrap rounded-md border border-app-border bg-app-surface p-3 text-sm text-app-text">
                  {item.description}
                </pre>
              ) : (
                <p className="text-sm text-app-text-muted">No description.</p>
              )}
            </section>

            {item.subItems.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wide text-app-text-muted">
                  Sub-issues ({item.subItems.length})
                </h3>
                <ul className="divide-y divide-app-border rounded-md border border-app-border">
                  {item.subItems.map((s) => (
                    <li key={s.id} className="p-2 text-sm">
                      <Link to={`/workspace/work-items/${s.id}`} className="hover:text-app-primary">
                        {s.name}
                      </Link>
                      <span className="ml-2 text-xs text-app-text-muted">
                        {s.state?.name ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs uppercase tracking-wide text-app-text-muted">
                Comments ({item.comments.length})
              </h3>
              {item.comments.length === 0 ? (
                <p className="text-sm text-app-text-muted">No comments.</p>
              ) : (
                <ul className="space-y-2">
                  {item.comments.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-md border border-app-border bg-app-surface p-3 text-sm"
                    >
                      <div className="flex items-baseline gap-2 text-xs text-app-text-muted">
                        {c.author ? (
                          <span className="font-medium text-app-text" title={c.author.email}>
                            {c.author.displayName}
                          </span>
                        ) : (
                          <span className="italic">Unknown author</span>
                        )}
                        <span>{new Date(c.externalCreatedAt).toLocaleString()}</span>
                      </div>
                      <pre className="mt-1 whitespace-pre-wrap text-app-text">{c.body}</pre>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={postComment} className="mt-3 space-y-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  className="w-full rounded-md border border-app-border bg-app-surface p-2 text-sm text-app-text"
                  disabled={posting}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={posting || !commentText.trim()}
                    className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on disabled:opacity-50"
                  >
                    {posting ? "Posting..." : "Post comment"}
                  </button>
                </div>
              </form>
            </section>
          </div>

          <aside className="space-y-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-app-text-muted">State</div>
              {states.length > 0 ? (
                <select
                  value={item.state?.externalId ?? ""}
                  onChange={(e) => void changeState(e.target.value)}
                  disabled={updatingState}
                  className="mt-1 w-full rounded-md border border-app-border bg-app-surface p-1 text-app-text disabled:opacity-50"
                >
                  {states.map((s) => (
                    <option key={s.id} value={s.externalId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-app-text">{item.state?.name ?? "—"}</div>
              )}
            </div>
            <Detail label="Priority" value={item.priority} />
            <Detail
              label="Start"
              value={item.startDate ? new Date(item.startDate).toLocaleDateString() : "—"}
            />
            <Detail
              label="Due"
              value={item.targetDate ? new Date(item.targetDate).toLocaleDateString() : "—"}
            />
            <Detail
              label="Completed"
              value={item.completedAt ? new Date(item.completedAt).toLocaleDateString() : "—"}
            />
            <Detail label="Assignees" value={`${item.assigneeIds.length} mapped`} />
          </aside>
        </div>
      )}
    </PageLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-app-text-muted">{label}</div>
      <div className="text-app-text">{value}</div>
    </div>
  );
}
