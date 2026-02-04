import { Box, Heading, Text, HStack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { LuSparkles } from "react-icons/lu";
import { AiProviderEnum, getAiProvider } from "~/lib/ai-providers";
import { AiTranslationProvidersList } from "./AiTranslationProvidersList";
import { AiTranslationConfigDialog } from "./AiTranslationConfigDialog";
import type { OrganizationAiProvider } from "../../../../drizzle/schema";

type AiTranslationProps = {
  aiProviders: Array<Pick<OrganizationAiProvider, "provider" | "isActive">>;
  actionSuccess?: boolean;
};

export default function AiTranslation({
  aiProviders,
  actionSuccess,
}: AiTranslationProps) {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<AiProviderEnum | null>(null);

  const handleConfigure = (provider: AiProviderEnum) => {
    setSelectedProvider(provider);
    setIsDialogOpen(true);
  };

  // Fermer la modale après sauvegarde réussie
  useEffect(() => {
    if (actionSuccess) {
      setIsDialogOpen(false);
      setSelectedProvider(null);
    }
  }, [actionSuccess]);

  const providerLabel = selectedProvider
    ? getAiProvider(selectedProvider).name
    : "IA";

  return (
    <Box>
      <HStack mb={4}>
        <LuSparkles />
        <Heading as="h3" size="md">
          {t("settings.ai.title")}
        </Heading>
      </HStack>
      <Text color="gray.600" mb={4}>
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
        onOpenChange={setIsDialogOpen}
        onProviderChange={setSelectedProvider}
        providerLabel={providerLabel}
      />
    </Box>
  );
}
