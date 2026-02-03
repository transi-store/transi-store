import { Box, Text, HStack, Badge, Button, IconButton } from "@chakra-ui/react";
import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import { LuCheck, LuTrash2 } from "react-icons/lu";
import type { AiProviderEnum } from "~/lib/ai-providers";
import type { OrganizationAiProvider } from "../../../../drizzle/schema";

type ProviderInfo = {
  label: string;
  value: AiProviderEnum;
};

type AiTranslationProviderItemProps = {
  providerInfo: ProviderInfo;
  configured?: Pick<OrganizationAiProvider, "provider" | "isActive">;
  onConfigure: (provider: AiProviderEnum) => void;
};

export function AiTranslationProviderItem({
  providerInfo,
  configured,
  onConfigure,
}: AiTranslationProviderItemProps) {
  const { t } = useTranslation();

  return (
    <Box
      p={4}
      borderWidth={1}
      borderRadius="md"
      bg={configured?.isActive ? "green.50" : undefined}
    >
      <HStack justify="space-between">
        <HStack flex={1}>
          <Text fontWeight="medium">{providerInfo.label}</Text>
          {configured ? (
            <>
              <Badge colorPalette="green">{t("settings.ai.configured")}</Badge>
              {configured.isActive && (
                <Badge colorPalette="blue">{t("settings.ai.active")}</Badge>
              )}
            </>
          ) : (
            <Badge colorPalette="gray">{t("settings.ai.notConfigured")}</Badge>
          )}
        </HStack>
        <HStack gap={2}>
          {configured && !configured.isActive && (
            <Form method="post">
              <input type="hidden" name="intent" value="activate-ai-provider" />
              <input type="hidden" name="provider" value={providerInfo.value} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                colorPalette="green"
              >
                <LuCheck /> {t("settings.ai.activate")}
              </Button>
            </Form>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onConfigure(providerInfo.value)}
          >
            {configured ? t("settings.ai.edit") : t("settings.ai.configure")}
          </Button>
          {configured && (
            <Form method="post">
              <input type="hidden" name="intent" value="delete-ai-provider" />
              <input type="hidden" name="provider" value={providerInfo.value} />
              <IconButton
                type="submit"
                variant="ghost"
                colorPalette="red"
                size="sm"
                aria-label={t("settings.ai.delete")}
                title={t("settings.ai.delete.title")}
              >
                <LuTrash2 />
              </IconButton>
            </Form>
          )}
        </HStack>
      </HStack>
    </Box>
  );
}
