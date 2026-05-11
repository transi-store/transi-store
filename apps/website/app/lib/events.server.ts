import type { AppEventMap } from "./app-events";

/**
 * Lightweight in-memory event bus for server-side domain events.
 *
 * Usage:
 * - Register listeners at startup (for example in entry.server.tsx) with `onAppEvent`.
 * - Emit events from domain flows with `emitAppEvent`.
 * - Keep listeners side-effect oriented and non-blocking for core user flows.
 *
 * Listener failures are isolated: all listeners run via `Promise.allSettled`, and
 * rejections are logged without throwing to the emitter.
 */
type EventHandler<EventPayload> = (
  payload: EventPayload,
) => void | Promise<void>;

type EventHandlerMap<EventMap extends Record<string, unknown>> = Map<
  keyof EventMap,
  Set<EventHandler<EventMap[keyof EventMap]>>
>;

export type EventBus<EventMap extends Record<string, unknown>> = {
  on<EventName extends keyof EventMap>(
    eventName: EventName,
    handler: EventHandler<EventMap[EventName]>,
  ): () => void;
  emit<EventName extends keyof EventMap>(
    eventName: EventName,
    payload: EventMap[EventName],
  ): Promise<void>;
  clear(): void;
};

/** Creates a typed event bus instance for a specific event map. */
export function createEventBus<
  EventMap extends Record<string, unknown>,
>(): EventBus<EventMap> {
  const listeners: EventHandlerMap<EventMap> = new Map();

  return {
    on<EventName extends keyof EventMap>(
      eventName: EventName,
      handler: EventHandler<EventMap[EventName]>,
    ) {
      const existingListeners =
        (listeners.get(eventName) as Set<EventHandler<EventMap[EventName]>>) ??
        new Set<EventHandler<EventMap[EventName]>>();

      existingListeners.add(handler);
      listeners.set(
        eventName,
        existingListeners as Set<EventHandler<EventMap[keyof EventMap]>>,
      );

      return () => {
        existingListeners.delete(handler);
      };
    },
    async emit<EventName extends keyof EventMap>(
      eventName: EventName,
      payload: EventMap[EventName],
    ) {
      const eventListeners =
        (listeners.get(eventName) as Set<EventHandler<EventMap[EventName]>>) ??
        new Set<EventHandler<EventMap[EventName]>>();

      const results = await Promise.allSettled(
        Array.from(eventListeners).map(async (handler) => {
          await handler(payload);
        }),
      );

      for (const result of results) {
        if (result.status === "rejected") {
          console.error(result.reason);
        }
      }
    },
    clear() {
      listeners.clear();
    },
  };
}

const appEventBus = createEventBus<AppEventMap>();

/** Registers a listener for a global application event. */
export function onAppEvent<EventName extends keyof AppEventMap>(
  eventName: EventName,
  handler: EventHandler<AppEventMap[EventName]>,
): () => void {
  return appEventBus.on(eventName, handler);
}

/** Emits a global application event with a typed payload. */
export async function emitAppEvent<EventName extends keyof AppEventMap>(
  eventName: EventName,
  payload: AppEventMap[EventName],
): Promise<void> {
  await appEventBus.emit(eventName, payload);
}

/** Clears all registered global event listeners (tests only). */
export function resetAppEventBusForTests(): void {
  appEventBus.clear();
}
