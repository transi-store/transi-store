import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { createTransportMock, sendMailMock } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({
    sendMail,
  }));

  return {
    createTransportMock: createTransport,
    sendMailMock: sendMail,
  };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

import { OAuthProvider } from "../auth-providers";
import { sendAdminUserJoinedPlatformEmail } from "./admin-notifications.server";

const originalEnv = process.env;

describe("admin-notifications.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.EMAIL_FROM;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns false when admin email is not configured", async () => {
    const sent = await sendAdminUserJoinedPlatformEmail({
      userId: 1,
      email: "new-user@example.com",
      name: "New User",
      oauthProvider: OAuthProvider.GITHUB,
    });

    expect(sent).toBe(false);
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("returns false when SMTP credentials are missing", async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@example.com";

    const sent = await sendAdminUserJoinedPlatformEmail({
      userId: 1,
      email: "new-user@example.com",
      name: "New User",
      oauthProvider: OAuthProvider.GITHUB,
    });

    expect(sent).toBe(false);
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("sends the email when SMTP and admin settings are configured", async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@example.com";
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASSWORD = "smtp-password";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "2525";
    process.env.EMAIL_FROM = "no-reply@example.com";

    const sent = await sendAdminUserJoinedPlatformEmail({
      userId: 123,
      email: "new-user@example.com",
      name: "New User",
      oauthProvider: OAuthProvider.GOOGLE,
    });

    expect(sent).toBe(true);
    expect(createTransportMock).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 2525,
      secure: false,
      auth: {
        user: "smtp-user",
        pass: "smtp-password",
      },
    });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "no-reply@example.com",
        to: "admin@example.com",
        subject: "[transi-store] New user joined the platform",
      }),
    );
  });
});
