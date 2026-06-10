export const en = {
  page: {
    myRequestsTitle: "My Requests",
    myRequestsDescription:
      "Team-creation and maintainer requests you've submitted. Pending first, history below.",
    myApprovalsTitle: "My Approvals",
    myApprovalsDescription:
      "Requests waiting on your decision, and the ones you've acted on. Pending first.",
  },
  sections: {
    teamCreation: "Team creation requests",
    maintainer: "Maintainer requests",
  },
  chips: {
    team: "Team",
    maintainer: "Maintainer",
  },
  status: {
    teamPendingAdmin: "Pending admin review",
    teamAwaitingUser: "Awaiting your review",
    teamApproved: "Approved",
    teamRejected: "Rejected",
    teamExpired: "Expired",
    teamCancelled: "Cancelled",
    maintainerPending: "Pending review",
    maintainerApproved: "Approved",
    maintainerRejected: "Rejected",
    maintainerExpired: "Expired",
    maintainerCancelled: "Cancelled",
  },
  time: {
    expired: "expired",
    daysRemaining: "{{count}}d remaining",
    hoursRemaining: "{{count}}h remaining",
  },
  labels: {
    round: "round {{current}} of {{total}}",
    submitted: "Submitted {{date}}",
    reason: "Reason",
    rejected: "Rejected: {{reason}}",
    reviewedBy: "by {{name}}",
    mirrorGithub: "Mirror to GitHub org: {{org}}",
    autoCancelledRounds: "Auto-cancelled after 3 rounds of negotiation.",
  },
  actions: {
    approve: "Approve",
    reject: "Reject",
    cancel: "Cancel",
    confirm: "Confirm",
    openInAdmin: "Open in admin",
    openTeam: "Open team →",
  },
  dialogs: {
    cancelTeamTitle: "Cancel team request?",
    cancelTeamMessage:
      '"{{name}}" ({{slug}}) will no longer appear in the admin queue. You can re-submit later.',
    cancelMaintainerTitle: "Cancel maintainer request?",
    cancelMaintainerMessage:
      'Your request to become a maintainer of "{{teamName}}" will be withdrawn. You can re-submit later.',
    cancelRequestLabel: "Cancel request",
    keepItLabel: "Keep it",
  },
  empty: {
    noRequests: "You haven't submitted any team or maintainer requests yet.",
    nothingPending: "Nothing waiting on you.",
  },
  loading: "Loading…",
  errors: {
    failedToLoad: "Failed to load",
    failedToLoadTeam: "Failed to load team requests",
    approvalFailed: "Approval failed",
    rejectionFailed: "Rejection failed",
    cancelFailed: "Cancel failed",
    confirmFailed: "Confirm failed",
  },
};

export type RequestsResources = typeof en;
