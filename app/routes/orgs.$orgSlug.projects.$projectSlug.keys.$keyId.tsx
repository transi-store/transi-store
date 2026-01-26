import {
  Container,
  Heading,
  VStack,
  Button,
  Field,
  Box,
  HStack,
  Text,
  Badge,
  IconButton,
  SimpleGrid,
  GridItem,
  Spinner,
  Textarea,
  Input,
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
import {
  Form,
  useActionData,
  useNavigation,
  redirect,
  Link,
  useFetcher,
} from "react-router";
import { useState, useEffect } from "react";
import { LuPencil, LuTrash2, LuSparkles } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.keys.$keyId";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import {
  getTranslationKeyById,
  getTranslationsForKey,
  upsertTranslation,
  deleteTranslationKey,
  updateTranslationKey,
} from "~/lib/translation-keys.server";
import { getActiveAiProvider } from "~/lib/ai-providers.server";
import { IcuEditorClient } from "~/components/icu-editor";
import {
  getRedirectUrlFromRequest,
  getRedirectUrlFromFormData,
} from "~/lib/routes-helpers";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const key = await getTranslationKeyById(parseInt(params.keyId, 10));

  if (!key || key.projectId !== project.id) {
    throw new Response("Translation key not found", { status: 404 });
  }

  const languages = await getProjectLanguages(project.id);
  const translations = await getTranslationsForKey(key.id);

  // Vérifier si un provider IA est configuré
  const activeAiProvider = await getActiveAiProvider(organization.id);
  const hasAiProvider = activeAiProvider !== null;

  const redirectUrl = getRedirectUrlFromRequest(
    request,
    params.orgSlug,
    params.projectSlug,
  );

  return {
    organization,
    project,
    key,
    languages,
    translations,
    redirectUrl,
    hasAiProvider,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const key = await getTranslationKeyById(parseInt(params.keyId, 10));

  if (!key || key.projectId !== project.id) {
    throw new Response("Translation key not found", { status: 404 });
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "delete") {
    await deleteTranslationKey(key.id);

    const redirectUrl = getRedirectUrlFromFormData(
      formData,
      params.orgSlug,
      params.projectSlug,
    );

    return redirect(redirectUrl);
  }

  if (action === "editKey") {
    const keyName = formData.get("keyName");
    const description = formData.get("description");

    await updateTranslationKey({
      keyId: key.id,
      keyName: keyName && typeof keyName === "string" ? keyName : undefined,
      description:
        description && typeof description === "string"
          ? description
          : undefined,
    });

    return { success: true };
  }

  if (action === "saveTranslation") {
    const locale = formData.get("locale");
    const value = formData.get("value");

    if (locale && typeof locale === "string") {
      if (value && typeof value === "string" && value.trim()) {
        await upsertTranslation({
          keyId: key.id,
          locale: locale,
          value: value.trim(),
        });
      }
    }

    return { success: true };
  }

  return { error: "Action inconnue" };
}

