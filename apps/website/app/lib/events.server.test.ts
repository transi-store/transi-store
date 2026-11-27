import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEventBus } from "./events.server";

describe("events.server", () => {
  type TestEvents = {
    "test.created": { id: number };
  };

  const eventBus = createEventBus<TestEvents>();

  beforeEach(() => {
    eventBus.clear();
  });

  it("dispatches events to subscribed listeners", async () => {
    const handler = vi.fn();
    eventBus.on("test.created", handler);

    await eventBus.emit("test.created", { id: 42 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ id: 42 });
  });

  it("stops dispatching to unsubscribed listeners", async () => {
    const handler = vi.fn();
    const unsubscribe = eventBus.on("test.created", handler);
    unsubscribe();

    await eventBus.emit("test.created", { id: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it("keeps dispatching when one listener fails", async () => {
    const failingHandler = vi.fn(async () => {
      throw new Error("listener failed");
    });
    const successfulHandler = vi.fn();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    eventBus.on("test.created", failingHandler);
    eventBus.on("test.created", successfulHandler);

    await eventBus.emit("test.created", { id: 2 });

    expect(failingHandler).toHaveBeenCalledTimes(1);
    expect(successfulHandler).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockRestore();
  });
});
