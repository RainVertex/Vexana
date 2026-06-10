import type { PropsWithChildren } from "react";
import { useTranslation } from "@internal/i18n";
import { useAuth } from "./AuthContext";
import { SignInPage } from "./SignInPage";

export function RequireAuth({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const { t } = useTranslation();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="text-sm text-app-text-muted">{t("common.loading")}</div>
      </div>
    );
  }

  if (status === "signed-out") {
    return <SignInPage />;
  }

  return <>{children}</>;
}
