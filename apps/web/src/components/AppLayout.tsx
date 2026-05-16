import type { PropsWithChildren } from "react";
import { Header } from "./Header";
import { Rail } from "./sidebar/Rail";
import { PageTreeSidebar } from "./sidebar/PageTreeSidebar";

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-app-bg text-app-text">
      <Header />
      <div className="relative flex flex-1 min-h-0">
        <Rail />
        <PageTreeSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
