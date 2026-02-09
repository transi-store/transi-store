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
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
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
  deleteTranslation,
  getTranslationKeyByName,
} from "~/lib/translation-keys.server";
import { getActiveAiProvider } from "~/lib/ai-providers.server";
import { IcuEditorClient } from "~/components/icu-editor";
import {
  getRedirectUrlFromRequest,
  getRedirectUrlFromFormData,
} from "~/lib/routes-helpers";
import { toaster } from "~/components/ui/toaster";
import type { TranslationSuggestion } from "~/lib/ai-translation.server";
import { getInstance } from "~/middleware/i18next";
import { AiProviderEnum, getAiProvider } from "~/lib/ai-providers";
import {
  TranslationKeyModal,
  TRANSLATIONS_KEY_MODEL_MODE,
} from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationKeyModal";

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

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
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

    if (!keyName || typeof keyName !== "string") {
      return {
        error: i18next.t("keys.new.errors.nameRequired"),
        action,
      };
    }

    // Vérifier que la clé n'existe pas déjà
    const existing = await getTranslationKeyByName(project.id, keyName);
    if (existing && existing.id !== key.id) {
      return {
        error: i18next.t("keys.new.errors.alreadyExists", { keyName }),
        action,
      };
    }

    await updateTranslationKey({
      keyId: key.id,
      keyName,
      description: typeof description === "string" ? description : undefined,
    });

    return { success: true };
  }

  if (action === "saveTranslation") {
    const locale = formData.get("locale");
    const value = formData.get("value");

    if (locale && typeof locale === "string") {
      if (value && typeof value === "string" && value.trim()) {
        // Save the translation
        await upsertTranslation({
          keyId: key.id,
          locale: locale,
          value: value.trim(),
        });
      } else {
        // Delete the translation if the value is empty
        await deleteTranslation(key.id, locale);
      }
    }

    return { success: true };
  }

  return { error: i18next.t("keys.errors.unknownAction") };
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
  const { t } = useTranslation();
  const isSubmitting = navigation.state === "submitting";
  const [isEditKeyModalOpen, setIsEditKeyModalOpen] = useState(false);

  // Fetcher for auto-saving translations
  const saveFetcher = useFetcher();

  // Track original values to detect changes
  const originalValuesRef = useRef<Record<string, string>>({});

  // Close modal after successful edit
  useEffect(() => {
    if (actionData?.success && navigation.state === "idle") {
      setIsEditKeyModalOpen(false);
    }
  }, [actionData, navigation.state]);

  // État pour la modale de traduction IA
  const [aiDialogLocale, setAiDialogLocale] = useState<string | null>(null);
  const aiFetcher = useFetcher<{
    suggestions?: Array<TranslationSuggestion>;
    provider?: AiProviderEnum;
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

  // Initialize original values ref
  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const lang of languages) {
      initial[lang.locale] = translationMap.get(lang.locale) || "";
    }
    originalValuesRef.current = initial;
  }, [languages, translationMap]);

  const handleTranslationChange = (locale: string, value: string) => {
    setTranslationValues((prev) => ({ ...prev, [locale]: value }));
  };

  const handleTranslationBlur = (locale: string) => {
    const value = translationValues[locale];
    const originalValue = originalValuesRef.current[locale];

    // Only save if the value has changed
    if (value !== originalValue) {
      // Update the reference immediately after submitting
      // This way, we avoid duplicate saves if the user blurs multiple times
      originalValuesRef.current[locale] = value;

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

      // Show toast immediately after submitting
      toaster.success({
        title: t("common.saveInProgress"),
        description: (
          <VStack align="start" gap={1}>
            <Text>
              <strong>{t("key.save.key")} </strong>
              {key.keyName}
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
    }
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

      // save the value
      saveFetcher.submit(
        {
          _action: "saveTranslation",
          locale: aiDialogLocale,
          value: text,
        },
        {
          method: "POST",
        },
      );
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
                aria-label={t("keys.edit.aria")}
              >
                <LuPencil />
              </IconButton>
            </HStack>
            <Text color="fg.muted" mt={2}>
              {t("keys.projectLabel")}: {project.name}
            </Text>
            {key.description && (
              <Text fontSize="sm" color="fg.subtle" mt={2}>
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
              <LuTrash2 /> {t("keys.delete")}
            </Button>
          </Form>
        </HStack>

        {actionData?.error && actionData?.action !== "editKey" && (
          <Box p={4} bg="red.subtle" color="red.fg" borderRadius="md">
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
                {t("translations.title")}
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
                                <LuSparkles /> {t("keys.translateWithAI")}
                              </Button>
                            )}

                            <Badge colorPalette="brand" size="sm">
                              {t("translations.badgeDefault")}
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
                          placeholder={t("keys.translation.placeholder", {
                            locale: lang.locale,
                          })}
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
                                <LuSparkles /> {t("keys.translateWithAI")}
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
                <Link to={redirectUrl}>{t("project.back")}</Link>
              </Button>
            </Box>
          </VStack>
        )}

        {/* Modale d'édition de la clé */}
        <TranslationKeyModal
          isOpen={isEditKeyModalOpen}
          onOpenChange={setIsEditKeyModalOpen}
          mode={TRANSLATIONS_KEY_MODEL_MODE.EDIT}
          defaultValues={{
            keyName: key.keyName,
            description: key.description || "",
          }}
          error={
            actionData?.error && actionData?.action === "editKey"
              ? actionData.error
              : undefined
          }
          isSubmitting={isSubmitting}
        />

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
                      <Text>
                        {t("keys.translateWithAI.suggestionsTitle")}
                        Suggestions de traduction
                      </Text>
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
                      <Text color="fg.muted">
                        {t("keys.translateWithAI.generating")}
                      </Text>
                    </VStack>
                  ) : aiFetcher.data?.error ? (
                    <Box p={4} bg="red.subtle" borderRadius="md">
                      <Text color="red.fg">{aiFetcher.data.error}</Text>
                    </Box>
                  ) : aiFetcher.data?.suggestions ? (
                    <VStack align="stretch" gap={3}>
                      {aiFetcher.data.provider && (
                        <Text fontSize="xs" color="fg.subtle">
                          {t("keys.translateWithAI.generatedBy", {
                            provider: getAiProvider(aiFetcher.data.provider)
                              .name,
                          })}
                        </Text>
                      )}
                      {aiFetcher.data.suggestions.map((suggestion, index) => (
                        <Box
                          key={index}
                          p={4}
                          borderWidth={1}
                          borderRadius="md"
                          _hover={{ bg: "bg.muted", cursor: "pointer" }}
                          onClick={() =>
                            handleSelectSuggestion(suggestion.text)
                          }
                        >
                          <Text fontFamily="mono" fontSize="sm">
                            {suggestion.text}
                          </Text>
                          {suggestion.confidence && (
                            <Text fontSize="xs" color="fg.subtle" mt={1}>
                              {t("keys.translateWithAI.confidence")}
                              {Math.round(suggestion.confidence * 100)}%
                            </Text>
                          )}
                          {suggestion.notes && (
                            <Box mt={2} p={2} bg="bg.subtle" borderRadius="sm">
                              <Text fontSize="xs" color="fg.muted">
                                {suggestion.notes}
                              </Text>
                            </Box>
                          )}
                        </Box>
                      ))}
                      <Text fontSize="xs" color="fg.subtle" mt={2}>
                        {t("keys.translateWithAI.clickOnSuggestion")}
                      </Text>
                    </VStack>
                  ) : null}
                </DialogBody>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAiDialogLocale(null)}
                  >
                    {t("common.close")}
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
