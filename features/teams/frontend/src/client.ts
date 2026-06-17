import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type {
  MaintainerRequestDto,
  TeamDetail,
  TeamMemberRole,
  TeamPolicyDto,
  TeamPolicyKind,
  TeamRequestDto,
  TeamRequestStatus,
  TeamSummary,
} from "@feature/teams-shared";

export function createTeamsClient(core: ApiCore) {
  return {
    teams: {
      list: (opts: { includeDeleted?: boolean; allOrgs?: boolean } = {}) => {
        const params = new URLSearchParams();
        if (opts.includeDeleted) params.set("includeDeleted", "true");
        if (opts.allOrgs) params.set("allOrgs", "1");
        const qs = params.toString();
        return core.request<ListResponse<TeamSummary>>(`/api/teams${qs ? `?${qs}` : ""}`);
      },
      get: (slug: string) => core.request<TeamDetail>(`/api/teams/${encodeURIComponent(slug)}`),
      create: (body: {
        slug: string;
        name: string;
        description?: string;
        leadUserId?: string;
        accountLogin: string;
      }) => core.request<TeamDetail>(`/api/teams`, { method: "POST", body: JSON.stringify(body) }),
      update: (slug: string, body: { slug?: string; name?: string; description?: string | null }) =>
        core.request<TeamDetail>(`/api/teams/${encodeURIComponent(slug)}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      delete: (slug: string) =>
        core.request<void>(`/api/teams/${encodeURIComponent(slug)}`, { method: "DELETE" }),
      restore: (slug: string) =>
        core.request<TeamDetail>(`/api/teams/${encodeURIComponent(slug)}/restore`, {
          method: "POST",
        }),
      transferOwnership: (slug: string, targetTeamSlug: string) =>
        core.request<{
          from: { teamId: string; slug: string };
          to: { teamId: string; slug: string };
          entityCount: number;
        }>(`/api/teams/${encodeURIComponent(slug)}/transfer-ownership`, {
          method: "POST",
          body: JSON.stringify({ targetTeamSlug }),
        }),
      addMember: (slug: string, body: { userId: string; role?: TeamMemberRole }) =>
        core.request<TeamDetail>(`/api/teams/${encodeURIComponent(slug)}/members`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      setMemberRole: (slug: string, userId: string, role: TeamMemberRole) =>
        core.request<TeamDetail>(
          `/api/teams/${encodeURIComponent(slug)}/members/${encodeURIComponent(userId)}`,
          { method: "PATCH", body: JSON.stringify({ role }) },
        ),
      removeMember: (slug: string, userId: string) =>
        core.request<void>(
          `/api/teams/${encodeURIComponent(slug)}/members/${encodeURIComponent(userId)}`,
          { method: "DELETE" },
        ),
    },

    teamRequests: {
      list: (opts: { status?: TeamRequestStatus } = {}) => {
        const qs = opts.status ? `?status=${encodeURIComponent(opts.status)}` : "";
        return core.request<ListResponse<TeamRequestDto>>(`/api/teams/requests${qs}`);
      },
      get: (id: string) =>
        core.request<TeamRequestDto>(`/api/teams/requests/${encodeURIComponent(id)}`),
      submit: (body: {
        slug: string;
        name: string;
        description?: string;
        mirrorToGithub: boolean;
        githubIntegrationId?: string;
        proposedMaintainerUserIds?: string[];
        proposedMemberUserIds?: string[];
      }) =>
        core.request<TeamRequestDto>(`/api/teams/requests`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      // Admin-side proposal, bumps round, transitions to awaiting_user_confirmation.
      propose: (
        id: string,
        body: {
          slug?: string;
          name?: string;
          description?: string | null;
          mirrorToGithub?: boolean;
          githubIntegrationId?: string | null;
        },
      ) =>
        core.request<TeamRequestDto>(`/api/teams/requests/${encodeURIComponent(id)}/propose`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      // Requester-side response: confirm runs the approval, counter bumps the round.
      respond: (
        id: string,
        body:
          | { action: "confirm" }
          | {
              action: "counter";
              slug?: string;
              name?: string;
              description?: string | null;
              mirrorToGithub?: boolean;
              githubIntegrationId?: string | null;
            },
      ) =>
        core.request<TeamRequestDto>(`/api/teams/requests/${encodeURIComponent(id)}/respond`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      approve: (id: string) =>
        core.request<TeamRequestDto>(`/api/teams/requests/${encodeURIComponent(id)}/approve`, {
          method: "POST",
        }),
      reject: (id: string, reason: string) =>
        core.request<TeamRequestDto>(`/api/teams/requests/${encodeURIComponent(id)}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        }),
      cancel: (id: string) =>
        core.request<TeamRequestDto>(`/api/teams/requests/${encodeURIComponent(id)}/cancel`, {
          method: "POST",
        }),
      forMeAsApprover: () =>
        core.request<ListResponse<TeamRequestDto>>(`/api/teams/requests/for-me-as-approver`),
    },

    maintainerRequests: {
      list: () =>
        core.request<ListResponse<MaintainerRequestDto>>(`/api/teams/maintainer-requests`),
      pendingForMe: () =>
        core.request<ListResponse<MaintainerRequestDto>>(
          `/api/teams/maintainer-requests/pending-for-me`,
        ),
      forMeAsApprover: () =>
        core.request<ListResponse<MaintainerRequestDto>>(
          `/api/teams/maintainer-requests/for-me-as-approver`,
        ),
      get: (id: string) =>
        core.request<MaintainerRequestDto>(
          `/api/teams/maintainer-requests/${encodeURIComponent(id)}`,
        ),
      submit: (body: { teamSlug: string; reason?: string }) =>
        core.request<MaintainerRequestDto>(`/api/teams/maintainer-requests`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      approve: (id: string) =>
        core.request<MaintainerRequestDto>(
          `/api/teams/maintainer-requests/${encodeURIComponent(id)}/approve`,
          { method: "POST" },
        ),
      reject: (id: string, reason: string) =>
        core.request<MaintainerRequestDto>(
          `/api/teams/maintainer-requests/${encodeURIComponent(id)}/reject`,
          { method: "POST", body: JSON.stringify({ reason }) },
        ),
      cancel: (id: string) =>
        core.request<MaintainerRequestDto>(
          `/api/teams/maintainer-requests/${encodeURIComponent(id)}/cancel`,
          { method: "POST" },
        ),
    },

    teamPolicies: {
      list: () => core.request<ListResponse<TeamPolicyDto>>(`/api/teams/policies`),
      update: (
        kind: TeamPolicyKind,
        body: {
          enabled?: boolean;
          config?: Record<string, unknown>;
          description?: string | null;
        },
      ) =>
        core.request<TeamPolicyDto>(`/api/teams/policies/${encodeURIComponent(kind)}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
    },
  };
}

export function useTeamsApi() {
  const core = useApiCore();
  return useMemo(() => createTeamsClient(core), [core]);
}
