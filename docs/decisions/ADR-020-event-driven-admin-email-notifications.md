# ADR-020: Event-driven admin email notifications for new users

**Date**: 2026-05-10

**Status**: Accepted ✅

## Context

transi-store currently has no email delivery stack and no reusable mechanism for
cross-cutting side effects triggered by domain events.

We need to send an email to the server administrator when a new user joins the
platform. The destination email and Brevo credentials must stay optional so that
local development and trial environments can run with empty values.

This requirement also opens the door to future notifications based on other
events, so the solution should avoid coupling mail delivery directly inside the
OAuth callback flow.

## Decision

1. Introduce a global server-side event bus (`app/lib/events.server.ts`).
2. Emit a `user.joined_platform` event when `auth.server.ts` creates a new user.
3. Implement Brevo SMTP delivery with Nodemailer in a dedicated email module
   (`app/lib/email/admin-notifications.server.ts`).
4. Register email listeners once at server startup
   (`app/lib/email/initialize-email-events.server.ts`, called from
   `entry.server.tsx`).
5. Keep email configuration optional:
   - If `ADMIN_NOTIFICATION_EMAIL` is empty, no notification is sent.
   - If Brevo credentials are missing, email sending is skipped.

## Reasons

1. **Separation of concerns**: user creation remains focused on auth/account
   persistence; side effects are delegated to event listeners.
2. **Scalability**: new notification use cases can subscribe to events without
   rewriting core auth flows.
3. **Operational flexibility**: optional env vars support self-hosted
   deployments that do not want email configured.
4. **Safety**: event dispatch catches listener failures, so login is not blocked
   by email transport issues.

## Alternatives considered

1. **Send email directly in `upsertUser()`**
   - Rejected: couples infrastructure concerns (SMTP) to auth persistence logic.
2. **Cron-based polling for new users**
   - Rejected: adds delay and complexity for an immediate notification use case.
3. **Webhook-only notifications**
   - Rejected: does not satisfy the immediate requirement of sending email
     directly through Brevo.

## Consequences

### Positive

- First reusable global event mechanism now exists in the backend.
- Admin notifications are isolated in `app/lib/email/`.
- Missing SMTP/admin settings no longer cause runtime failures; behavior
  degrades gracefully.
- Tests now cover both the event bus and the auth/email integration path.

### Negative

- Adds one more dependency (`nodemailer`) and related configuration variables.
- Introduces startup-time listener registration that must remain idempotent.

## Files created/modified

- `apps/website/app/lib/events.server.ts`
- `apps/website/app/lib/events.server.test.ts`
- `apps/website/app/lib/email/admin-notifications.server.ts`
- `apps/website/app/lib/email/admin-notifications.server.test.ts`
- `apps/website/app/lib/email/initialize-email-events.server.ts`
- `apps/website/app/lib/email/initialize-email-events.server.test.ts`
- `apps/website/app/lib/auth.server.ts`
- `apps/website/app/lib/auth.server.test.ts`
- `apps/website/app/entry.server.tsx`
- `.env.example`
- `README.md`

## References

- [Nodemailer documentation](https://nodemailer.com/)
- [Brevo SMTP relay documentation](https://developers.brevo.com/docs/send-a-transactional-email)
