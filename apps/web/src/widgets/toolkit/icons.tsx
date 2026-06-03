const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CubeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export function BoardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

export function BotIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <circle cx="9" cy="14" r="1" />
      <circle cx="15" cy="14" r="1" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" />
    </svg>
  );
}

export function PulseIcon() {
  return (
    <svg {...iconProps}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg {...iconProps}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function PlugIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 2v6" />
      <path d="M15 2v6" />
      <path d="M6 8h12v4a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8z" />
      <path d="M12 18v4" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  );
}

export function ScaffolderIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 2v20" />
      <path d="M5 7l14 0" />
      <path d="M5 17l14 0" />
      <path d="M5 7v10" />
      <path d="M19 7v10" />
    </svg>
  );
}

export function TeamsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21.5 18a4.5 4.5 0 0 0-7-3.7" />
    </svg>
  );
}

export function InboxIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 13l2.5-7h13L21 13" />
      <path d="M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6" />
      <path d="M3 13h5l1.5 2h5L16 13h5" />
    </svg>
  );
}

export function ObservabilityIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h6l2-4 2 8 2-4h6" />
    </svg>
  );
}

export function AdminIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function AccountIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 17v5" />
      <path d="M9 4h6l-1 6 3 3H7l3-3-1-6z" />
    </svg>
  );
}

export function PinOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 3l18 18" />
      <path d="M9 4h6l-1 6 3 3H7l3-3-1-6z" />
      <path d="M12 17v5" />
    </svg>
  );
}

export function SparklesIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M5.6 5.6l2.8 2.8" />
      <path d="M15.6 15.6l2.8 2.8" />
      <path d="M18.4 5.6l-2.8 2.8" />
      <path d="M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}
