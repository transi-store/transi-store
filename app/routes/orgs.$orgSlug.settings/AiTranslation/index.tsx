import { Box, Heading, Text, HStack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { LuSparkles } from "react-icons/lu";
import { AiProviderEnum, getAiProvider } from "~/lib/ai-providers";
import { AiTranslationProvidersList } from "./AiTranslationProvidersList";
import { AiTranslationConfigDialog } from "./AiTranslationConfigDialog";
import type { OrganizationAiProvider } from "../../../../drizzle/schema";

type AiTranslationProps = {
  aiProviders: Array<Pick<OrganizationAiProvider, "provider" | "isActive" | "model">>;
};

export default function AiTranslation({ aiProviders }: AiTranslationProps) {
  const { t } = useTranslation();
  const [selectedProvider, setSelectedProvider] =
    useState<AiProviderEnum | null>(null);
  const [selectedProviderModel, setSelectedProviderModel] = useState<
    string | null
  >(null);

  const handleConfigure = (provider: AiProviderEnum) => {
    const existingConfig = aiProviders.find((p) => p.provider === provider);
    setSelectedProvider(provider);
    setSelectedProviderModel(existingConfig?.model ?? null);
  };

  const handleClose = () => {
    setSelectedProvider(null);
    setSelectedProviderModel(null);
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
      />
    </Box>
  );
}
