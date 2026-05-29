import { join } from "node:path";

// __dirname is `<package>/dist` after build and `<package>/src` under tsx
// so the canonical skeletons root sits one directory above wherever this
// module is loaded from. Resolves identically in both layouts.
export const skeletonsRoot: string = join(__dirname, "..", "skeletons");

export function skeletonPath(templateId: string): string {
  return join(skeletonsRoot, templateId);
}
