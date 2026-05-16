import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function SearchWidget() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = q.trim();
        if (!trimmed) return navigate("/search");
        navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      }}
      className="h-full flex items-center"
    >
      <div className="relative w-full">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the platform…"
          className="w-full rounded-lg border border-app-border bg-app-bg pl-10 pr-4 py-3 text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-transparent"
        />
      </div>
    </form>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
