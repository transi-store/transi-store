import {
  Container,
  Heading,
  VStack,
  Button,
  Input,
  Box,
  Table,
  Text,
  HStack,
  Badge,
  Progress,
  Card,
  Field,
} from "@chakra-ui/react";
import { NativeSelect } from "@chakra-ui/react/native-select";
import { RadioGroup } from "@chakra-ui/react/radio-group";
import { Link, Form, useSearchParams, useActionData, useNavigation } from "react-router";
import { LuPlus, LuPencil, LuUpload } from "react-icons/lu";
import { useEffect, useRef } from "react";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.keys._index";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { getTranslationKeys } from "~/lib/translation-keys.server";
import {
  parseImportJSON,
  validateImportData,
  importTranslations,
} from "~/lib/import/json.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, params.orgSlug);

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  const [keys, languages] = await Promise.all([
    getTranslationKeys(project.id, {
      search,
      limit,
      offset,
    }),
    getProjectLanguages(project.id),
  ]);

  return { organization, project, keys, languages, search, page };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, params.orgSlug);

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "import") {
    // 1. Validate file input
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { error: "Fichier requis" };
    }

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      return { error: "Le fichier doit être au format JSON" };
    }

    // 2. Validate locale input
    const locale = formData.get("locale");
    if (!locale || typeof locale !== "string") {
      return { error: "Langue cible requise" };
    }

    // 3. Validate strategy input
    const strategy = formData.get("strategy");
    if (strategy !== "overwrite" && strategy !== "skip") {
      return { error: "Stratégie invalide" };
    }

    // 4. Verify locale exists in project
    const languages = await getProjectLanguages(project.id);
    if (!languages.some((l) => l.locale === locale)) {
      return {
        error: `La langue "${locale}" n'existe pas dans ce projet`,
      };
    }

    // 5. Read file content
    let fileContent: string;
    try {
      fileContent = await file.text();
    } catch (error) {
      return { error: "Impossible de lire le fichier" };
    }

    // 6. Parse JSON
    const parseResult = parseImportJSON(fileContent);
    if (!parseResult.success) {
      return { error: parseResult.error };
    }

    // 7. Validate data structure
    const validationErrors = validateImportData(parseResult.data!);
    if (validationErrors.length > 0) {
      return { error: validationErrors.join(", ") };
    }

    // 8. Import translations
    const result = await importTranslations({
      projectId: project.id,
      locale,
      data: parseResult.data!,
      strategy: strategy as "overwrite" | "skip",
    });

    if (!result.success) {
      return { error: result.errors.join(", ") };
    }

    // 9. Return success with stats
    return {
      success: true,
      importStats: result.stats,
    };
  }

  return { error: "Action inconnue" };
}

