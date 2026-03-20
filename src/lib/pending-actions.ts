import { randomUUID } from "crypto";

export interface PendingAction {
  id: string;
  restaurantId: string;
  clerkId: string;
  toolName: string;
  input: unknown;
  preview: unknown;
  createdAt: number;
  expiresAt: number;
}

const TTL_MS = 10 * 60_000; // 10 minutes
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

const store = new Map<string, PendingAction>();

export function createPendingAction(
  restaurantId: string,
  clerkId: string,
  toolName: string,
  input: unknown,
  preview: unknown
): string {
  const now = Date.now();
  const id = randomUUID();

  store.set(id, {
    id,
    restaurantId,
    clerkId,
    toolName,
    input,
    preview,
    createdAt: now,
    expiresAt: now + TTL_MS,
  });

  return id;
}

export function consumePendingAction(
  id: string,
  restaurantId: string,
  clerkId: string
): PendingAction | null {
  const action = store.get(id);

  if (!action) return null;
  if (action.restaurantId !== restaurantId) return null;
  if (action.clerkId !== clerkId) return null;
  if (Date.now() > action.expiresAt) {
    store.delete(id);
    return null;
  }

  store.delete(id);
  return action;
}

function cleanup() {
  const now = Date.now();
  for (const [id, action] of store) {
    if (now > action.expiresAt) {
      store.delete(id);
    }
  }
}

setInterval(cleanup, CLEANUP_INTERVAL_MS).unref();
