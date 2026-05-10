import type { OAuthProvider } from "./auth-providers";

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

export type AppEventMap = {
  "user.joined_platform": {
    userId: number;
    email: string;
    name: string | null;
    oauthProvider: OAuthProvider;
  };
};

const appEventBus = createEventBus<AppEventMap>();

export function onAppEvent<EventName extends keyof AppEventMap>(
  eventName: EventName,
  handler: EventHandler<AppEventMap[EventName]>,
): () => void {
  return appEventBus.on(eventName, handler);
}

export async function emitAppEvent<EventName extends keyof AppEventMap>(
  eventName: EventName,
  payload: AppEventMap[EventName],
): Promise<void> {
  await appEventBus.emit(eventName, payload);
}

export function resetAppEventBusForTests(): void {
  appEventBus.clear();
}
