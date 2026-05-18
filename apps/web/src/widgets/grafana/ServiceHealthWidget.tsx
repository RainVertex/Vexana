import { ServiceHealthPanel } from "@feature/observability-frontend";

export function ServiceHealthWidget() {
  return <ServiceHealthPanel limit={20} />;
}
