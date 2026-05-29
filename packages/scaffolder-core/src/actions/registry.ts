import type { AnyAction } from "./types";

export class ActionRegistry {
  private readonly byId = new Map<string, AnyAction>();

  register(action: AnyAction): void {
    if (this.byId.has(action.id)) {
      throw new Error(`Duplicate action id: ${action.id}`);
    }
    this.byId.set(action.id, action);
  }

  registerMany(actions: AnyAction[]): void {
    for (const a of actions) this.register(a);
  }

  get(id: string): AnyAction | undefined {
    return this.byId.get(id);
  }

  /** Throws if missing, used by the executor where an unknown action is fatal. */
  require(id: string): AnyAction {
    const a = this.byId.get(id);
    if (!a) throw new Error(`Unknown scaffolder action: ${id}`);
    return a;
  }

  list(): AnyAction[] {
    return Array.from(this.byId.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  clear(): void {
    this.byId.clear();
  }
}

export function createActionRegistry(): ActionRegistry {
  return new ActionRegistry();
}
