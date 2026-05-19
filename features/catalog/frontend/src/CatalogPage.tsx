import { useCallback, useEffect, useState } from "react";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { CatalogTable } from "./catalog-table/CatalogTable";
import { Toolbar } from "./catalog-table/Toolbar";
import type { CatalogRow } from "./catalog-table/columns";
import { useCatalogView } from "./catalog-table/useCatalogView";
import { RegisterEntityDialog } from "./RegisterEntityDialog";

export function CatalogPage() {
  const api = useApi();
  const view = useCatalogView();
  const [rows, setRows] = useState<CatalogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filteredCount, setFilteredCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    api.catalog
      .list({ allOrgs: view.showAllOrgs })
      .then((res) => {
        if (cancelled) return;
        setRows(res.items as CatalogRow[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load catalog");
      });
    return () => {
      cancelled = true;
    };
  }, [api, view.showAllOrgs]);

  useEffect(() => load(), [load]);

  return (
    <PageLayout
      title="Catalog"
      description="Services, APIs, and infrastructure."
      actions={
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on hover:opacity-90"
        >
          Register existing
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {error}
        </div>
      )}

      {rows === null ? (
        <p className="text-sm text-app-text-muted">Loading…</p>
      ) : (
        <>
          <Toolbar view={view} total={rows.length} filtered={filteredCount} />
          {rows.length === 0 ? (
            <p className="text-sm text-app-text-muted">No catalog entities yet.</p>
          ) : (
            <CatalogTable data={rows} view={view} onFilteredCountChange={setFilteredCount} />
          )}
          {rows.length > 0 && filteredCount === 0 && (
            <p className="mt-3 text-sm text-app-text-muted">
              No entities match these filters.{" "}
              <button
                type="button"
                onClick={view.reset}
                className="text-app-primary-on hover:underline"
              >
                Reset filters
              </button>
            </p>
          )}
        </>
      )}

      <RegisterEntityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
      />
    </PageLayout>
  );
}
