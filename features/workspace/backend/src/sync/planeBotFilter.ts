// Plane workspace-seed bots (bot_user_<uuid>@plane.so) match by email since v1 API hides is_bot.

import type { PlaneApiMember } from "@internal/plane-client";

const PLANE_BOT_EMAIL_PATTERN = /^bot_user_[0-9a-f-]+@plane\.so$/i;

export function isPlaneBotEmail(email: string): boolean {
  return PLANE_BOT_EMAIL_PATTERN.test(email);
}

export function isPlaneBotMember(raw: PlaneApiMember): boolean {
  const email = raw.member?.email ?? raw.email;
  return typeof email === "string" && isPlaneBotEmail(email);
}
