import type { PropsWithChildren, ReactNode } from "react";

interface PageLayoutProps extends PropsWithChildren {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageLayout({ title, description, actions, children }: PageLayoutProps) {
  return (
    <main className="p-6">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">{title}</h1>
          {description && <p className="mt-1 text-sm text-app-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </header>
      <div>{children}</div>
    </main>
  );
}
