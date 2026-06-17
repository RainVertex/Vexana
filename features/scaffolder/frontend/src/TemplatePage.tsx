import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { IChangeEvent } from "@rjsf/core";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { PageLayout } from "@internal/shared-ui";
import { useCatalogApi } from "@feature/catalog-frontend";
import { useIntegrationsApi } from "@feature/integrations-frontend";
import { useTeamsApi } from "@feature/teams-frontend";
import { useTranslation } from "@internal/i18n";
import type { CatalogEntityWithOwners } from "@feature/catalog-shared";
import type { TeamSummary } from "@feature/teams-shared";
import { useScaffolderApi, type ScaffolderTemplateDetail } from "./client";
import { TemplateDriftBadge } from "./TemplateDriftBadge";
import { themeTemplates, themeWidgets } from "./rjsfTheme";
import {
  orgLoginsFromInstallations,
  schemaUsesGithubOrgs,
  withGithubOrgEnum,
} from "./githubOrgField";
import {
  platformTeamsUiSchema,
  schemaUsesPlatformTeams,
  withPlatformTeamsOneOf,
} from "./platformTeamsField";

export function TemplatePage() {
  const { templateId } = useParams<{ templateId: string }>();
  const catalogApi = useCatalogApi();
  const scaffolderApi = useScaffolderApi();
  const integrations = useIntegrationsApi();
  const teamsApi = useTeamsApi();
  const navigate = useNavigate();
  const { t } = useTranslation("scaffolder");
  const [template, setTemplate] = useState<ScaffolderTemplateDetail | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null);
  const [uiSchema, setUiSchema] = useState<Record<string, unknown>>({});
  const [entities, setEntities] = useState<CatalogEntityWithOwners[] | null>(null);
  const [entityId, setEntityId] = useState<string>("");
  const [orgLogins, setOrgLogins] = useState<string[] | null>(null);
  const [teams, setTeams] = useState<TeamSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const needsOrgs = useMemo(() => schemaUsesGithubOrgs(schema), [schema]);
  const needsTeams = useMemo(() => schemaUsesPlatformTeams(schema), [schema]);
  const selectedOrg =
    typeof formData.org === "string" && formData.org.length > 0 ? formData.org : null;
  const effectiveSchema = useMemo(
    () =>
      withPlatformTeamsOneOf(withGithubOrgEnum(schema, orgLogins ?? []), teams ?? [], selectedOrg),
    [schema, orgLogins, teams, selectedOrg],
  );
  const effectiveUiSchema = useMemo(
    () => ({ ...uiSchema, ...platformTeamsUiSchema(schema) }),
    [uiSchema, schema],
  );

  useEffect(() => {
    if (!templateId) return;
    scaffolderApi
      .getTemplate(templateId)
      .then((tpl) => {
        setTemplate(tpl);
        setSchema(tpl.parametersJsonSchema);
        setUiSchema(tpl.uiSchema ?? {});
      })
      .catch((err) => setError(err.message ?? t("errors.loadTemplate")));
  }, [scaffolderApi, templateId, t]);

  const needsEntity = template !== null && template.operation !== "create";

  useEffect(() => {
    if (!needsEntity || entities !== null) return;
    catalogApi
      .list()
      .then((res) => setEntities(res.items.filter((i) => i.accessible)))
      .catch(() => setEntities([]));
  }, [catalogApi, needsEntity, entities]);

  useEffect(() => {
    if (!needsOrgs || orgLogins !== null) return;
    integrations
      .githubInstallations()
      .then((res) => setOrgLogins(orgLoginsFromInstallations(res.items)))
      .catch(() => setOrgLogins([]));
  }, [integrations, needsOrgs, orgLogins]);

  useEffect(() => {
    if (!needsTeams || teams !== null) return;
    teamsApi.teams
      .list()
      .then((res) => setTeams(res.items))
      .catch(() => setTeams([]));
  }, [teamsApi, needsTeams, teams]);

  // Drop owners that do not belong to the selected org so the submitted ids never span orgs.
  useEffect(() => {
    if (!needsTeams || teams === null) return;
    const current = Array.isArray(formData.owners) ? (formData.owners as string[]) : [];
    if (current.length === 0) return;
    const valid = new Set(teams.filter((tm) => tm.accountLogin === selectedOrg).map((tm) => tm.id));
    const filtered = current.filter((id) => valid.has(id));
    if (filtered.length !== current.length) {
      setFormData((prev) => ({ ...prev, owners: filtered }));
    }
  }, [needsTeams, teams, selectedOrg, formData.owners]);

  async function handleSubmit(e: IChangeEvent<Record<string, unknown>>) {
    if (!template) return;
    setError(null);
    setSubmitting(true);
    try {
      const plan = await scaffolderApi.createPlan({
        templateId: template.id,
        params: e.formData ?? {},
        ...(entityId ? { catalogEntityId: entityId } : {}),
      });
      navigate(`/scaffolder/plans/${plan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.createPlan"));
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !template)
    return (
      <PageLayout title={t("page.createTitle")}>
        <p className="text-sm text-red-600">{error}</p>
      </PageLayout>
    );
  if (!template || !schema || (needsOrgs && orgLogins === null) || (needsTeams && teams === null))
    return (
      <PageLayout title={t("page.createTitle")}>
        <p className="text-sm text-app-text-muted">{t("loading.generic")}</p>
      </PageLayout>
    );

  const planBlocked = needsEntity && !entityId;

  return (
    <PageLayout
      title={template.name}
      description={template.description}
      actions={<TemplateDriftBadge templateId={template.id} />}
    >
      <div className="max-w-2xl">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {needsEntity && (
          <div className="mb-4">
            <label htmlFor="scaffolder-entity" className="mb-1 block text-xs text-app-text-muted">
              {t("form.entityLabel")}
            </label>
            <select
              id="scaffolder-entity"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm"
            >
              <option value="">{t("form.entityPlaceholder")}</option>
              {(entities ?? []).map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name} ({entity.kind})
                </option>
              ))}
            </select>
          </div>
        )}
        <Form
          schema={effectiveSchema as RJSFSchema}
          uiSchema={effectiveUiSchema as UiSchema}
          formData={formData}
          validator={validator}
          templates={themeTemplates}
          widgets={themeWidgets}
          onChange={(e) => setFormData((e.formData ?? {}) as Record<string, unknown>)}
          onSubmit={handleSubmit}
          disabled={submitting}
        >
          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || planBlocked}
              className="rounded-md bg-app-primary px-4 py-2 text-sm font-medium text-app-primary-foreground disabled:opacity-50"
            >
              {submitting ? t("form.planningLabel") : t("form.plan")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/scaffolder")}
              className="rounded-md border border-app-border px-4 py-2 text-sm text-app-text-muted hover:bg-app-surface-hover"
            >
              {t("form.cancel")}
            </button>
          </div>
        </Form>
      </div>
    </PageLayout>
  );
}
