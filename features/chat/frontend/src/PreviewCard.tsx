import type { ChatPreviewEvent } from "@internal/shared-types";

// Renders the structured `preview` SSE event from a *_prepare tool. The card
// is the contract — content here always reflects the server-authored
// serverSummary + parsedParams + policyChecks, never the assistant's prose
// summary or a re-parse of the tool's raw output.

interface Props {
  preview: ChatPreviewEvent;
  onConfirm: () => void;
  onCancel: () => void;
  /** Disabled once the user has confirmed and a *_submit chip is in flight, or after the */
  disabled?: boolean;
}

export function PreviewCard({ preview, onConfirm, onCancel, disabled }: Props) {
  const allPassed = preview.policyChecks.every((c) => c.passed);
  return (
    <div className="my-2 rounded-app-lg border border-app-border bg-app-surface p-4 shadow-app-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-app-sm bg-app-bg-sunken px-2 py-0.5 text-xs font-mono text-app-text-muted">
          {preview.shortHandle}
        </span>
        <span className="text-xs uppercase tracking-wide text-app-text-muted">
          Preview · {preview.toolId.replace(/_prepare$/, "")}
        </span>
      </div>
      <p className="mb-3 text-sm text-app-text">{preview.serverSummary}</p>

      {Object.keys(preview.parsedParams).length > 0 && (
        <dl className="mb-3 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
          {Object.entries(preview.parsedParams).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-mono text-app-text-muted">{k}</dt>
              <dd className="break-all text-app-text">{formatValue(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      {preview.sideEffects.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-xs uppercase tracking-wide text-app-text-muted">
            Side effects
          </div>
          <ul className="ml-4 list-disc space-y-0.5 text-xs text-app-text">
            {preview.sideEffects.map((se, i) => (
              <li key={i}>{se}</li>
            ))}
          </ul>
        </div>
      )}

      {preview.policyChecks.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-xs uppercase tracking-wide text-app-text-muted">
            Policy checks
          </div>
          <ul className="space-y-0.5 text-xs">
            {preview.policyChecks.map((c, i) => (
              <li
                key={i}
                className={c.passed ? "text-app-success-foreground" : "text-app-danger-foreground"}
              >
                {c.passed ? "✓" : "✗"} {c.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="rounded-app-md border border-app-border bg-app-surface px-3 py-1.5 text-xs text-app-text hover:bg-app-surface-hover disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled || !allPassed}
          className="rounded-app-md bg-app-primary px-3 py-1.5 text-xs font-medium text-app-primary-foreground hover:bg-app-primary-hover disabled:opacity-50"
          title={allPassed ? "Confirm submission" : "Fix policy violations first"}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}
