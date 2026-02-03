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
import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import { LuTriangleAlert } from "react-icons/lu";
import { AiProviderEnum } from "~/lib/ai-providers";

type AiTranslationConfigDialogProps = {
  isOpen: boolean;
  selectedProvider: AiProviderEnum | null;
  onOpenChange: (open: boolean) => void;
  onProviderChange: (provider: AiProviderEnum | null) => void;
  providerLabel: string;
};

export function AiTranslationConfigDialog({
  isOpen,
  selectedProvider,
  onOpenChange,
  onProviderChange,
  providerLabel,
}: AiTranslationConfigDialogProps) {
  const { t } = useTranslation();

  const handleClose = () => {
    onOpenChange(false);
    onProviderChange(null);
  };

  return (
    <DialogRoot
      lazyMount
      open={isOpen}
      onOpenChange={(e) => {
        onOpenChange(e.open);
        if (!e.open) onProviderChange(null);
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
                      placeholder={t("settings.ai.apiKeyPlaceholder")}
                      required
                    />
                    <Text fontSize="xs" color="gray.600" mt={1}>
                      {selectedProvider === AiProviderEnum.OPENAI && (
                        // TODO use translation switch like in ~lib/ai-providers.ts
                        <>
                          {t("settings.ai.getApiKeyOn")}{" "}
                          <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "underline" }}
                          >
                            platform.openai.com
                          </a>
                        </>
                      )}
                      {selectedProvider === AiProviderEnum.GEMINI && (
                        <>
                          {t("settings.ai.getApiKeyOn")}{" "}
                          <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "underline" }}
                          >
                            aistudio.google.com
                          </a>
                        </>
                      )}
                    </Text>
                  </Box>
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
