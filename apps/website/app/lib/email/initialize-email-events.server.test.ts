import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendAdminUserJoinedPlatformEmailMock } = vi.hoisted(() => ({
  sendAdminUserJoinedPlatformEmailMock: vi.fn(),
}));

vi.mock("~/lib/email/admin-notifications.server", () => ({
  sendAdminUserJoinedPlatformEmail: sendAdminUserJoinedPlatformEmailMock,
}));

import { OAuthProvider } from "../auth-providers";
import { emitAppEvent, resetAppEventBusForTests } from "../events.server";
import {
  initializeEmailEventHandlers,
  resetEmailEventHandlersForTests,
} from "./initialize-email-events.server";

describe("initialize-email-events.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAppEventBusForTests();
    resetEmailEventHandlersForTests();
  });

  it("registers handlers once and forwards the event to the email sender", async () => {
    initializeEmailEventHandlers();
    initializeEmailEventHandlers();

    await emitAppEvent("user.joined_platform", {
      userId: 5,
      email: "new-user@example.com",
      name: "New User",
      oauthProvider: OAuthProvider.GOOGLE,
    });

    expect(sendAdminUserJoinedPlatformEmailMock).toHaveBeenCalledTimes(1);
    expect(sendAdminUserJoinedPlatformEmailMock).toHaveBeenCalledWith({
      userId: 5,
      email: "new-user@example.com",
      name: "New User",
      oauthProvider: OAuthProvider.GOOGLE,
    });
  });
});
