import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { WidgetComponentProps } from "@internal/shared-ui";

export function MarkdownWidget({ config }: WidgetComponentProps) {
  const body = typeof config?.body === "string" ? config.body : "";
  if (!body) {
    return (
      <div className="text-sm text-app-text-muted">
        No content yet. Click the gear icon in edit mode to add markdown.
      </div>
    );
  }
  return (
    <div className="prose prose-sm max-w-none text-app-text">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
