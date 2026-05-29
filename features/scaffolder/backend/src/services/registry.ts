import {
  createActionRegistry,
  createTemplateRegistry,
  debugLogAction,
  fetchTemplateAction,
  fsDeleteAction,
  fsRenameAction,
  fsWriteAction,
  repoScaffoldAction,
  wireFeatureAction,
  wireSidebarAction,
  type ActionRegistry,
  type TemplateRegistry,
} from "@internal/scaffolder-core";
import {
  githubServiceTemplate,
  inRepoFeatureTemplate,
  inRepoWidgetTemplate,
} from "@internal/scaffolder-templates";
import { catalogRegisterAction } from "../actions/catalog";
import { catalogDiscoverAction } from "../actions/catalog-discover";
import { bindingWriteAction } from "../actions/binding";
import { publishGithubAction } from "../actions/publish-github";

let actionsCache: ActionRegistry | null = null;
let templatesCache: TemplateRegistry | null = null;

export function getActionRegistry(): ActionRegistry {
  if (actionsCache) return actionsCache;
  const actions = createActionRegistry();
  actions.registerMany([
    debugLogAction,
    fsWriteAction,
    fsDeleteAction,
    fsRenameAction,
    fetchTemplateAction,
    repoScaffoldAction,
    wireFeatureAction,
    wireSidebarAction,
    catalogRegisterAction,
    catalogDiscoverAction,
    bindingWriteAction,
    publishGithubAction,
  ]);
  actionsCache = actions;
  return actions;
}

export function getTemplateRegistry(): TemplateRegistry {
  if (templatesCache) return templatesCache;
  const templates = createTemplateRegistry();
  templates.register(inRepoFeatureTemplate);
  templates.register(inRepoWidgetTemplate);
  templates.register(githubServiceTemplate);
  templatesCache = templates;
  return templates;
}

// Test-only, drops the singletons so a test can re-register against a fresh
// registry without polluting later suites.
export function resetRegistries(): void {
  actionsCache = null;
  templatesCache = null;
}
