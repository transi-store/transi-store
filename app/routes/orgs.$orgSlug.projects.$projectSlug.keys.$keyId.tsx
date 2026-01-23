import {
  Container,
  Heading,
  VStack,
  Button,
  Input,
  Field,
  Box,
  Textarea,
  HStack,
  Text,
  Badge,
  IconButton,
} from "@chakra-ui/react";
import { Form, useActionData, useNavigation, redirect, Link } from "react-router";
import { useState } from "react";
import { LuPencil, LuPlus, LuSave, LuTrash2 } from "react-icons/lu";
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

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, params.orgSlug);

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const key = await getTranslationKeyById(params.keyId);

  if (!key || key.projectId !== project.id) {
    throw new Response("Translation key not found", { status: 404 });
  }

  const languages = await getProjectLanguages(project.id);
  const translations = await getTranslationsForKey(key.id);

  return { organization, project, key, languages, translations };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, params.orgSlug);

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const key = await getTranslationKeyById(params.keyId);

  if (!key || key.projectId !== project.id) {
    throw new Response("Translation key not found", { status: 404 });
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "delete") {
    await deleteTranslationKey(key.id);
    return redirect(
      `/orgs/${params.orgSlug}/projects/${params.projectSlug}/translations`
    );
  }

  if (action === "update") {
    const description = formData.get("description");

    await updateTranslationKey({
      keyId: key.id,
      description: description && typeof description === "string" ? description : undefined,
    });

    // Update translations
    const languages = await getProjectLanguages(project.id);

    for (const lang of languages) {
      const value = formData.get(`translation_${lang.locale}`);

      if (value && typeof value === "string" && value.trim()) {
        await upsertTranslation({
          keyId: key.id,
          locale: lang.locale,
          value: value.trim(),
        });
      }
    }

    return redirect(
      `/orgs/${params.orgSlug}/projects/${params.projectSlug}/translations`
    );
  }

  return { error: "Action inconnue" };
}

export default function EditTranslationKey({ loaderData }: Route.ComponentProps) {
  const { organization, project, key, languages, translations } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  // Create a map of translations by locale for easier lookup
  const translationMap = new Map(
    translations.map((t) => [t.locale, t.value])
  );

  return (
    <Container maxW="container.md" py={10}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" align="start">
          <Box flex={1}>
            <Heading as="h1" size="2xl" fontFamily="mono">
              {key.keyName}
            </Heading>
            <Text color="gray.600" mt={2}>
              Projet : {project.name}
            </Text>
            {key.description && !isEditingDescription && (
              <HStack mt={2} align="start" gap={1}>
                <Text fontSize="sm" color="gray.500" flex={1}>
                  {key.description}
                </Text>
                <IconButton
                  size="xs"
                  variant="ghost"
                  onClick={() => setIsEditingDescription(true)}
                  aria-label="Éditer la description"
                >
                  <LuPencil />
                </IconButton>
              </HStack>
            )}
            {!key.description && !isEditingDescription && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setIsEditingDescription(true)}
                mt={2}
              >
                <LuPlus /> Ajouter une description
              </Button>
            )}
          </Box>
          <Form method="post">
            <input type="hidden" name="_action" value="delete" />
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
              Ajoutez des langues dans les paramètres du projet avant de créer des
              traductions.
            </Text>
            <Button
              as={Link}
              to={`/orgs/${organization.slug}/projects/${project.slug}`}
              colorPalette="yellow"
              mt={4}
            >
              Gérer les langues
            </Button>
          </Box>
        ) : (
          <Form method="post">
            <input type="hidden" name="_action" value="update" />
            {!isEditingDescription && (
              <input type="hidden" name="description" value={key.description || ""} />
            )}

            <VStack gap={4} align="stretch">
              {isEditingDescription && (
                <Field.Root>
                  <Field.Label>Description</Field.Label>
                  <Textarea
                    name="description"
                    placeholder="Description de cette clé..."
                    defaultValue={key.description || ""}
                    disabled={isSubmitting}
                    rows={2}
                  />
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setIsEditingDescription(false)}
                    mt={1}
                  >
                    Annuler
                  </Button>
                </Field.Root>
              )}

              <Box>
                <Heading as="h2" size="lg" mb={4}>
                  Traductions
                </Heading>

                <VStack gap={4} align="stretch">
                  {languages.map((lang) => (
                    <Field.Root key={lang.id}>
                      <Field.Label>
                        <HStack>
                          <Text>{lang.locale.toUpperCase()}</Text>
                          {lang.isDefault && (
                            <Badge colorPalette="brand" size="sm">
                              Par défaut
                            </Badge>
                          )}
                        </HStack>
                      </Field.Label>
                      <Textarea
                        name={`translation_${lang.locale}`}
                        placeholder={`Traduction en ${lang.locale}...`}
                        defaultValue={translationMap.get(lang.locale) || ""}
                        disabled={isSubmitting}
                        rows={3}
                      />
                    </Field.Root>
                  ))}
                </VStack>
              </Box>

              <Box display="flex" gap={3} mt={6}>
                <Button
                  type="submit"
                  colorPalette="brand"
                  loading={isSubmitting}
                  flex={1}
                >
                  <LuSave /> Enregistrer
                </Button>
                <Button
                  as={Link}
                  to={`/orgs/${organization.slug}/projects/${project.slug}/translations`}
                  variant="outline"
                  disabled={isSubmitting}
                >
                  Retour
                </Button>
              </Box>
            </VStack>
          </Form>
        )}
      </VStack>
    </Container>
  );
}
