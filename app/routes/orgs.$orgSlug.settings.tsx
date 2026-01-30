import {
  Heading,
  VStack,
  Button,
  Box,
  Text,
  Input,
  IconButton,
  Alert,
  Code,
  HStack,
  Badge,
} from "@chakra-ui/react";
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
import { useLoaderData, Form, useActionData } from "react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  LuPlus,
  LuTrash2,
  LuCopy,
  LuTriangleAlert,
  LuSparkles,
  LuCheck,
} from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.settings";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import {
  getOrganizationApiKeys,
  createApiKey,
  deleteApiKey,
} from "~/lib/api-keys.server";
import {
  getOrganizationAiProviders,
  saveAiProvider,
  setActiveAiProvider,
  deleteAiProvider,
} from "~/lib/ai-providers.server";
import { AI_PROVIDERS, type AiProvider } from "~/lib/ai-providers";
import { redirect } from "react-router";
import { toaster } from "~/components/ui/toaster";
import { getOrigin } from "~/lib/origin.server";
import { getInstance } from "~/middleware/i18next";

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create-api-key") {
    const name = formData.get("name") as string | null;

    const { keyValue } = await createApiKey({
      organizationId: organization.id,
      name: name || undefined,
      createdBy: user.userId,
    });

    // Retourner la clé nouvellement créée pour l'afficher à l'utilisateur
    return { success: true, keyValue, action: "create" };
  }

  if (intent === "delete-api-key") {
    const keyId = parseInt(formData.get("keyId") as string, 10);

    await deleteApiKey(keyId, organization.id);

    return redirect(`/orgs/${params.orgSlug}/settings`);
  }

  if (intent === "save-ai-provider") {
    const provider = formData.get("provider") as AiProvider;
    const apiKey = formData.get("apiKey") as string;

    if (!provider || !apiKey) {
      return {
        success: false,
        error: i18next.t("settings.errors.providerApiRequired"),
      };
    }

    await saveAiProvider({
      organizationId: organization.id,
      provider,
      apiKey,
    });

    return { success: true, action: "save-ai-provider", provider };
  }

  if (intent === "activate-ai-provider") {
    const provider = formData.get("provider") as AiProvider;

    await setActiveAiProvider(organization.id, provider);

    return redirect(`/orgs/${params.orgSlug}/settings`);
  }

  if (intent === "delete-ai-provider") {
    const provider = formData.get("provider") as AiProvider;

    await deleteAiProvider(organization.id, provider);

    return redirect(`/orgs/${params.orgSlug}/settings`);
  }

  return { success: false, error: "Invalid intent" };
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  // Récupérer les clés d'API de l'organisation
  const apiKeys = await getOrganizationApiKeys(organization.id);

  // Récupérer les providers IA configurés
  const aiProviders = await getOrganizationAiProviders(organization.id);

  return { organization, apiKeys, aiProviders, origin: getOrigin(request) };
}

