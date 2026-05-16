import type { WidgetConfigEditorProps } from "@internal/shared-ui";

export function MarkdownConfigEditor({ config, onChange }: WidgetConfigEditorProps) {
  const body = typeof config.body === "string" ? config.body : "";
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-app-text-muted" htmlFor="markdown-body">
        Markdown body
      </label>
      <textarea
        id="markdown-body"
        value={body}
        onChange={(e) => onChange({ ...config, body: e.target.value })}
        rows={12}
        placeholder={"# Heading\n\nPlain text, **bold**, lists, tables..."}
        className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2 text-sm font-mono text-app-text focus:border-app-primary focus:outline-none"
      />
      <p className="text-xs text-app-text-muted">
        Supports GitHub-flavored markdown: tables, task lists, strikethrough.
      </p>
    </div>
  );
}
