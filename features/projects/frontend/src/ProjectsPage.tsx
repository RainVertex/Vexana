// Projects landing page: lists projects and hosts the create-project form.
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useTranslation } from "@internal/i18n";
import { useProjects, useCreateProject } from "./api";

export function ProjectsPage() {
  const { t } = useTranslation("projects");
  const { projects, loading, error, refetch } = useProjects();
  const { create: createProject, loading: creating, error: createError } = useCreateProject();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await createProject({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      setNewTitle("");
      setNewDescription("");
      setShowNewProject(false);
      refetch();
    } catch {
      // error rendered from createError
    }
  }

  function handleCancel() {
    setShowNewProject(false);
    setNewTitle("");
    setNewDescription("");
  }

  return (
    <PageLayout
      title={t("page.projectsTitle")}
      description={t("page.projectsDescription")}
      actions={
        <button
          type="button"
          onClick={() => setShowNewProject(true)}
          disabled={showNewProject}
          className="rounded-md border border-app-border bg-app-primary px-3 py-1.5 text-sm text-app-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {t("actions.newProject")}
        </button>
      }
    >
      {showNewProject && (
        <form
          onSubmit={handleCreate}
          className="mb-4 rounded-lg border border-app-border bg-app-surface p-4"
        >
          {createError && (
            <div className="mb-3 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
              {createError}
            </div>
          )}
          <label className="block text-xs font-medium text-app-text-muted">
            {t("form.titleLabel")}
          </label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            required
            maxLength={200}
            placeholder={t("form.titlePlaceholder")}
            className="mt-1 w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
          />
          <label className="mt-3 block text-xs font-medium text-app-text-muted">
            {t("form.descriptionLabel")}
          </label>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            maxLength={10000}
            placeholder={t("form.descriptionPlaceholderNew")}
            className="mt-1 w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="rounded-md border border-app-border bg-app-primary px-3 py-1.5 text-sm text-app-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {creating ? t("actions.creating") : t("actions.create")}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={creating}
              className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text hover:bg-app-surface-hover"
            >
              {t("actions.cancel")}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-app-text-muted">{t("loading.generic")}</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-app-text-muted">{t("empty.noProjects")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="rounded-lg border border-app-border bg-app-surface p-4 hover:bg-app-surface-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className="flex-1 text-sm font-medium text-app-text">{p.title}</h3>
                {p.isAutoProvisioned && (
                  <span
                    title={t("info.syncedBadgeTitle")}
                    className="rounded-full border border-app-border bg-app-surface px-1.5 py-0.5 text-[10px] text-app-text-muted"
                  >
                    {t("info.syncedBadge")}
                  </span>
                )}
              </div>
              {p.description && (
                <p className="mt-1 text-xs text-app-text-muted line-clamp-2">{p.description}</p>
              )}
              <div className="mt-3 text-[11px] text-app-text-muted">
                {p.taskCount !== undefined ? t("info.taskCount", { count: p.taskCount }) : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
