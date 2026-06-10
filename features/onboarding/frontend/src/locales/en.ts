export const en = {
  progress: {
    remaining: "{{remaining}} of {{total}} remaining",
  },
  tasks: {
    "request-tool-access": {
      title: "Request access to your tools",
      description:
        "Get the credentials you need for GitHub, observability, and the rest of your toolchain.",
      ctaLabel: "Browse integrations",
    },
    "team-join": {
      title: "Join or create a team",
      description: "Find your team or request a new one if it doesn't exist yet.",
      ctaLabel: "Find a team",
    },
    fallbackCtaLabel: "Open",
  },
  actions: {
    markDone: "Mark done",
    dismiss: "Dismiss",
  },
  empty: {
    allCaughtUp: "You're all caught up.",
  },
  errors: {
    loadFailed: "Failed to load onboarding.",
  },
};

export type OnboardingResources = typeof en;
