import { getInitials } from "./ProfileAvatar";

interface AgentAvatarProps {
  name: string;
  avatarUrl?: string | null;
  // Rendered size in pixels; the SVG scales continuously from 16 to 128.
  size?: number;
  className?: string;
}

export function AgentAvatar({ name, avatarUrl, size = 40, className }: AgentAvatarProps) {
  const dims = { width: size, height: size };
  if (avatarUrl) {
    // The agent SVG carries its own colored circle, so only clip, never add a background.
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={dims}
        className={`shrink-0 rounded-full object-cover ${className ?? ""}`}
      />
    );
  }
  return (
    <span
      style={{ ...dims, fontSize: Math.round(size * 0.4) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-app-primary font-semibold text-white ${className ?? ""}`}
    >
      {getInitials(name)}
    </span>
  );
}
