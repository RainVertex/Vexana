// Catalog entity kind vocabulary. Lives in shared-types because multiple features reference it
// (catalog defines entities, scorecards evaluate them) and a feature-to-feature type cycle would
// break the Turbo task graph.
export type CatalogEntityKind =
  | "service"
  | "api"
  | "library"
  | "website"
  | "database"
  | "infrastructure";
