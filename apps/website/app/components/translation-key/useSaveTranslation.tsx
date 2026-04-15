import { useCallback } from "react";
import { useFetcher } from "react-router";
import { useTranslation } from "react-i18next";
import { VStack, Text } from "@chakra-ui/react";
import { toaster } from "~/components/ui/toaster";

type UseSaveTranslationParams = {
  actionUrl?: string;
  keyName: string;
};

type SubmitSave = (locale: string, value: string, isFuzzy: boolean) => void;

type ReturnType = {
  submitSave: SubmitSave;
  isSaving: boolean;
};

export function useSaveTranslation({
  actionUrl,
  keyName,
}: UseSaveTranslationParams): ReturnType {
  const { t } = useTranslation();
  const fetcher = useFetcher();

  const submitSave: SubmitSave = useCallback(
    (locale, value, isFuzzy) => {
      fetcher.submit(
        {
          _action: "saveTranslation",
          locale,
          value: value || "",
          isFuzzy: String(isFuzzy),
        },
        {
          method: "POST",
          ...(actionUrl ? { action: actionUrl } : {}),
        },
      );

      toaster.success({
        title: t("common.saveInProgress"),
        description: (
          <VStack align="start" gap={1}>
            <Text>
              <strong>{t("key.save.key")} </strong>
              {keyName}
            </Text>
            <Text>
              <strong>{t("key.save.locale")}</strong>
              {locale}
            </Text>
            <Text>
              <strong>{t("key.save.value")}</strong>{" "}
              {value || t("key.save.empty")}
            </Text>
          </VStack>
        ),
      });
    },
    [fetcher, actionUrl, keyName, t],
  );

  return { submitSave, isSaving: fetcher.state !== "idle" };
}
