import { GrafanaAlertsPanel } from "@feature/observability-frontend";

export function GrafanaAlertsWidget() {
  return <GrafanaAlertsPanel limit={10} />;
}
