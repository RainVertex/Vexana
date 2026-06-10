import type { ReactNode } from "react";
import { PageLayout } from "@internal/shared-ui";
import { LanguageSwitcher, useTranslation } from "@internal/i18n";
import { ProfileView } from "../profile";
import { ThemeSwitcher } from "../theme";

export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <PageLayout title={t("settings.title")} description={t("settings.description")}>
      <div className="grid gap-6 max-w-4xl lg:grid-cols-2">
        <Card title={t("settings.profileTitle")} description={t("settings.profileDescription")}>
          <ProfileView />
        </Card>
        <Card title={t("settings.languageTitle")} description={t("settings.languageDescription")}>
          <LanguageSwitcher variant="grid" />
        </Card>
        <Card
          title={t("settings.appearanceTitle")}
          description={t("settings.appearanceDescription")}
        >
          <ThemeSwitcher variant="grid" />
        </Card>
      </div>
    </PageLayout>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-app-text">{title}</h2>
        {description && <p className="mt-1 text-sm text-app-text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