export default function EditTranslationKey({
  loaderData,
}: Route.ComponentProps) {
  const {
    organization,
    project,
    key,
    languages,
    translations,
    redirectUrl,
    hasAiProvider,
  } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [isEditKeyModalOpen, setIsEditKeyModalOpen] = useState(false);

  // Fetcher for auto-saving translations
  const saveFetcher = useFetcher();

  // Close modal after successful edit
  useEffect(() => {
    if (actionData?.success && navigation.state === "idle") {
      setIsEditKeyModalOpen(false);
    }
  }, [actionData, navigation.state]);

  // État pour la modale de traduction IA
  const [aiDialogLocale, setAiDialogLocale] = useState<string | null>(null);
  const aiFetcher = useFetcher<{
    suggestions?: { text: string; confidence?: number }[];
    provider?: string;
    error?: string;
  }>();

  // Create a map of translations by locale for easier lookup
  const translationMap = new Map(translations.map((t) => [t.locale, t.value]));

  // State for translation values (for ICU editor)
  const [translationValues, setTranslationValues] = useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {};
    for (const lang of languages) {
      initial[lang.locale] = translationMap.get(lang.locale) || "";
    }
    return initial;
  });

  const handleTranslationChange = (locale: string, value: string) => {
    setTranslationValues((prev) => ({ ...prev, [locale]: value }));
  };

  const handleTranslationBlur = (locale: string) => {
    const value = translationValues[locale];
    saveFetcher.submit(
      {
        _action: "saveTranslation",
        locale,
        value: value || "",
      },
      {
        method: "POST",
      },
    );
  };

  const handleRequestAiTranslation = (locale: string) => {
    setAiDialogLocale(locale);
    aiFetcher.submit(
      {
        keyId: String(key.id),
        targetLocale: locale,
      },
      {
        method: "POST",
        action: `/api/orgs/${organization.slug}/projects/${project.slug}/translate`,
      },
    );
  };

  const handleSelectSuggestion = (text: string) => {
    if (aiDialogLocale) {
      handleTranslationChange(aiDialogLocale, text);
      setAiDialogLocale(null);
    }
  };

  return (
    <Container maxW="container.md" py={10}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" align="start">
          <Box flex={1}>
            <HStack gap={2} align="center">
              <Heading as="h1" size="2xl" fontFamily="mono">
                {key.keyName}
              </Heading>
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => setIsEditKeyModalOpen(true)}
                aria-label="Éditer la clé"
              >
                <LuPencil />
              </IconButton>
            </HStack>
            <Text color="gray.600" mt={2}>
              Projet : {project.name}
            </Text>
            {key.description && (
              <Text fontSize="sm" color="gray.500" mt={2}>
                {key.description}
              </Text>
            )}
          </Box>
          <Form method="post">
            <input type="hidden" name="_action" value="delete" />
            <input type="hidden" name="redirectUrl" value={redirectUrl} />
            <Button
              type="submit"
              colorPalette="red"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
            >
              <LuTrash2 /> Supprimer
            </Button>
          </Form>
        </HStack>

        {actionData?.error && (
          <Box p={4} bg="red.100" color="red.700" borderRadius="md">
            {actionData.error}
          </Box>
        )}

        {languages.length === 0 ? (
          <Box p={6} bg="yellow.50" borderRadius="md">
            <Text color="yellow.700" fontWeight="medium">
              Aucune langue configurée pour ce projet
            </Text>
            <Text color="yellow.600" mt={2}>
              Ajoutez des langues dans les paramètres du projet avant de créer
              des traductions.
            </Text>
            <Button asChild colorPalette="yellow" mt={4}>
              <Link to={`/orgs/${organization.slug}/projects/${project.slug}`}>
                Gérer les langues
              </Link>
            </Button>
          </Box>
        ) : (
          <VStack gap={4} align="stretch">
            <Box>
              <Heading as="h2" size="lg" mb={4}>
                Traductions
              </Heading>

              <SimpleGrid columns={2} gap={6}>
                {/* Langue par défaut en premier */}
                {languages
                  .filter((lang) => lang.isDefault)
                  .map((lang) => (
                    <GridItem key={lang.id}>
                      <Field.Root>
                        <Field.Label>
                          <HStack>
                            <Text>{lang.locale.toUpperCase()}</Text>
                            <Badge colorPalette="brand" size="sm">
                              Par défaut
                            </Badge>
                          </HStack>
                        </Field.Label>
                        <IcuEditorClient
                          name={`translation_${lang.locale}`}
                          value={translationValues[lang.locale] || ""}
                          onChange={(value) =>
                            handleTranslationChange(lang.locale, value)
                          }
                          onBlur={() => handleTranslationBlur(lang.locale)}
                          placeholder={`Traduction en ${lang.locale}...`}
                          disabled={isSubmitting}
                          locale={lang.locale}
                          showPreview={true}
                        />
                      </Field.Root>
                    </GridItem>
                  ))}

                {/* Autres langues */}
                {languages
                  .filter((lang) => !lang.isDefault)
                  .map((lang) => (
                    <GridItem key={lang.id}>
                      <Field.Root>
                        <Field.Label>
                          <HStack justify="space-between" w="100%">
                            <Text>{lang.locale.toUpperCase()}</Text>
                            {hasAiProvider && (
                              <Button
                                size="xs"
                                variant="ghost"
                                colorPalette="purple"
                                onClick={() =>
                                  handleRequestAiTranslation(lang.locale)
                                }
                                disabled={isSubmitting}
                              >
                                <LuSparkles /> Traduire avec IA
                              </Button>
                            )}
                          </HStack>
                        </Field.Label>
                        <IcuEditorClient
                          name={`translation_${lang.locale}`}
                          value={translationValues[lang.locale] || ""}
                          onChange={(value) =>
                            handleTranslationChange(lang.locale, value)
                          }
                          onBlur={() => handleTranslationBlur(lang.locale)}
                          placeholder={`Traduction en ${lang.locale}...`}
                          disabled={isSubmitting}
                          locale={lang.locale}
                          showPreview={true}
                        />
                      </Field.Root>
                    </GridItem>
                  ))}
              </SimpleGrid>
            </Box>

            <Box display="flex" gap={3} mt={6}>
              <Button asChild variant="outline" disabled={isSubmitting}>
                <Link to={redirectUrl}>Retour</Link>
              </Button>
            </Box>
          </VStack>
        )}

        {/* Modale d'édition de la clé */}
        <DialogRoot
          open={isEditKeyModalOpen}
          onOpenChange={(e) => setIsEditKeyModalOpen(e.open)}
        >
          <Portal>
            <DialogBackdrop />
            <DialogPositioner>
              <DialogContent>
                <Form method="post">
                  <input type="hidden" name="_action" value="editKey" />
                  <DialogHeader>
                    <DialogTitle>Modifier la clé de traduction</DialogTitle>
                  </DialogHeader>
                  <DialogCloseTrigger />
                  <DialogBody pb={6}>
                    <VStack gap={4} align="stretch">
                      <Field.Root>
                        <Field.Label>Clé de traduction</Field.Label>
                        <Input
                          name="keyName"
                          defaultValue={key.keyName}
                          required
                          fontFamily="monospace"
                        />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Description</Field.Label>
                        <Textarea
                          name="description"
                          placeholder="Description de cette clé..."
                          defaultValue={key.description || ""}
                          rows={3}
                        />
                      </Field.Root>
                    </VStack>
                  </DialogBody>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditKeyModalOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" colorPalette="brand">
                      Enregistrer
                    </Button>
                  </DialogFooter>
                </Form>
              </DialogContent>
            </DialogPositioner>
          </Portal>
        </DialogRoot>

        {/* Modale de suggestions IA */}
        <DialogRoot
          open={aiDialogLocale !== null}
          onOpenChange={(e) => {
            if (!e.open) setAiDialogLocale(null);
          }}
        >
          <Portal>
            <DialogBackdrop />
            <DialogPositioner>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    <HStack>
                      <LuSparkles />
                      <Text>Suggestions de traduction</Text>
                      {aiDialogLocale && (
                        <Badge colorPalette="purple">
                          {aiDialogLocale.toUpperCase()}
                        </Badge>
                      )}
                    </HStack>
                  </DialogTitle>
                </DialogHeader>
                <DialogCloseTrigger />
                <DialogBody pb={6}>
                  {aiFetcher.state === "submitting" ||
                  aiFetcher.state === "loading" ? (
                    <VStack py={8}>
                      <Spinner size="lg" />
                      <Text color="gray.600">
                        Génération des traductions en cours...
                      </Text>
                    </VStack>
                  ) : aiFetcher.data?.error ? (
                    <Box p={4} bg="red.50" borderRadius="md">
                      <Text color="red.700">{aiFetcher.data.error}</Text>
                    </Box>
                  ) : aiFetcher.data?.suggestions ? (
                    <VStack align="stretch" gap={3}>
                      {aiFetcher.data.provider && (
                        <Text fontSize="xs" color="gray.500">
                          Généré par{" "}
                          {aiFetcher.data.provider === "openai"
                            ? "OpenAI"
                            : "Google Gemini"}
                        </Text>
                      )}
                      {aiFetcher.data.suggestions.map((suggestion, index) => (
                        <Box
                          key={index}
                          p={4}
                          borderWidth={1}
                          borderRadius="md"
                          _hover={{ bg: "gray.50", cursor: "pointer" }}
                          onClick={() =>
                            handleSelectSuggestion(suggestion.text)
                          }
                        >
                          <Text fontFamily="mono" fontSize="sm">
                            {suggestion.text}
                          </Text>
                          {suggestion.confidence && (
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              Confiance:{" "}
                              {Math.round(suggestion.confidence * 100)}%
                            </Text>
                          )}
                        </Box>
                      ))}
                      <Text fontSize="xs" color="gray.500" mt={2}>
                        Cliquez sur une suggestion pour l'utiliser
                      </Text>
                    </VStack>
                  ) : null}
                </DialogBody>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAiDialogLocale(null)}
                  >
                    Fermer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </DialogPositioner>
          </Portal>
        </DialogRoot>
      </VStack>
    </Container>
  );
}
