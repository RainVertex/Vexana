export const en = {
  page: {
    teamsTitle: "Teams",
    teamsDescription: "People, roles, ownership.",
    requestTeamTitle: "Request a team",
    requestTeamDescription:
      "Submit a request for an admin to review. Optionally mirror the new team to a connected GitHub org.",
    teamTitle: "Team",
    teamRequestsTitle: "Team requests",
    teamRequestsDescription:
      "Approve, reject, or propose changes to pending team-creation requests.",
    teamPoliciesTitle: "Team policies",
    teamPoliciesDescription:
      "Hard rules enforced on every team request at submission. Adding a new policy requires a code change; this page toggles and configures the existing ones.",
    requestMaintainerTitle: "Request maintainership",
    requestMaintainerDescription:
      "Pick a team where you're a member but not yet a lead, and submit a request to become a maintainer.",
  },
  actions: {
    requestTeam: "Request team",
    reviewRequests: "Review requests",
    approve: "Approve",
    reject: "Reject",
    proposeChanges: "Propose changes",
    requestMaintainership: "Request maintainership",
    delete: "Delete",
    leave: "Leave",
    remove: "Remove",
    transfer: "Transfer",
    saveConfig: "Save config",
    cancel: "Cancel",
    submit: "Submit",
    submitting: "Submitting…",
    rejecting: "Rejecting…",
    sendProposal: "Send proposal",
    sendCounterProposal: "Send counter-proposal",
    requestToBecomeMaintianer: "Request to become maintainer",
  },
  status: {
    loading: "Loading…",
    searching: "Searching…",
    waitingOnRequester: "waiting on requester",
    maintainerRequestPending: "Maintainer request pending",
  },
  empty: {
    noTeams: "No teams yet.",
    queueEmpty: "Queue is empty.",
    noMatches: "No matches",
    alreadyLeadOrPending:
      "You're either a lead, or have a pending request, on every team you belong to.",
  },
  errors: {
    failedToLoadTeams: "Failed to load teams",
    failedToLoad: "Failed to load",
    updateFailed: "Update failed",
    approveFailed: "Approve failed",
    rejectFailed: "Reject failed",
    addFailed: "Add failed",
    removeFailed: "Remove failed",
    transferFailed: "Transfer failed",
    deleteFailed: "Delete failed",
    submissionFailed: "Submission failed",
    searchFailed: "Search failed",
  },
  members: {
    sectionTitle: "Members ({{count}})",
    addMemberTitle: "Add a member",
    roleLead: "lead",
    roleMember: "member",
    alreadyAdded: "already added",
    removeAriaLabel: "Remove {{name}}",
  },
  transfer: {
    sectionTitle: "Transfer ownership",
    description:
      "Move all catalog entities and projects owned by this team to another team. Required before deletion if this team owns resources.",
    selectTargetPlaceholder: "— Select target team —",
  },
  confirm: {
    deleteTeam: 'Soft-delete "{{name}}"? It can be restored within 30 days.',
    transferResult: "Transferred {{count}} entities to {{slug}}.",
  },
  form: {
    teamNameLabel: "Team name",
    teamNamePlaceholder: "My new team",
    slugLabel: "Slug",
    slugPlaceholder: "data-platform-team",
    descriptionLabel: "Description (optional)",
    descriptionLabelEdit: "Description",
    maintainersLabel: "Maintainers (optional)",
    membersLabel: "Members (optional)",
    noMembersHint:
      "If you don't choose any members or maintainer, only you will be added as the maintainer.",
    mirrorToGithub: "Mirror to GitHub?",
    whichGithubOrg: "Which GitHub org?",
    selectOrgPlaceholder: "— Select an org —",
    noGithubIntegrations:
      "No active GitHub integrations connected. Ask an admin to install the GitHub App first.",
    noGithubIntegrationsShort: "No active GitHub integrations connected.",
    githubMembersHint:
      "Picked users will also be added to the GitHub team. Anyone GitHub can't add (e.g. not in the org and not invitable) will be skipped — the rest will go through.",
    addMaintainerPlaceholder: "Add a maintainer…",
    addMemberPlaceholder: "Add a member…",
    whyOptionalLabel: "Why? (optional)",
    whyPlaceholder: "Context that will help the approver decide.",
    reasonPlaceholder: "Why is this request being rejected?",
    autoCancelWarning:
      "This will be the {{round}}th edit and exceeds the 3-round negotiation cap. Submitting will auto-cancel the request and notify both parties.",
  },
  policy: {
    enabledLabel: "Enabled",
    requiredSuffixLabel: "Required suffix",
    requireHyphenLabel: "Require hyphen between words",
  },
  requestList: {
    byRound: "by {{name}} · round {{round}} of 3",
    mirrorToOrg: "Mirror to GitHub org: {{org}}",
    mirrorMissingIntegration:
      "Mirror requested but the linked GitHub integration is missing or disabled.",
    changesFromOriginal: "Changes from original",
    diffNone: "(none)",
  },
  diff: {
    slug: "slug",
    name: "name",
    description: "description",
    mirrorToGithub: "mirror to GitHub",
    githubIntegration: "GitHub integration",
    yes: "yes",
    no: "no",
  },
  proposedMembers: {
    maintainersLabel: "Maintainers",
    membersLabel: "Members",
  },
  dialogs: {
    rejectTeamRequestTitle: "Reject team request",
    rejectTeamRequestTitleWithName: "Reject team request: {{name}}",
    rejectNotification: "The requester will be notified with the reason you provide.",
    rejectMaintainerRequestTitle: "Reject maintainer request",
    rejectMaintainerRequestTitleWithInfo: "Reject maintainer request: {{requester}} to {{team}}",
    requestTeamTitle: "Request a team",
    requestTeamDescription:
      "Submit a request for an admin to review. You can also mirror the team to a connected GitHub org.",
    proposeChangesTitle: "Propose changes",
    proposeChangesDescription:
      "Edit any field and send back to the requester for confirmation. They can confirm, counter-propose, or cancel.",
    counterProposeTitle: "Counter-propose",
    counterProposeDescription:
      "Edit the admin's proposal and send it back. The admin will see your changes and can approve, propose more changes, or reject.",
    requestMaintainerTitle: "Request to become a maintainer",
    requestMaintainerDescription:
      "Submit a request for an admin or a current maintainer of {{teamName}} to review. You'll be notified when the request is approved or rejected.",
  },
  filter: {
    showAllOrgs: "Show teams from all organizations",
  },
  teamMeta: {
    member_one: "{{count}} member",
    member_other: "{{count}} members",
    lead_one: "Lead",
    lead_other: "Leads",
    noLead: "no lead",
  },
  userPicker: {
    defaultPlaceholder: "Search by name or email…",
  },
};

export type TeamsResources = typeof en;