export default function OrganizationSettings() {
  const { t } = useTranslation();
  const { organization, apiKeys, aiProviders, origin } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [selectedAiProvider, setSelectedAiProvider] =
    useState<AiProvider | null>(null);

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
    if (actionData?.action === "create" && actionData.success) {
      setIsDialogOpen(false);
    }
    if (actionData?.action === "save-ai-provider" && actionData.success) {
      setIsAiDialogOpen(false);
      setSelectedAiProvider(null);
    }
  }, [actionData]);

  return (
    <Box pt={6}>
      <Heading as="h2" size="lg" mb={4}>
        {t("settings.title")}
      </Heading>

      <VStack align="stretch" gap={6}>
        {/* Section Clés d'API */}
        <Box>
          <Heading as="h3" size="md" mb={4}>
            {t("settings.apiKeys.title")}
          </Heading>
          <Text color="gray.600" mb={4}>
            {t("settings.apiKeys.description")}
          </Text>

          {/* Affichage de la clé nouvellement créée */}
          {actionData?.action === "create" && actionData.keyValue && (
            <Alert.Root status="success" mb={4}>
              <Alert.Indicator>
                <LuTriangleAlert />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>{t("settings.apiKeys.createdTitle")}</Alert.Title>
                <Alert.Description>
                  <VStack align="stretch" gap={2} mt={2}>
                    <Text fontSize="sm">{t("settings.apiKeys.copyNow")}</Text>
                    <HStack>
                      <Code
                        p={2}
                        borderRadius="md"
                        fontSize="sm"
                        flex={1}
                        wordBreak="break-all"
                      >
                        {actionData.keyValue}
                      </Code>
                      <Button
                        size="sm"
                        onClick={() => handleCopyKey(actionData.keyValue!)}
                        colorPalette="gray"
                      >
                        <LuCopy /> {t("settings.copy")}
                      </Button>
                    </HStack>
                  </VStack>
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          {/* Liste des clés existantes */}
          {apiKeys.length === 0 ? (
            <Box
              p={6}
              textAlign="center"
              borderWidth={1}
              borderRadius="lg"
              mb={4}
            >
              <Text color="gray.600" mb={3}>
                {t("settings.apiKeys.none")}
              </Text>
            </Box>
          ) : (
            <VStack align="stretch" gap={2}>
              {apiKeys.map((key) => (
                <Box key={key.id} p={4} borderWidth={1} borderRadius="md">
                  <HStack justify="space-between">
                    <Box flex={1}>
                      <Text fontWeight="medium">
                        {key.name || t("settings.apiKeys.unnamedKey")}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {t("settings.apiKeys.createdOn")}{" "}
                        {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt && (
                          <>
                            {" • "}
                            {t("settings.apiKeys.lastUsed")}{" "}
                            {new Date(key.lastUsedAt).toLocaleDateString()}
                          </>
                        )}
                      </Text>
                    </Box>
                    <Form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="delete-api-key"
                      />
                      <input type="hidden" name="keyId" value={key.id} />
                      <IconButton
                        type="submit"
                        variant="ghost"
                        colorPalette="red"
                        size="sm"
                        aria-label={t("settings.apiKeys.deleteAria")}
                        title={t("settings.apiKeys.deleteTitle")}
                      >
                        <LuTrash2 />
                      </IconButton>
                    </Form>
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}

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
          <DialogRoot
            open={isDialogOpen}
            onOpenChange={(e) => setIsDialogOpen(e.open)}
          >
            <Portal>
              <DialogBackdrop />
              <DialogPositioner>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {t("settings.apiKeys.createTitle")}
                    </DialogTitle>
                  </DialogHeader>
                  <DialogCloseTrigger />
                  <Form method="post">
                    <input type="hidden" name="intent" value="create-api-key" />
                    <DialogBody pb={6}>
                      <VStack align="stretch" gap={4}>
                        <Box>
                          <Text fontSize="sm" fontWeight="medium" mb={2}>
                            {t("settings.apiKeys.nameLabel")}
                          </Text>
                          <Input
                            name="name"
                            placeholder={t("settings.apiKeys.namePlaceholder")}
                            maxLength={255}
                          />
                          <Text fontSize="xs" color="gray.600" mt={1}>
                            {t("settings.apiKeys.nameHelp")}
                          </Text>
                        </Box>
                      </VStack>
                    </DialogBody>
                    <DialogFooter gap={3}>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        {t("settings.cancel")}
                      </Button>
                      <Button type="submit" colorPalette="brand">
                        <LuPlus /> {t("settings.create")}
                      </Button>
                    </DialogFooter>
                  </Form>
                </DialogContent>
              </DialogPositioner>
            </Portal>
          </DialogRoot>

          {/* Documentation d'utilisation */}
          <Box mt={6} p={4} borderWidth={1} borderRadius="lg" bg="gray.50">
            <Heading as="h4" size="sm" mb={2}>
              {t("settings.apiKeys.howToUse")}
            </Heading>
            <Text fontSize="sm" color="gray.700" mb={2}>
              {t("settings.apiKeys.howToUseDescription")}
              <Code>Authorization: Bearer YOUR_API_KEY</Code>{" "}
              {t("settings.apiKeys.howToUseDescription2")}
            </Text>
            <Code
              display="block"
              p={3}
              borderRadius="md"
              fontSize="xs"
              whiteSpace="pre-wrap"
              wordBreak="break-all"
            >
              {`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${origin}/api/orgs/${organization.slug}/projects/PROJECT_SLUG/export?format=json&locale=fr"`}
            </Code>
          </Box>
        </Box>

        {/* Section Configuration IA */}
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
          <VStack align="stretch" gap={2} mb={4}>
            {AI_PROVIDERS.map((providerInfo) => {
              const configured = aiProviders.find(
                (p) => p.provider === providerInfo.value,
              );

              return (
                <Box
                  key={providerInfo.value}
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
                          <Badge colorPalette="green">
                            {t("settings.ai.configured")}
                          </Badge>
                          {configured.isActive && (
                            <Badge colorPalette="blue">
                              {t("settings.ai.active")}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <Badge colorPalette="gray">
                          {t("settings.ai.notConfigured")}
                        </Badge>
                      )}
                    </HStack>
                    <HStack gap={2}>
                      {configured && !configured.isActive && (
                        <Form method="post">
                          <input
                            type="hidden"
                            name="intent"
                            value="activate-ai-provider"
                          />
                          <input
                            type="hidden"
                            name="provider"
                            value={providerInfo.value}
                          />
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
                        onClick={() => {
                          setSelectedAiProvider(providerInfo.value);
                          setIsAiDialogOpen(true);
                        }}
                      >
                        {configured
                          ? t("settings.ai.edit")
                          : t("settings.ai.configure")}
                      </Button>
                      {configured && (
                        <Form method="post">
                          <input
                            type="hidden"
                            name="intent"
                            value="delete-ai-provider"
                          />
                          <input
                            type="hidden"
                            name="provider"
                            value={providerInfo.value}
                          />
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
            })}
          </VStack>

          {/* Modale de configuration d'un provider IA */}
          <DialogRoot
            lazyMount
            open={isAiDialogOpen}
            onOpenChange={(e) => {
              setIsAiDialogOpen(e.open);
              if (!e.open) setSelectedAiProvider(null);
            }}
          >
            <Portal>
              <DialogBackdrop />
              <DialogPositioner>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {t("settings.ai.configureTitle", {
                        provider:
                          AI_PROVIDERS.find(
                            (p) => p.value === selectedAiProvider,
                          )?.label || "IA",
                      })}
                    </DialogTitle>
                  </DialogHeader>
                  <DialogCloseTrigger />
                  <Form method="post">
                    <input
                      type="hidden"
                      name="intent"
                      value="save-ai-provider"
                    />
                    <input
                      type="hidden"
                      name="provider"
                      value={selectedAiProvider || ""}
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
                            {selectedAiProvider === "openai" && (
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
                            {selectedAiProvider === "gemini" && (
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
                              <Text fontSize="sm">
                                {t("settings.ai.warning")}
                              </Text>
                            </Alert.Description>
                          </Alert.Content>
                        </Alert.Root>
                      </VStack>
                    </DialogBody>
                    <DialogFooter gap={3}>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAiDialogOpen(false);
                          setSelectedAiProvider(null);
                        }}
                      >
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
        </Box>
      </VStack>
    </Box>
  );
}
