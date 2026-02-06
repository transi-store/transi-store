import { Box, Heading, Text, Button } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { LuPlus } from "react-icons/lu";
import { toaster } from "~/components/ui/toaster";
import { NewApiKeyAlert } from "./NewApiKeyAlert";
import { ApiKeysList } from "./ApiKeysList";
import { ApiKeyCreationDialog } from "./ApiKeyCreationDialog";
import { ApiKeyDocumentation } from "./ApiKeyDocumentation";
import type { ApiKey } from "../../../../drizzle/schema";

type ApiKeysProps = {
  apiKeys: Array<ApiKey>;
  newKeyValue?: string;
  organizationSlug: string;
  origin: string;
};

export default function ApiKeys({
  apiKeys,
  newKeyValue,
  organizationSlug,
  origin,
}: ApiKeysProps) {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // TODO extract this "copy to clipboard" logic into a reusable hook
  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toaster.success({
        title: t("settings.apiKeys.copied.title"),
        description: t("settings.apiKeys.copied.description"),
        duration: 3000,
      });
    } catch (error) {
      toaster.error({
        title: t("settings.apiKeys.copyError.title"),
        description: t("settings.apiKeys.copyError.description"),
        duration: 3000,
      });
    }
  };

  // Fermer la modale après création réussie
  useEffect(() => {
    if (newKeyValue) {
      setIsDialogOpen(false);
    }
  }, [newKeyValue]);

  return (
    <Box>
      <Heading as="h3" size="md" mb={4}>
        {t("settings.apiKeys.title")}
      </Heading>
      <Text color="fg.muted" mb={4}>
        {t("settings.apiKeys.description")}
      </Text>

      {/* Affichage de la clé nouvellement créée */}
      {newKeyValue && (
        <NewApiKeyAlert keyValue={newKeyValue} onCopyKey={handleCopyKey} />
      )}

      {/* Liste des clés existantes */}
      <ApiKeysList
        apiKeys={apiKeys}
        newKeyValue={newKeyValue}
        onCopyKey={handleCopyKey}
      />

      {/* Bouton pour ajouter une clé */}
      <Button
        onClick={() => setIsDialogOpen(true)}
        colorPalette="brand"
        size="sm"
        variant="outline"
        mb={6}
      >
        <LuPlus /> {t("settings.apiKeys.addKey")}
      </Button>

      {/* Modale de création de clé d'API */}
      <ApiKeyCreationDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      {/* Documentation d'utilisation */}
      <ApiKeyDocumentation
        organizationSlug={organizationSlug}
        origin={origin}
      />
    </Box>
  );
}
