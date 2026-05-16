import { useStarred } from "@internal/api-client/react";

interface Props {
  entityId: string;
  entityName: string;
}

export function StarCell({ entityId, entityName }: Props) {
  const { isStarred, toggle } = useStarred();
  const starred = isStarred(entityId);
  return (
    <button
      type="button"
      onClick={() => toggle(entityId)}
      aria-label={starred ? `Unstar ${entityName}` : `Star ${entityName}`}
      aria-pressed={starred}
      className={
        starred
          ? "text-yellow-500 hover:text-yellow-600 transition-colors"
          : "text-app-text-muted hover:text-yellow-500 transition-colors"
      }
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={starred ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
