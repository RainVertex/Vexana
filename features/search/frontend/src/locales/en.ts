export const en = {
  page: {
    title: "Search",
    description:
      "Find catalog entities, projects, tasks, teams, agents, pages, conversations, and DevDocs pages.",
  },
  form: {
    placeholder: "Search…",
    submit: "Search",
    submitting: "Searching…",
  },
  sections: {
    project: "Projects",
    task: "Tasks",
    catalog: "Catalog",
    team: "Teams",
    page: "Pages",
    chat: "Conversations",
    agent: "Agents",
    devdoc: "DevDocs",
  },
  kinds: {
    catalog: "catalog entity",
    team: "team",
    agent: "agent",
    devdoc: "devdoc",
    project: "project",
    task: "task",
    chat: "conversation",
    page: "page",
  },
  empty: {
    noResults: "No results for “{{query}}”.",
  },
  errors: {
    searchFailed: "Search failed",
  },
};

export type SearchResources = typeof en;
