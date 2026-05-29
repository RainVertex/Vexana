import { PageTreeSidebar as PagesTreeImpl } from "@feature/pages-frontend";
import { useCurrentUser } from "../../auth";
import { useSidebar } from "./SidebarContext";
import { sectionHasTree } from "./sectionFromPath";
import { useRequestsSummary } from "./useRequestsSummary";

export function PageTreeSidebar() {
  const { activeSection } = useSidebar();
  const me = useCurrentUser();
  const summary = useRequestsSummary();
  if (!sectionHasTree(activeSection)) return null;
  return (
    <PagesTreeImpl
      key={activeSection}
      section={activeSection}
      currentUser={{ id: me.id, role: me.role }}
      requestsSummary={summary}
    />
  );
}
