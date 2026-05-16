import { EventEmitter } from "node:events";
import type { StepEvent } from "@internal/scaffolder-core";

/** In-process pub/sub for executor events. */
class TaskEventBus {
  private readonly emitter = new EventEmitter();

  publish(event: StepEvent): void {
    this.emitter.emit(event.taskId, event);
  }

  subscribe(taskId: string, listener: (e: StepEvent) => void): () => void {
    const wrapped = (e: StepEvent) => listener(e);
    this.emitter.on(taskId, wrapped);
    return () => this.emitter.off(taskId, wrapped);
  }
}

export const taskEventBus: TaskEventBus = new TaskEventBus();
