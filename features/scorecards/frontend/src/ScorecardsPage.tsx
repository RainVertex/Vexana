import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { Scorecard } from "@internal/shared-types";

export function ScorecardsPage() {
  const { t } = useTranslation("scorecards");
  const api = useApi();
  const nav = useNavigate();
  const [items, setItems] = useState<Scorecard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.scorecards
      .list()
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : t("errors.loadFailed")));
  }, [api, t]);

  async function createBlank() {
    try {
      const slug = `new-scorecard-${Date.now()}`;
      const created = await api.scorecards.create({
        slug,
        name: t("page.newScorecardDefaultName"),
        appliesTo: [],
        tierStyle: "stage",
        enabled: true,
        rules: [],
      });
      nav(`/scorecards/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.createFailed"));
    }
  }

  return (
    <PageLayout
      title={t("page.title")}
      description={t("page.description")}
      actions={
        <button
          type="button"
          onClick={createBlank}
          className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text- hover:opacity-90"
        >
          {t("page.newScorecard")}
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {error}
        </div>
      )}
      {!items ? (
        <p className="text-sm text-app-text-muted">{t("page.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-app-text-muted">{t("page.noScorecards")}</p>
      ) : (
        <ul className="divide-y divide-app-border rounded-lg border border-app-border bg-app-surface">
          {items.map((s) => (
            <li key={s.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <Link
                  to={`/scorecards/${s.id}`}
                  className="text-sm font-medium text- hover:underline"
                >
                  {s.name}
                </Link>
                {s.description && (
                  <div className="text-xs text-app-text-muted">{s.description}</div>
                )}
                <div className="text-[11px] text-app-text-muted mt-1">
                  {t(`tierStyleLabel.${s.tierStyle}` as Parameters<typeof t>[0])} ·{" "}
                  {t("page.rulesCount", { count: s.rules?.length ?? 0 })} ·{" "}
                  {s.appliesTo.length === 0
                    ? t("page.allKinds")
                    : s.appliesTo
                        .map((k) => t(`entityKindLabel.${k}` as Parameters<typeof t>[0]))
                        .join(", ")}
                </div>
              </div>
              <span className="flex items-center gap-3">
                <Link to={`/scorecards/${s.id}/report`} className="text-xs text- hover:underline">
                  {t("page.report")}
                </Link>
                <span className="text-xs text-app-text-muted">
                  {s.enabled ? t("page.enabled") : t("page.disabled")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
