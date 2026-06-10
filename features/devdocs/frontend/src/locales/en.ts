export const en = {
  freshness: {
    fresh: "Fresh",
    aging: "Aging",
    stale: "Stale",
    unknown: "Unknown freshness",
    lastEdited: "Last edited {{when}}",
    lastEditedBy: "Last edited {{when}} by {{who}}",
    verified: "· Verified {{when}}",
    markVerified: "Mark verified",
    saving: "Saving…",
    reportStale: "Report stale",
  },
  time: {
    unknown: "unknown",
    today: "today",
    yesterday: "yesterday",
    daysAgo: "{{count}} days ago",
    monthsAgo: "{{count}} months ago",
    yearsAgo: "{{count}} years ago",
  },
  search: {
    placeholder: "Search this entity's docs…",
    button: "Search",
    searching: "…",
    searchAll: "Search all DevDocs ↗",
  },
  sidebar: {
    navLabel: "DevDocs pages",
    overview: "Overview",
  },
  comments: {
    heading: "Comments",
    loading: "Loading comments…",
    empty: "No comments yet. Start the conversation.",
    placeholder: "Add a comment…",
    post: "Post comment",
    posting: "Posting…",
    delete: "Delete",
    unknownAuthor: "Unknown",
  },
  reportDialog: {
    title: "Report this page as stale",
    description:
      "This pings the entity owners to take a look. Optional: tell them what's out of date.",
    placeholder: "What's out of date?",
    cancel: "Cancel",
    submit: "Submit",
    submitting: "Submitting…",
  },
  external: {
    heading: "External documentation",
    description: "This entity's docs live on an external site.",
  },
  empty: {
    heading: "No DevDocs yet",
    intro:
      "DevDocs auto-discovers Markdown from this entity's repo. To make docs appear here, do one of:",
    step1:
      "Add a docs/ folder at the repo root containing one or more .md or .mdx files. Subfolders are walked recursively and become nested pages (up to 200 files total). The landing page is docs/index.md if it exists, otherwise docs/README.md, otherwise the first page found. Each page's title is taken from a title: YAML frontmatter field, then the first # heading in the file, then the filename.",
    step2: 'Add a README.md at the repo root. It is rendered as a single "Overview" page.',
    step3:
      "Set spec.docs in catalog-info.yaml to point at a different folder in this repo, or at an external docs site:",
    schedule:
      "A sync runs automatically when this entity is registered or updated, and every two hours on a schedule.",
    lastSyncError: "Last sync error: {{error}}",
    runSync: "Run sync now",
    syncing: "Syncing…",
  },
  tab: {
    loadingDocs: "Loading DevDocs…",
    loadingPage: "Loading page…",
    resync: "Resync from repo",
    resyncing: "Syncing…",
  },
  errors: {
    failedVerify: "Failed to mark verified",
    failedReport: "Failed to submit report",
    failedPostComment: "Failed to post comment",
    failedLoadDocs: "Failed to load DevDocs",
    failedLoadPage: "Failed to load page",
    failedLoadComments: "Failed to load comments",
    syncFailed: "Sync failed",
    searchFailed: "Search failed",
  },
};

export type DevdocsResources = typeof en;
