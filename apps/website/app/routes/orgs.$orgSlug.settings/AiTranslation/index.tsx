import { Box, Heading, Text, HStack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useActionData } from "react-router";
import { LuSparkles } from "react-icons/lu";
import { AiProviderEnum, getAiProvider } from "~/lib/ai-providers";
import { AiTranslationProvidersList } from "./AiTranslationProvidersList";
import { AiTranslationConfigDialog } from "./AiTranslationConfigDialog";
import type { AiProviderActionData } from "..";
import type { OrganizationAiProvider } from "../../../../drizzle/schema";

type AiTranslationProps = {
  aiProviders: Array<
    Pick<OrganizationAiProvider, "provider" | "isActive" | "model">
  >;
};

export default function AiTranslation({ aiProviders }: AiTranslationProps) {
  const { t } = useTranslation();
  const actionData = useActionData<AiProviderActionData>();
  const [selectedProvider, setSelectedProvider] =
    useState<AiProviderEnum | null>(null);
  const [selectedProviderModel, setSelectedProviderModel] = useState<
    string | null
  >(null);
  const [isAlreadyConfigured, setIsAlreadyConfigured] = useState(false);
  const [processedActionData, setProcessedActionData] = useState<
    typeof actionData
  >(undefined);

  // Fermer la modale quand l'action réussit (pattern render-phase derived state)
  if (
    actionData !== processedActionData &&
    actionData?.success === true &&
    actionData.action === "save-ai-provider"
  ) {
    setProcessedActionData(actionData);
    setSelectedProvider(null);
    setSelectedProviderModel(null);
    setIsAlreadyConfigured(false);
  }

  const handleClose = () => {
    setSelectedProvider(null);
    setSelectedProviderModel(null);
    setIsAlreadyConfigured(false);
  };

  const handleConfigure = (provider: AiProviderEnum) => {
    const existingConfig = aiProviders.find((p) => p.provider === provider);
    setSelectedProvider(provider);
    setSelectedProviderModel(existingConfig?.model ?? null);
    setIsAlreadyConfigured(existingConfig !== undefined);
  };

  const isDialogOpen = selectedProvider !== null;

  const providerLabel = selectedProvider
    ? getAiProvider(selectedProvider).name
    : "AI"; // TODO translate

  return (
    <Box>
      <HStack mb={4}>
        <LuSparkles />
        <Heading as="h3" size="md">
          {t("settings.ai.title")}
        </Heading>
      </HStack>
      <Text color="fg.muted" mb={4}>
        {t("settings.ai.description")}
      </Text>

      {/* Liste des providers configurés */}
      <AiTranslationProvidersList
        aiProviders={aiProviders}
        onConfigure={handleConfigure}
      />

      {/* Modale de configuration d'un provider IA */}
      <AiTranslationConfigDialog
        isOpen={isDialogOpen}
        selectedProvider={selectedProvider}
        handleClose={handleClose}
        providerLabel={providerLabel}
        currentModel={selectedProviderModel}
        isAlreadyConfigured={isAlreadyConfigured}
      />
    </Box>
  );
}
