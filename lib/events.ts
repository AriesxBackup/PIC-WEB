import "server-only";
import { EventEmitter } from "node:events";

/** Sent to every open browser tab over /api/events so the board updates live. */
export type LiveEvent = {
  type: "reel.created" | "reel.updated" | "reel.deleted" | "comment" | "vote";
  reelId: number;
  actorId: number;
  /** Shown as a toast to other people, when set. */
  message?: string;
  /** Limits the toast to this one person (everyone still refreshes). */
  targetUserId?: number;
};

// The app is a single Node process, so an in-memory emitter reaches every connected client.
const globalForBus = globalThis as unknown as { __reelBoardBus?: EventEmitter };
const bus = (globalForBus.__reelBoardBus ??= new EventEmitter().setMaxListeners(0));

export function publish(event: LiveEvent): void {
  bus.emit("event", event);
}

export function subscribe(listener: (event: LiveEvent) => void): () => void {
  bus.on("event", listener);
  return () => bus.off("event", listener);
}
