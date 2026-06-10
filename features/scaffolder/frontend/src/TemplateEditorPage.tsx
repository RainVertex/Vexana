import { useEffect, useRef, useState } from "react";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type {
  CurrentUser,
  ScaffolderTemplateDefPreview,
  ScaffolderTemplateDefRow,
} from "@internal/shared-types";

const PREVIEW_DEBOUNCE_MS = 400;

const STARTER_DEFINITION = {
  identifier: "my-template",
  title: "My template",
  description: "Describe what this template provisions.",
  version: "1.0.0",
  operation: "CREATE",
  audience: ["human"],
  requiredRole: "member",
  requiredApproval: false,
  tags: ["service"],
  userInputs: {
    properties: {
      name: { type: "string", title: "Name" },
      team: {
        type: "string",
        title: "Owner team",
        enum: { jqQuery: "[.user.teams[].slug]" },
      },
    },
    required: ["name"],
  },
  steps: [
    {
      id: "log",
      action: "debug:log",
      input: { message: "Scaffolding {{ .inputs.name }} for {{ .inputs.team }}" },
    },
  ],
  capabilities: [],
};

export function TemplateEditorPage() {
  const api = useApi();
  const { t } = useTranslation("scaffolder");
  const [me, setMe] = useState<CurrentUser | null | undefined>(undefined);
  const [defs, setDefs] = useState<ScaffolderTemplateDefRow[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [source, setSource] = useState<string>(JSON.stringify(STARTER_DEFINITION, null, 2));
  const [enabled, setEnabled] = useState(true);
  const [preview, setPreview] = useState<ScaffolderTemplateDefPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [playgroundData, setPlaygroundData] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewSeq = useRef(0);

  const isAdmin = me?.role === "admin";

  useEffect(() => {
    api.auth
      .me()
      .then(setMe)
      .catch(() => setMe(null));
  }, [api]);

  useEffect(() => {
    if (!isAdmin || defs !== null) return;
    api.scaffolder
      .listTemplateDefs()
      .then((res) => setDefs(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [api, isAdmin, defs]);

  // Live validation plus jqQuery form resolution against the draft definition.
  useEffect(() => {
    if (!isAdmin) return;
    const seq = ++previewSeq.current;
    let definition: Record<string, unknown>;
    try {
      definition = JSON.parse(source) as Record<string, unknown>;
      setParseError(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
      return;
    }
    const handle = setTimeout(() => {
      api.scaffolder
        .previewTemplateDef({ definition, formData: playgroundData })
        .then((result) => {
          if (previewSeq.current !== seq) return;
          setPreview(result);
          setPreviewError(null);
        })
        .catch((err) => {
          if (previewSeq.current !== seq) return;
          setPreviewError(err instanceof Error ? err.message : String(err));
        });
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [api, isAdmin, source, playgroundData]);

  function selectDef(row: ScaffolderTemplateDefRow) {
    setSelectedId(row.id);
    setSource(JSON.stringify(row.definition, null, 2));
    setEnabled(row.enabled);
    setPlaygroundData({});
    setNotice(null);
    setError(null);
  }

  function newDraft() {
    setSelectedId(null);
    setSource(JSON.stringify(STARTER_DEFINITION, null, 2));
    setEnabled(true);
    setPlaygroundData({});
    setNotice(null);
    setError(null);
  }

  async function save() {
    if (parseError) return;
    const definition = JSON.parse(source) as Record<string, unknown>;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const row = selectedId
        ? await api.scaffolder.updateTemplateDef(selectedId, { definition, enabled })
        : await api.scaffolder.createTemplateDef({ definition });
      const refreshed = await api.scaffolder.listTemplateDefs();
      setDefs(refreshed.items);
      setSelectedId(row.id);
      setEnabled(row.enabled);
      setNotice(t("editor.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("editor.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selectedId) return;
    if (!window.confirm(t("editor.confirmDelete"))) return;
    setBusy(true);
    setError(null);
    try {
      await api.scaffolder.deleteTemplateDef(selectedId);
      const refreshed = await api.scaffolder.listTemplateDefs();
      setDefs(refreshed.items);
      newDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("editor.deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (me === undefined)
    return (
      <PageLayout title={t("editor.title")}>
        <p className="text-sm text-app-text-muted">{t("loading.generic")}</p>
      </PageLayout>
    );

  if (!isAdmin)
    return (
      <PageLayout title={t("editor.title")}>
        <p className="text-sm text-app-text-muted">{t("editor.adminOnly")}</p>
      </PageLayout>
    );

  return (
    <PageLayout
      title={t("editor.title")}
      description={t("editor.description")}
      actions={
        <>
          <button
            type="button"
            onClick={newDraft}
            className="rounded-md border border-app-border px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover"
          >
            {t("editor.newTemplate")}
          </button>
          {selectedId && (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              {t("editor.delete")}
            </button>
          )}
          <button
            type="button"
            disabled={busy || parseError !== null}
            onClick={save}
            className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on disabled:opacity-50"
          >
            {busy ? t("editor.saving") : t("editor.save")}
          </button>
        </>
      }
    >
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-3 text-sm text-emerald-700">{notice}</p>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <aside className="xl:col-span-3">
          <h2 className="mb-2 text-xs font-semibold uppercase text-app-text-muted">
            {t("editor.listTitle")}
          </h2>
          {defs === null && <p className="text-xs text-app-text-muted">{t("loading.generic")}</p>}
          {defs !== null && defs.length === 0 && (
            <p className="text-xs text-app-text-muted">{t("editor.emptyList")}</p>
          )}
          <ul className="space-y-1">
            {(defs ?? []).map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => selectDef(row)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    row.id === selectedId
                      ? "border-app-primary bg-app-primary-soft"
                      : "border-app-border bg-app-surface hover:bg-app-surface-hover"
                  }`}
                >
                  <span className="font-mono text-xs">{row.identifier}</span>
                  {!row.enabled && (
                    <span className="ml-2 rounded bg-app-surface-hover px-1.5 py-0.5 text-[10px] text-app-text-muted">
                      {t("editor.disabledBadge")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="xl:col-span-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase text-app-text-muted">
              {t("editor.definitionLabel")}
            </h2>
            {selectedId && (
              <label className="flex items-center gap-1.5 text-xs text-app-text-muted">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                {t("editor.enabledLabel")}
              </label>
            )}
          </div>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            className="h-[34rem] w-full rounded-md border border-app-border bg-app-surface p-3 font-mono text-xs leading-5"
          />
          {parseError && (
            <p className="mt-2 rounded bg-rose-50 p-2 text-xs text-rose-700">
              {t("editor.jsonInvalid", { message: parseError })}
            </p>
          )}
          {!parseError && previewError && (
            <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">{previewError}</p>
          )}
        </section>

        <section className="xl:col-span-4">
          <h2 className="mb-2 text-xs font-semibold uppercase text-app-text-muted">
            {t("editor.previewTitle")}
          </h2>
          {preview ? (
            <div className="rounded-md border border-app-border bg-app-surface p-4">
              <div className="mb-3 flex items-center gap-2 text-xs text-app-text-muted">
                <span className="font-mono">{preview.identifier}</span>
                <span className="rounded bg-app-surface-hover px-1.5 py-0.5 text-[10px]">
                  {preview.operation}
                </span>
              </div>
              <Form
                schema={preview.schema as RJSFSchema}
                uiSchema={preview.uiSchema as UiSchema}
                formData={playgroundData}
                validator={validator}
                onChange={(e) => setPlaygroundData((e.formData ?? {}) as Record<string, unknown>)}
              >
                <div className="hidden" />
              </Form>
              {preview.operation !== "CREATE" && (
                <p className="mt-2 text-[11px] text-app-text-muted">{t("editor.entityNote")}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-app-text-muted">{t("editor.previewEmpty")}</p>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
