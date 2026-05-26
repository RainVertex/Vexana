import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";

const PLANE_BASE_URL = "http://localhost:3000";

export function PlaneEmbedPage() {
  const [params] = useSearchParams();
  const deepLink = params.get("url");
  const isAllowed = deepLink !== null && deepLink.startsWith(PLANE_BASE_URL);
  const src = isAllowed ? deepLink : PLANE_BASE_URL;
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <PageLayout
      title="Plane"
      description="Self-hosted Plane workspace embedded directly. Sign in on the Plane side once; cookies persist for the session."
      actions={
        <>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-app-border px-3 py-1.5 text-sm text-app-text hover:bg-app-surface-hover"
          >
            Open in new tab
          </a>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on"
          >
            Reload
          </button>
        </>
      }
    >
      <div className="h-[calc(100vh-180px)] w-full overflow-hidden rounded-lg border border-app-border bg-app-surface">
        <iframe
          key={`${src}-${reloadKey}`}
          src={src}
          title="Plane"
          className="h-full w-full border-0"
        />
      </div>
    </PageLayout>
  );
}
