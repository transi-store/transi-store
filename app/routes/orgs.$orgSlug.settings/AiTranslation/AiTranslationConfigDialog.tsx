import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  DialogBackdrop,
  DialogPositioner,
  Portal,
} from "@chakra-ui/react";
import { Box, Text, Input, Button, VStack, Alert } from "@chakra-ui/react";
import { NativeSelect } from "@chakra-ui/react/native-select";
import { Form, useActionData } from "react-router";
import { useTranslation } from "react-i18next";
import { LuTriangleAlert } from "react-icons/lu";
import { AiProviderEnum, getAiProvider } from "~/lib/ai-providers";
import { isErrorReturnType, type AiProviderActionData } from "..";

type AiTranslationConfigDialogProps = {
  isOpen: boolean;
  selectedProvider: AiProviderEnum | null;
  handleClose: () => void;
  providerLabel: string;
  currentModel: string | null;
  isAlreadyConfigured: boolean;
};

export function AiTranslationConfigDialog({
  isOpen,
  selectedProvider,
  handleClose,
  providerLabel,
  currentModel,
  isAlreadyConfigured,
}: AiTranslationConfigDialogProps) {
  const { t } = useTranslation();

  // TODO better types
  const actionData = useActionData<AiProviderActionData>();

  const aiProviderError =
    actionData && isErrorReturnType(actionData) ? actionData.error : undefined;

  const selectedProviderConfig = selectedProvider
    ? getAiProvider(selectedProvider)
    : null;

  const availableModels = selectedProviderConfig?.models ?? [];

  return (
    <DialogRoot
      lazyMount
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open) {
          handleClose();
        }
      }}
    >
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("settings.ai.configureTitle", {
                  provider: providerLabel,
                })}
              </DialogTitle>
            </DialogHeader>
            <DialogCloseTrigger />
            <Form method="post">
              <input type="hidden" name="intent" value="save-ai-provider" />
              <input
                type="hidden"
                name="provider"
                value={selectedProvider || ""}
              />
              <DialogBody pb={6}>
                <VStack align="stretch" gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      {t("settings.ai.apiKeyLabel")}
                    </Text>
                    <Input
                      name="apiKey"
                      type="password"
                      placeholder={
                        isAlreadyConfigured
                          ? t("settings.ai.apiKeyExistingPlaceholder")
                          : selectedProviderConfig?.apiKeyPlaceholder || ""
                      }
                      required={!isAlreadyConfigured}
                    />
                    <Text fontSize="xs" color="fg.muted" mt={1}>
                      {selectedProviderConfig && (
                        <>
                          {t("settings.ai.getApiKeyOn")}{" "}
                          <a
                            href={selectedProviderConfig.configureUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "underline" }}
                          >
                            {selectedProviderConfig.configureUrl}
                          </a>
                        </>
                      )}
                    </Text>
                  </Box>
                  {availableModels.length > 0 && (
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={2}>
                        {t("settings.ai.modelLabel")}
                      </Text>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          name="model"
                          defaultValue={
                            currentModel ?? availableModels[0].value
                          }
                        >
                          {availableModels.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </NativeSelect.Field>
                      </NativeSelect.Root>
                    </Box>
                  )}
                  <Alert.Root status="warning">
                    <Alert.Indicator>
                      <LuTriangleAlert />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Description>
                        <Text fontSize="sm">{t("settings.ai.warning")}</Text>
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>

                  {aiProviderError && (
                    <Alert.Root status="error">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{aiProviderError}</Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  )}
                </VStack>
              </DialogBody>
              <DialogFooter gap={3}>
                <Button variant="outline" onClick={handleClose}>
                  {t("settings.ai.cancel")}
                </Button>
                <Button type="submit" colorPalette="brand">
                  {t("settings.ai.save")}
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
