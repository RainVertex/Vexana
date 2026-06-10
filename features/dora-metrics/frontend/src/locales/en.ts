export const en = {
  page: {
    title: "DORA Metrics",
    description: "Deploy frequency, lead time, MTTR, change failure rate.",
  },
  snapshot: {
    deploysPerDay: "Deploys/day",
    lead: "Lead",
    mttr: "MTTR",
    cfr: "CFR",
  },
  status: {
    loading: "Loading…",
    noSnapshots: "No snapshots yet.",
  },
  errors: {
    loadFailed: "Failed to load metrics",
  },
};

export type DoraMetricsResources = typeof en;
