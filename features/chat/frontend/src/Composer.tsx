// Message input box: auto-growing textarea with a Send button that toggles to Stop while streaming.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@internal/i18n";

interface Props {
  onSend: (text: string) => void;
  onStop?: () => void;
  streaming: boolean;
  stopDisabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, onStop, streaming, stopDisabled, placeholder }: Props) {
  const { t } = useTranslation("chat");
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <div className="border-t border-app-border bg-app-surface p-2 sm:p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder ?? t("composer.placeholder")}
          rows={1}
          disabled={streaming}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          // text-base on mobile prevents iOS Safari's zoom-on-focus; text-sm at sm+ keeps desktop unchanged.
          className="flex-1 resize-none rounded-app-md border border-app-border bg-app-bg-sunken px-3 py-2 text-base text-app-text placeholder:text-app-text-subtle focus:outline-none focus:ring-2 focus:ring-app-primary disabled:opacity-60 sm:text-sm [&::-webkit-scrollbar]:hidden"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            disabled={stopDisabled}
            title={stopDisabled ? t("composer.stopDisabledTooltip") : t("composer.stop")}
            className="h-10 shrink-0 rounded-app-md border border-app-border bg-app-surface px-3 text-sm text-app-text hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:px-4"
          >
            {t("composer.stop")}
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="h-10 shrink-0 rounded-app-md bg-app-primary px-3 text-sm font-medium text-app-primary-foreground hover:bg-app-primary-hover disabled:opacity-50 sm:h-9 sm:px-4"
          >
            {t("composer.send")}
          </button>
        )}
      </div>
    </div>
  );
}
