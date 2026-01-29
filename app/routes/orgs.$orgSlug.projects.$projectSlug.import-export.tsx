import {
  Heading,
  VStack,
  Button,
  Box,
  Text,
  SimpleGrid,
  Card,
  HStack,
  Field,
  Separator,
} from "@chakra-ui/react";
import { NativeSelect } from "@chakra-ui/react/native-select";
import { FileUpload } from "@chakra-ui/react/file-upload";
import { Switch } from "@chakra-ui/react/switch";
import {
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from "react-router";
import { LuDownload, LuUpload } from "react-icons/lu";
import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.import-export";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import {
  parseImportJSON,
  validateImportData,
  importTranslations,
} from "~/lib/import/json.server";
import { downloadResponse } from "~/lib/download";

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: { id: string; slug: string; name: string };
  languages: Array<{ id: string; locale: string; isDefault: boolean }>;
};

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

  return {};
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

export default function ProjectImportExport() {
  const { organization, project, languages } = useOutletContext<ContextType>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const importFormRef = useRef<HTMLFormElement>(null);
  const [shouldOverwrite, setShouldOverwrite] = useState(false);

  // Reset form after successful import
  useEffect(() => {
    if (actionData?.success && importFormRef.current) {
      importFormRef.current.reset();
      setShouldOverwrite(false);
    }
  }, [actionData?.success]);

  return (
    <VStack gap={6} align="stretch">
      {/* Import Section */}
      <Box>
        <Heading as="h2" size="lg" mb={4}>
          Importer des traductions
        </Heading>

        {languages.length === 0 ? (
          <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
            <Text color="gray.600" mb={4}>
              Ajoutez au moins une langue dans les paramètres pour importer des
              traductions
            </Text>
          </Box>
        ) : (
          <Card.Root>
            <Card.Body>
              <Form
                method="post"
                encType="multipart/form-data"
                ref={importFormRef}
              >
                <input type="hidden" name="_action" value="import" />

                <VStack gap={4} align="stretch">
                  {/* File input */}
                  <Field.Root required>
                    <Field.Label>Fichier JSON</Field.Label>
                    <FileUpload.Root
                      accept="application/json,.json"
                      required
                      disabled={isSubmitting}
                      name="file"
                      maxFiles={1}
                    >
                      <FileUpload.HiddenInput />
                      <FileUpload.Trigger asChild>
                        <Button variant="outline" size="sm">
                          <LuUpload /> Upload file
                        </Button>
                      </FileUpload.Trigger>
                      <FileUpload.List />
                    </FileUpload.Root>
                    <Field.HelperText>
                      Format attendu : {"{"}"key.name": "traduction"{"}"}
                    </Field.HelperText>
                  </Field.Root>

                  {/* Language select */}
                  <Field.Root required>
                    <Field.Label>Langue cible</Field.Label>
                    <NativeSelect.Root disabled={isSubmitting} maxW="300px">
                      <NativeSelect.Field
                        name="locale"
                        placeholder="Choisir une langue"
                      >
                        {languages.map((lang) => (
                          <option key={lang.id} value={lang.locale}>
                            {lang.locale.toUpperCase()}
                            {lang.isDefault ? " (défaut)" : ""}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>

                  {/* Strategy switch */}
                  <Field.Root>
                    <input
                      type="hidden"
                      name="strategy"
                      value={shouldOverwrite ? "overwrite" : "skip"}
                    />
                    <Switch.Root
                      checked={shouldOverwrite}
                      onCheckedChange={(e) => setShouldOverwrite(e.checked)}
                      disabled={isSubmitting}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                      <Switch.Label>
                        Écraser les traductions existantes
                      </Switch.Label>
                    </Switch.Root>

                    <Box>
                      <Text fontSize="sm" color="gray.600">
                        Si actif, les traductions existantes seront écrasées par
                        les nouvelles valeurs du fichier importé.
                      </Text>
                    </Box>
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
          <Box
            p={4}
            bg="green.50"
            borderRadius="md"
            borderWidth={1}
            borderColor="green.200"
            mt={4}
          >
            <Heading as="h4" size="sm" color="green.700" mb={2}>
              ✓ Import réussi !
            </Heading>
            <VStack gap={1} align="stretch" fontSize="sm" color="green.700">
              <Text>• Total : {actionData.importStats.total} entrées</Text>
              <Text>• Clés créées : {actionData.importStats.keysCreated}</Text>
              <Text>
                • Traductions créées :{" "}
                {actionData.importStats.translationsCreated}
              </Text>
              <Text>
                • Traductions mises à jour :{" "}
                {actionData.importStats.translationsUpdated}
              </Text>
              <Text>
                • Traductions ignorées :{" "}
                {actionData.importStats.translationsSkipped}
              </Text>
            </VStack>
          </Box>
        )}

        {/* Error feedback */}
        {actionData?.error && (
          <Box p={4} bg="red.100" color="red.700" borderRadius="md" mt={4}>
            {actionData.error}
          </Box>
        )}
      </Box>

      {/* Export Section */}
      {languages.length > 0 && (
        <>
          <Separator />
          <Box>
            <Heading as="h2" size="lg" mb={4}>
              Exporter des traductions
            </Heading>
            <Text color="gray.600" mb={4}>
              Exportez vos traductions en JSON ou XLIFF
            </Text>

            <VStack gap={4} align="stretch">
              {/* Export JSON par langue */}
              <Card.Root>
                <Card.Body>
                  <Heading as="h3" size="md" mb={3}>
                    Export JSON
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    Exportez une langue spécifique au format JSON
                  </Text>
                  <SimpleGrid columns={{ base: 2, md: 4 }} gap={2}>
                    {languages.map((lang) => (
                      <Button
                        key={lang.id}
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          downloadResponse(
                            await fetch(
                              `/api/orgs/${organization.slug}/projects/${project.slug}/export?format=json&locale=${lang.locale}`,
                            ),
                            `${project.slug}-${lang.locale}.json`,
                          );
                        }}
                      >
                        <LuDownload />
                        {lang.locale.toUpperCase()}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      colorPalette="brand"
                      onClick={async () => {
                        downloadResponse(
                          await fetch(
                            `/api/orgs/${organization.slug}/projects/${project.slug}/export?format=json&all`,
                          ),
                          `${project.slug}-all.json`,
                        );
                      }}
                    >
                      <LuDownload />
                      Toutes les langues
                    </Button>
                  </SimpleGrid>
                </Card.Body>
              </Card.Root>

              {/* Export XLIFF */}
              {languages.length >= 2 && (
                <Card.Root>
                  <Card.Body>
                    <Heading as="h3" size="md" mb={3}>
                      Export XLIFF
                    </Heading>
                    <Text fontSize="sm" color="gray.600" mb={4}>
                      Exportez au format XLIFF 2.0 avec langue source et cible
                    </Text>
                    <Text fontSize="xs" color="gray.500" mb={3}>
                      Exemple : /api/orgs/{organization.slug}/projects/
                      {project.slug}
                      /export?format=xliff&source=en&target=fr
                    </Text>
                    <HStack>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          downloadResponse(
                            await fetch(
                              `/api/orgs/${organization.slug}/projects/${project.slug}/export?format=xliff&source=${languages[0].locale}&target=${languages[1].locale}`,
                            ),
                            `${project.slug}-${languages[0].locale}-to-${languages[1].locale}.xliff`,
                          );
                        }}
                      >
                        <LuDownload />
                        {languages[0].locale.toUpperCase()} →{" "}
                        {languages[1].locale.toUpperCase()}
                      </Button>
                    </HStack>
                  </Card.Body>
                </Card.Root>
              )}
            </VStack>
          </Box>
        </>
      )}
    </VStack>
  );
}
