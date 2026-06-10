export const en = {
  page: {
    title: "Integrations",
    description: "External tools mirrored into the platform.",
    backToIntegrations: "← Back to integrations",
  },
  connected: {
    heading: "Connected",
    loading: "Loading…",
    empty: "Nothing connected yet. Pick a provider below to get started.",
    enabled: "enabled",
    disabled: "disabled",
    configure: "Configure",
    disconnect: "Disconnect",
  },
  providers: {
    heading: "Available providers",
    comingSoon: "Coming soon",
    connect: "Connect",
    github: {
      label: "GitHub (App Installation)",
      description:
        "Install the GitHub App on an organization. Imports repos, teams, and members, kept in sync via webhooks and weekly reconciliation.",
    },
    jira: {
      label: "Jira",
      description: "Atlassian projects, issues, and sprints.",
    },
    slack: {
      label: "Slack",
      description: "Channel events, mentions, and notifications.",
    },
    grafana: {
      label: "Grafana",
      description:
        "Service-account-token connection to a Grafana instance. Proxies queries to Prometheus, Loki, and Tempo and routes Alertmanager webhooks into the notifications bell.",
    },
  },
  manage: {
    loading: "Loading…",
    noPanel: "No configure surface for this provider yet.",
    disable: "Disable",
    enable: "Enable",
    disconnect: "Disconnect",
    fallbackTitle: "Integration",
  },
  confirm: {
    disconnectTitle: "Disconnect {{name}}?",
    disconnectMessage:
      "This deletes the local mirror data. The external tool itself is not affected.",
    disconnectLabel: "Disconnect",
  },
  errors: {
    loadIntegrations: "Failed to load integrations",
    loadIntegration: "Failed to load integration",
    toggleFailed: "Toggle failed",
    disconnectFailed: "Disconnect failed",
    resyncFailed: "Resync failed",
    probeFailed: "Probe failed",
    connectFailed: "Connect failed",
    rotateFailed: "Rotate failed",
    saveFailed: "Save failed",
  },
  grafanaConnect: {
    stepCredentialsTitle: "Connect Grafana",
    stepCredentialsDescription:
      "The platform talks to Prometheus, Loki, and Tempo through Grafana's datasource proxy. One service-account token is all that's needed.",
    fieldDisplayName: "Display name",
    fieldDisplayNamePlaceholder: "Grafana (prod)",
    fieldBaseUrl: "Base URL",
    fieldBaseUrlPlaceholder: "https://grafana.example.com",
    fieldServiceAccountToken: "Service account token",
    fieldServiceAccountTokenPlaceholder: "glsa_…",
    advancedShow: "Advanced…",
    advancedHide: "Hide advanced",
    fieldSuppressionWindow: "Re-notify suppression window (minutes)",
    cancel: "Cancel",
    probing: "Probing…",
    connectButton: "Connect",
    stepDatasourcesTitle: "Pick datasources",
    stepDatasourcesDescription:
      "Grafana exposes more than one matching datasource for some types. Confirm which one the platform should query.",
    dsPrometheus: "Prometheus (required for the scrape job)",
    dsLoki: "Loki (optional; enables the logs panel)",
    dsTempo: "Tempo (optional; enables trace drill-down)",
    noImageRenderer:
      "Dashboard embeds disabled — install the grafana-image-renderer plugin on this Grafana to enable PNG panel embeds.",
    back: "Back",
    saving: "Saving…",
    saveIntegration: "Save integration",
    stepConnectedTitle: "Connected",
    stepConnectedDescription:
      "Set up the Alertmanager webhook in Grafana so firing alerts land in the notifications bell. Copy the secret now — it is shown exactly once.",
    webhookStep1:
      "In Grafana → Alerting → Contact points, create a Webhook contact point. Use this URL (prefix with your public tunnel host):",
    webhookStep2: "Under Optional Webhook settings → HTTP headers, add a header:",
    webhookStep3: "Save the contact point and route alert rules to it.",
    noImageRendererConnected:
      "Dashboard embeds are disabled until grafana-image-renderer is installed.",
    done: "Done",
  },
  grafanaManage: {
    sectionConnection: "Connection",
    fieldBaseUrl: "Base URL",
    fieldApiToken: "API token",
    apiTokenSet: "set",
    apiTokenNotSet: "not set",
    rotateApiToken: "Rotate API token…",
    sectionDatasources: "Datasources",
    fieldPrometheusUid: "Prometheus UID",
    fieldLokiUid: "Loki UID",
    fieldTempoUid: "Tempo UID",
    fieldImageRenderer: "Image renderer",
    imageRendererAvailable: "available",
    imageRendererNotAvailable: "not available",
    editDatasources: "Edit datasources…",
    sectionSuppression: "Alert re-notify suppression",
    fieldWindow: "Window (minutes)",
    suppressionHint: "A still-firing alert is delivered to the bell at most once per window.",
    savingSuppression: "Saving…",
    saveSuppression: "Save",
    sectionWebhook: "Webhook",
    fieldEndpoint: "Endpoint",
    fieldSecret: "Secret",
    webhookSecretSet: "set",
    webhookSecretNotSet: "not set",
    webhookSecretNote:
      "The secret is hashed in storage and cannot be re-displayed. If you missed copying it the first time, rotate to a fresh one — the new value is shown once.",
    rotateWebhookSecret: "Rotate webhook secret…",
    rotateTokenTitle: "Rotate API token",
    rotateTokenDescription:
      "Paste a new Grafana service account token. The previous token stops being used as soon as this validates and saves.",
    fieldNewServiceAccountToken: "New service account token",
    cancel: "Cancel",
    validating: "Validating…",
    rotateButton: "Rotate",
    editDatasourcesTitle: "Edit datasources",
    probingGrafana: "Probing Grafana…",
    saving: "Saving…",
    save: "Save",
    confirmRotateWebhookTitle: "Rotate webhook secret?",
    confirmRotateWebhookMessage:
      "The current secret stops working as soon as this completes. Alerts delivered to the old bearer will 401 until Grafana's Contact Point is updated with the new value.",
    confirmRotateLabel: "Rotate",
    newWebhookSecretTitle: "New webhook secret",
    newWebhookSecretDescription:
      "Copy the secret now — it is shown exactly once. Paste it into Grafana's Contact Point Authorization header.",
    webhookUrlLabel: "Webhook URL:",
    authHeaderLabel: "Authorization header:",
    done: "Done",
  },
  githubConnect: {
    title: "Connect GitHub",
    description:
      "You'll be redirected to GitHub to install the platform's App on an organization. After install, GitHub returns you here and the platform starts importing:",
    itemRepositories: "Repositories",
    itemRepositoriesDetail:
      "every repo the installation can see, with catalog-info.yaml auto-discovered.",
    itemTeams: "Teams & members",
    itemTeamsDetail:
      "org teams imported as platform Teams (members matched to existing users by GitHub id; others queue with a 7-day TTL until they sign in).",
    ongoingNote:
      "Ongoing changes flow in via webhooks; a weekly cron does a differential reconciliation to catch missed deliveries. You can also Resync manually from the integration's Configure panel.",
    cancel: "Cancel",
    redirecting: "Redirecting…",
    installButton: "Install on GitHub",
  },
  githubManage: {
    sectionInstallation: "Installation",
    fieldOrg: "Org",
    fieldInstallationId: "Installation id",
    sectionSync: "Sync",
    syncHint: "Run a manual reconciliation now.",
    syncing: "Syncing…",
    resyncNow: "Resync now",
    resyncStatusTemplate:
      "Resync ok — teams {{teamsCreated}}+/{{teamsUpdated}}~/{{teamsDeleted}}-, members {{membersAdded}}+/{{membersRemoved}}-",
  },
  drift: {
    staleTeams: "stale teams",
    lastReconciliation: "Last reconciliation:",
    never: "never",
    pendingMemberships_one: "{{count}} pending team membership awaiting SSO sign-in.",
    pendingMemberships_other: "{{count}} pending team memberships awaiting SSO sign-in.",
    resyncing: "Resyncing…",
    resyncNow: "Resync now",
  },
  datasource: {
    noneOption: "(none)",
    defaultSuffix: " (default)",
    noDataRequired:
      "No datasource of this type configured in Grafana — cannot continue without one.",
    noDataOptional:
      "No datasource of this type configured in Grafana — leaving this feature disabled.",
  },
};

export type IntegrationsResources = typeof en;
