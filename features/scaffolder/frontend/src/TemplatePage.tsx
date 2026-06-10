import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { IChangeEvent } from "@rjsf/core";
import type { RJSFSchema } from "@rjsf/utils";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { ScaffolderTemplateDetail } from "@internal/api-client";
import { TemplateDriftBadge } from "./TemplateDriftBadge";

export function TemplatePage() {
  const { templateId } = useParams<{ templateId: string }>();
  const api = useApi();
  const navigate = useNavigate();
  const { t } = useTranslation("scaffolder");
  const [template, setTemplate] = useState<ScaffolderTemplateDetail | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!templateId) return;
    api.scaffolder
      .getTemplate(templateId)
      .then(setTemplate)
      .catch((err) => setError(err.message ?? t("errors.loadTemplate")));
  }, [api, templateId, t]);

  async function handleSubmit(e: IChangeEvent<Record<string, unknown>>) {
    if (!template) return;
    setError(null);
    setSubmitting(true);
    try {
      const plan = await api.scaffolder.createPlan({
        templateId: template.id,
        params: e.formData ?? {},
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
  if (!template)
    return (
      <PageLayout title={t("page.createTitle")}>
        <p className="text-sm text-app-text-muted">{t("loading.generic")}</p>
      </PageLayout>
    );

  return (
    <PageLayout
      title={template.name}
      description={template.description}
      actions={<TemplateDriftBadge templateId={template.id} />}
    >
      <div className="max-w-2xl">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <Form
          schema={template.parametersJsonSchema as RJSFSchema}
          formData={formData}
          validator={validator}
          onChange={(e) => setFormData((e.formData ?? {}) as Record<string, unknown>)}
          onSubmit={handleSubmit}
          disabled={submitting}
        >
          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-app-primary px-4 py-2 text-sm font-medium text-app-primary-on disabled:opacity-50"
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