export default function ProjectKeys({ loaderData }: Route.ComponentProps) {
  const { organization, project, keys, languages, search, page } = loaderData;
  const [searchParams] = useSearchParams();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const totalLanguages = languages.length;
  const importFormRef = useRef<HTMLFormElement>(null);

  // Reset form after successful import
  useEffect(() => {
    if (actionData?.success && importFormRef.current) {
      importFormRef.current.reset();
    }
  }, [actionData?.success]);

  return (
    <Container maxW="container.xl" py={10}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between">
          <Box>
            <Heading as="h1" size="2xl">
              Clés de traduction
            </Heading>
            <Text color="gray.600" mt={2}>
              Projet : {project.name}
            </Text>
          </Box>
          <Button
            as={Link}
            to={`/orgs/${organization.slug}/projects/${project.slug}/keys/new`}
            colorPalette="brand"
          >
            <LuPlus /> Nouvelle clé
          </Button>
        </HStack>

        <Form method="get">
          <HStack>
            <Input
              name="search"
              placeholder="Rechercher une clé..."
              defaultValue={search}
            />
            <Button type="submit" colorPalette="brand">
              Rechercher
            </Button>
            {search && (
              <Button
                as={Link}
                to={`/orgs/${organization.slug}/projects/${project.slug}/keys`}
                variant="outline"
              >
                Effacer
              </Button>
            )}
          </HStack>
        </Form>

        {/* Import Section */}
        {languages.length > 0 && (
          <Card.Root>
            <Card.Body>
              <Heading as="h3" size="md" mb={3}>
                Importer des traductions
              </Heading>

              <Form method="post" encType="multipart/form-data" ref={importFormRef}>
                <input type="hidden" name="_action" value="import" />

                <VStack gap={4} align="stretch">
                  {/* File input */}
                  <Field.Root required>
                    <Field.Label>Fichier JSON</Field.Label>
                    <Input
                      type="file"
                      name="file"
                      accept="application/json,.json"
                      required
                      disabled={isSubmitting}
                    />
                    <Field.HelperText>
                      Format attendu : {"{"}"key.name": "traduction"{"}"}
                    </Field.HelperText>
                  </Field.Root>

                  {/* Language select */}
                  <Field.Root required>
                    <Field.Label>Langue cible</Field.Label>
                    <NativeSelect.Root required disabled={isSubmitting}>
                      <NativeSelect.Field name="locale" placeholder="Choisir une langue">
                        {languages.map((lang) => (
                          <option key={lang.id} value={lang.locale}>
                            {lang.locale.toUpperCase()}
                            {lang.isDefault ? " (défaut)" : ""}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>

                  {/* Strategy radio group */}
                  <Field.Root required>
                    <Field.Label>Stratégie d'import</Field.Label>
                    <RadioGroup.Root defaultValue="skip" name="strategy">
                      <VStack gap={2} align="stretch">
                        <RadioGroup.Item value="skip">
                          <RadioGroup.ItemHiddenInput />
                          <RadioGroup.ItemIndicator />
                          <RadioGroup.ItemText>
                            <Text fontWeight="medium">Conserver existantes</Text>
                            <Text fontSize="sm" color="gray.600">
                              Ne remplace pas les traductions existantes
                            </Text>
                          </RadioGroup.ItemText>
                        </RadioGroup.Item>

                        <RadioGroup.Item value="overwrite">
                          <RadioGroup.ItemHiddenInput />
                          <RadioGroup.ItemIndicator />
                          <RadioGroup.ItemText>
                            <Text fontWeight="medium">Écraser existantes</Text>
                            <Text fontSize="sm" color="gray.600">
                              Remplace toutes les traductions existantes
                            </Text>
                          </RadioGroup.ItemText>
                        </RadioGroup.Item>
                      </VStack>
                    </RadioGroup.Root>
                  </Field.Root>

                  <Button
                    type="submit"
                    colorPalette="brand"
                    loading={isSubmitting}
                  >
                    <LuUpload /> Importer
                  </Button>
                </VStack>
              </Form>
            </Card.Body>
          </Card.Root>
        )}

        {/* Success feedback */}
        {actionData?.success && actionData.importStats && (
          <Box p={4} bg="green.50" borderRadius="md" borderWidth={1} borderColor="green.200">
            <Heading as="h4" size="sm" color="green.700" mb={2}>
              ✓ Import réussi !
            </Heading>
            <VStack gap={1} align="stretch" fontSize="sm" color="green.700">
              <Text>• Total : {actionData.importStats.total} entrées</Text>
              <Text>• Clés créées : {actionData.importStats.keysCreated}</Text>
              <Text>• Traductions créées : {actionData.importStats.translationsCreated}</Text>
              <Text>• Traductions mises à jour : {actionData.importStats.translationsUpdated}</Text>
              <Text>• Traductions ignorées : {actionData.importStats.translationsSkipped}</Text>
            </VStack>
          </Box>
        )}

        {/* Error feedback */}
        {actionData?.error && (
          <Box p={4} bg="red.100" color="red.700" borderRadius="md">
            {actionData.error}
          </Box>
        )}

        {keys.length === 0 ? (
          <Box p={8} textAlign="center" bg="gray.50" borderRadius="md">
            <Text color="gray.600">
              {search
                ? "Aucune clé trouvée pour cette recherche"
                : "Aucune clé de traduction. Créez-en une pour commencer !"}
            </Text>
          </Box>
        ) : (
          <>
            <Table.Root variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Nom de la clé</Table.ColumnHeader>
                  <Table.ColumnHeader w="300px">Traductions</Table.ColumnHeader>
                  <Table.ColumnHeader w="150px">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {keys.map((key) => {
                  const translatedCount = key.translatedLocales.length;
                  const progressPercent = totalLanguages > 0
                    ? (translatedCount / totalLanguages) * 100
                    : 0;

                  return (
                    <Table.Row key={key.id}>
                      <Table.Cell>
                        <VStack align="stretch" gap={1}>
                          <Text fontFamily="mono" fontSize="sm" fontWeight="medium">
                            {key.keyName}
                          </Text>
                          {key.description && (
                            <Text fontSize="xs" color="gray.500">
                              {key.description}
                            </Text>
                          )}
                        </VStack>
                      </Table.Cell>
                      <Table.Cell>
                        <VStack align="stretch" gap={2}>
                          <HStack justify="space-between" fontSize="sm">
                            <Text color="gray.600">
                              {translatedCount}/{totalLanguages}
                            </Text>
                            <Text color="gray.600">
                              {Math.round(progressPercent)}%
                            </Text>
                          </HStack>
                          <Progress.Root value={progressPercent} size="sm" colorPalette="brand">
                            <Progress.Track>
                              <Progress.Range />
                            </Progress.Track>
                          </Progress.Root>
                          {key.translatedLocales.length > 0 && (
                            <HStack gap={1} flexWrap="wrap">
                              {key.translatedLocales.map((locale) => (
                                <Badge key={locale} size="sm" colorPalette="brand">
                                  {locale.toUpperCase()}
                                </Badge>
                              ))}
                            </HStack>
                          )}
                        </VStack>
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          as={Link}
                          to={`/orgs/${organization.slug}/projects/${project.slug}/keys/${key.id}`}
                          size="sm"
                          colorPalette="brand"
                        >
                          <LuPencil /> Éditer
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>

            {keys.length === 50 && (
              <HStack justify="center">
                {page > 1 && (
                  <Button
                    as={Link}
                    to={`/orgs/${organization.slug}/projects/${project.slug}/keys?${new URLSearchParams({
                      ...(search && { search }),
                      page: String(page - 1),
                    })}`}
                  >
                    Page précédente
                  </Button>
                )}
                <Text>Page {page}</Text>
                <Button
                  as={Link}
                  to={`/orgs/${organization.slug}/projects/${project.slug}/keys?${new URLSearchParams({
                    ...(search && { search }),
                    page: String(page + 1),
                  })}`}
                >
                  Page suivante
                </Button>
              </HStack>
            )}
          </>
        )}

        <Box>
          <Button
            as={Link}
            to={`/orgs/${organization.slug}/projects/${project.slug}`}
            variant="outline"
          >
            Retour au projet
          </Button>
        </Box>
      </VStack>
    </Container>
  );
}
