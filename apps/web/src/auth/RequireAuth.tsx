import type { PropsWithChildren } from "react";
import { useAuth } from "./AuthContext";
import { SignInPage } from "./SignInPage";

export function RequireAuth({ children }: PropsWithChildren) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="text-sm text-app-text-muted">Loading…</div>
      </div>
    );
  }

  if (status === "signed-out") {
    return <SignInPage />;
  }

  return <>{children}</>;
}
