export const en = {
  page: {
    titleUser: "My webhooks",
    titleTeam: "Team webhooks · {{slug}}",
    descriptionUser: "Outbound webhooks for events that target you.",
    descriptionTeam: "Outbound webhooks for this team's events.",
    signatureNote:
      "Each delivery is signed using X-MEP-Signature: sha256=<hex> over the raw body, using the subscription secret. Slack-format payload (text, blocks) is sent automatically when the URL is hooks.slack.com; native JSON otherwise.",
  },
  form: {
    sectionTitle: "New subscription",
    urlLabel: "URL",
    urlPlaceholder: "https://hooks.slack.com/services/…",
    eventKindsLegend: "Event kinds",
    createButton: "Create",
  },
  secret: {
    banner: "Webhook created. Save this secret now:",
    dismiss: "Dismiss",
  },
  list: {
    sectionTitle: "Existing subscriptions",
    loading: "Loading…",
    empty: "No webhooks yet.",
    disabledLabel: "disabled",
    sendPing: "Send ping",
    delete: "Delete",
  },
  alerts: {
    pingEnqueued: "Ping enqueued, check delivery history shortly.",
    deleteConfirm: "Delete this webhook subscription?",
  },
  errors: {
    loadFailed: "Failed to load",
    createFailed: "Create failed",
    deleteFailed: "Delete failed",
    testFailed: "Test failed",
  },
};

export type WebhooksResources = typeof en;
