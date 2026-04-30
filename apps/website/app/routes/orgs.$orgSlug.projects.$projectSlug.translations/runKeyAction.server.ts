import { redirect } from "react-router";
import type { i18n } from "i18next";
import {
  createTranslationKey,
  duplicateTranslationKey,
  getTranslationKeyByName,
} from "~/lib/translation-keys.server";
import { getKeyUrl } from "~/lib/routes-helpers";
import { KeyAction } from "~/components/translation-key/KeyAction";

export type KeyActionData =
  | {
      error: string;
      action: KeyAction;
    }
  | {
      success: true;
      keyId: number;
      keyName: string;
      search: string;
      action: KeyAction;
    };

export function isKeyAction(value: unknown): value is KeyAction {
  return (
    typeof value === "string" &&
    // @ts-expect-error the purpose of this function is to check if a string is a valid KeyActionValue, so we need to ignore the type error here
    Object.values(KeyAction).includes(value)
  );
}

export async function runKeyAction(args: {
  action: KeyAction;
  formData: FormData;
  projectId: number;
  orgSlug: string;
  projectSlug: string;
  i18next: i18n;
}): Promise<Response | KeyActionData> {
  const { action, formData, projectId, orgSlug, projectSlug, i18next } = args;

  if (action === KeyAction.Duplicate) {
    const keyId = formData.get("keyId");

    if (!keyId || typeof keyId !== "string") {
      throw new Response("Key ID is required", { status: 400 });
    }

    const parsedKeyId = parseInt(keyId, 10);

    if (isNaN(parsedKeyId)) {
      throw new Response("Invalid Key ID", { status: 400 });
    }

    const newKeyId = await duplicateTranslationKey(parsedKeyId);

    return redirect(getKeyUrl(orgSlug, projectSlug, newKeyId));
  }

  // KeyAction.Create
  const keyName = formData.get("keyName");
  const description = formData.get("description");
  const fileIdRaw = formData.get("fileId");

  if (!keyName || typeof keyName !== "string") {
    return {
      error: i18next.t("keys.new.errors.nameRequired"),
      action: KeyAction.Create,
    };
  }

  if (!fileIdRaw || typeof fileIdRaw !== "string") {
    return {
      error: i18next.t("files.errors.missingFileId"),
      action: KeyAction.Create,
    };
  }
  const fileId = parseInt(fileIdRaw, 10);
  if (isNaN(fileId)) {
    return {
      error: i18next.t("files.errors.invalidFileId", { fileId: fileIdRaw }),
      action: KeyAction.Create,
    };
  }

  const existing = await getTranslationKeyByName(projectId, keyName, fileId);
  if (existing) {
    return {
      error: i18next.t("keys.new.errors.alreadyExists", { keyName }),
      action: KeyAction.Create,
    };
  }

  const newKeyId = await createTranslationKey({
    projectId,
    keyName,
    description:
      description && typeof description === "string" ? description : undefined,
    fileId,
  });

  return {
    success: true,
    keyId: newKeyId,
    keyName,
    search: keyName,
    action: KeyAction.Create,
  };
}
