import type { ID, ISODateString, NamedEntity } from "./common";

/** Minimal Team identity used wherever a team appears as a foreign reference (catalog */
export interface Team extends NamedEntity {
  slug: string;
}

export type TeamMemberRole = "lead" | "member";

/** A single membership row, joining a User to a Team via a role. */
export interface TeamMembership {
  teamId: ID;
  userId: ID;
  role: TeamMemberRole;
  joinedAt: ISODateString;
  /** The user's identity, embedded for list rendering. */
  displayName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface TeamSummary {
  id: ID;
  slug: string;
  name: string;
  description?: string | null;
  /** GitHub org login the team belongs to. */
  accountLogin: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  memberCount: number;
  /** All leads (co-maintainers). */
  leads: { userId: ID; displayName: string; avatarUrl?: string | null }[];
}

export interface TeamDetail extends TeamSummary {
  members: TeamMembership[];
}

export type TeamRequestStatus =
  | "pending"
  | "awaiting_user_confirmation"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

/** Snapshot of the original submission, kept for rendering "what changed during negotiation" */
export interface TeamRequestOriginal {
  slug: string;
  name: string;
  description: string | null;
  mirrorToGithub: boolean;
  githubIntegrationId: ID | null;
}

export interface TeamRequestDto {
  id: ID;
  slug: string;
  name: string;
  description?: string | null;
  status: TeamRequestStatus;
  /** True if approval should also create a team in the linked GitHub org. */
  mirrorToGithub: boolean;
  githubIntegrationId: ID | null;
  /** Public org login surfaced from the integration's config (display only). */
  githubOrgLogin: string | null;
  /** Number of submit/propose/counter-propose edits so far (cap = 3). */
  roundCount: number;
  lastEditedByUserId: ID | null;
  /** "round_limit" when auto-cancelled by the negotiation cap. null otherwise. */
  autoCancelReason: string | null;
  original: TeamRequestOriginal;
  rejectionReason?: string | null;
  createdTeamId?: ID | null;
  createdTeamSlug?: string | null;
  /** Optionally pre-staged at submit time. */
  proposedMaintainers: Array<{ userId: ID; displayName: string; avatarUrl?: string | null }>;
  proposedMembers: Array<{ userId: ID; displayName: string; avatarUrl?: string | null }>;
  /** Populated only on the approval response when the team was mirrored to GitHub and one or */
  partialFailures?: Array<{ userId: ID; displayName: string; reason: string }>;
  expiresAt: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  reviewedAt?: ISODateString | null;
  requestedBy: { userId: ID; displayName: string; avatarUrl?: string | null };
  reviewedBy?: { userId: ID; displayName: string; avatarUrl?: string | null } | null;
}

export type MaintainerRequestStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

/** Self-service request from an existing team member to be promoted to `lead` (co-maintainer). */
export interface MaintainerRequestDto {
  id: ID;
  teamId: ID;
  teamSlug: string;
  teamName: string;
  status: MaintainerRequestStatus;
  reason: string | null;
  rejectionReason: string | null;
  expiresAt: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  reviewedAt: ISODateString | null;
  requestedBy: { userId: ID; displayName: string; avatarUrl?: string | null };
  reviewedBy: { userId: ID; displayName: string; avatarUrl?: string | null } | null;
}

export type TeamPolicyKind = "name_pattern";

/** Policy violation returned from POST /api/teams/requests when a request fails a hard rule. */
export interface TeamPolicyViolation {
  policyKind: TeamPolicyKind;
  field: "slug" | "name";
  message: string;
}

export interface TeamPolicyDto {
  kind: TeamPolicyKind;
  enabled: boolean;
  config: Record<string, unknown>;
  defaultConfig: Record<string, unknown>;
  description: string | null;
  /** Human label for the kind, sourced from the registry. */
  label: string;
}
