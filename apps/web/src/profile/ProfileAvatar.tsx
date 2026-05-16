import { getInitials } from "./types";

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function ProfileAvatar({ name, avatarUrl, size = "md" }: ProfileAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`rounded-full object-cover ${sizeClasses[size]}`}
      />
    );
  }
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-app-primary text-white font-semibold ${sizeClasses[size]}`}
    >
      {getInitials(name)}
    </span>
  );
}
