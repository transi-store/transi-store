import nodemailer from "nodemailer";
import type { AppEventMap } from "../app-events";

const DEFAULT_BREVO_SMTP_HOST = "smtp-relay.brevo.com";
const DEFAULT_BREVO_SMTP_PORT = 587;
const NO_NAME_FALLBACK = "No name provided";

type EmailNotificationConfig = {
  adminNotificationEmail: string;
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
};

function getOptionalEnvVar(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function getBrevoPort(): number {
  const rawPort = process.env.BREVO_SMTP_PORT;
  if (!rawPort) {
    return DEFAULT_BREVO_SMTP_PORT;
  }

  const parsedPort = Number(rawPort);
  if (Number.isNaN(parsedPort)) {
    return DEFAULT_BREVO_SMTP_PORT;
  }

  return parsedPort;
}

function getEmailNotificationConfig(): EmailNotificationConfig | null {
  const adminNotificationEmail = getOptionalEnvVar("ADMIN_NOTIFICATION_EMAIL");
  if (!adminNotificationEmail) {
    return null;
  }

  const user = getOptionalEnvVar("BREVO_SMTP_USER");
  const password = getOptionalEnvVar("BREVO_SMTP_PASSWORD");
  if (!user || !password) {
    return null;
  }

  const fromEmail = getOptionalEnvVar("EMAIL_FROM") ?? user;

  return {
    adminNotificationEmail,
    host: getOptionalEnvVar("BREVO_SMTP_HOST") ?? DEFAULT_BREVO_SMTP_HOST,
    port: getBrevoPort(),
    user,
    password,
    fromEmail,
  };
}

export async function sendAdminUserJoinedPlatformEmail(
  payload: AppEventMap["user.joined_platform"],
): Promise<boolean> {
  const config = getEmailNotificationConfig();
  if (!config) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  const subject = "[transi-store] New user joined the platform";
  const displayName = payload.name ?? NO_NAME_FALLBACK;

  await transporter.sendMail({
    from: config.fromEmail,
    to: config.adminNotificationEmail,
    subject,
    text: [
      "A new user has joined the platform.",
      "",
      `User ID: ${payload.userId}`,
      `Email: ${payload.email}`,
      `Name: ${displayName}`,
      `OAuth provider: ${payload.oauthProvider}`,
    ].join("\n"),
  });

  return true;
}
