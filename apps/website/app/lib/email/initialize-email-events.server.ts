import { onAppEvent } from "../events.server";
import { sendAdminUserJoinedPlatformEmail } from "./admin-notifications.server";

const EMAIL_EVENT_HANDLERS_INITIALIZED =
  "__TRANSI_STORE_EMAIL_EVENT_HANDLERS_INITIALIZED__";

type GlobalWithEmailEventsFlag = typeof globalThis & {
  [EMAIL_EVENT_HANDLERS_INITIALIZED]?: boolean;
};

enum EmailListenerEventName {
  UserJoinedPlatform = "user.joined_platform",
}

export function initializeEmailEventHandlers(): void {
  const globalState = globalThis as GlobalWithEmailEventsFlag;
  if (globalState[EMAIL_EVENT_HANDLERS_INITIALIZED]) {
    return;
  }

  globalState[EMAIL_EVENT_HANDLERS_INITIALIZED] = true;

  onAppEvent(EmailListenerEventName.UserJoinedPlatform, async (payload) => {
    await sendAdminUserJoinedPlatformEmail(payload);
  });
}

export function resetEmailEventHandlersForTests(): void {
  const globalState = globalThis as GlobalWithEmailEventsFlag;
  delete globalState[EMAIL_EVENT_HANDLERS_INITIALIZED];
}
