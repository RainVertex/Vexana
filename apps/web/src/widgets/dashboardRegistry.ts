import type { WidgetDefinition, WidgetRegistry } from "@internal/shared-ui";
import { MarkdownWidget } from "./markdown/MarkdownWidget";
import { MarkdownConfigEditor } from "./markdown/MarkdownConfigEditor";
import { IframeWidget } from "./iframe/IframeWidget";
import { IframeConfigEditor } from "./iframe/IframeConfigEditor";

export type DashboardWidgetId = "markdown" | "iframe";

export const DASHBOARD_WIDGETS: WidgetRegistry<DashboardWidgetId> = {
  markdown: {
    id: "markdown",
    title: "Markdown",
    description: "Rich text block. Supports GitHub-flavored markdown.",
    component: MarkdownWidget,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 2, h: 2 },
    defaultConfig: { body: "" },
    configEditor: MarkdownConfigEditor,
  },
  iframe: {
    id: "iframe",
    title: "Embed",
    description: "Embed an external https:// page (Grafana, dashboards, docs).",
    component: IframeWidget,
    defaultSize: { w: 6, h: 6 },
    minSize: { w: 3, h: 3 },
    defaultConfig: { url: "" },
    configEditor: IframeConfigEditor,
  },
};

export const DASHBOARD_WIDGET_LIST: WidgetDefinition<DashboardWidgetId>[] =
  Object.values(DASHBOARD_WIDGETS);
