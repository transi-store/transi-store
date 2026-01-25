import {
  Heading,
  VStack,
  Button,
  Box,
  Text,
  SimpleGrid,
  Card,
  HStack,
  Badge,
  Input,
  Field,
} from "@chakra-ui/react";
import {
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from "react-router";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.settings";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import {
  getProjectBySlug,
  getProjectLanguages,
  addLanguageToProject,
  removeLanguageFromProject,
} from "~/lib/projects.server";

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
  };
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

  if (action === "add_language") {
    const locale = formData.get("locale");

    if (!locale || typeof locale !== "string") {
      return { error: "Le code de langue est requis" };
    }

    // Vérifier que la langue n'existe pas déjà
    const existingLanguages = await getProjectLanguages(project.id);
    if (existingLanguages.some((l) => l.locale === locale)) {
      return { error: `La langue "${locale}" existe deja` };
    }

    await addLanguageToProject({
      projectId: project.id,
      locale,
      isDefault: existingLanguages.length === 0,
    });

    return { success: true };
  }

  if (action === "remove_language") {
    const locale = formData.get("locale");

    if (!locale || typeof locale !== "string") {
      return { error: "Le code de langue est requis" };
    }

    await removeLanguageFromProject(project.id, locale);

    return { success: true };
  }

  return { error: "Action invalide" };
}

export default function ProjectSettings() {
  const { organization, project, languages } = useOutletContext<ContextType>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <VStack gap={8} align="stretch">
      {/* Informations du projet */}
      <Box>
        <Heading as="h2" size="lg" mb={4}>
          Informations du projet
        </Heading>
        <VStack gap={2} align="stretch">
          <Box>
            <Text fontSize="sm" color="gray.600" fontWeight="medium">
              Nom
            </Text>
            <Text>{project.name}</Text>
          </Box>
          {project.description && (
            <Box>
              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                Description
              </Text>
              <Text>{project.description}</Text>
            </Box>
          )}
          <Box>
            <Text fontSize="sm" color="gray.600" fontWeight="medium">
              Slug
            </Text>
            <Text fontFamily="mono" fontSize="sm">
              /{organization.slug}/{project.slug}
            </Text>
          </Box>
        </VStack>
      </Box>

      {/* Langues */}
      <Box>
        <Heading as="h2" size="lg" mb={4}>
          Langues ({languages.length})
        </Heading>

        {actionData?.error && (
          <Box p={4} bg="red.100" color="red.700" borderRadius="md" mb={4}>
            {actionData.error}
          </Box>
        )}

        {actionData?.success && (
          <Box p={4} bg="green.50" color="green.700" borderRadius="md" mb={4}>
            ✓ Langue mise à jour avec succès
          </Box>
        )}

        {languages.length === 0 ? (
          <Box
            p={10}
            textAlign="center"
            borderWidth={1}
            borderRadius="lg"
            mb={4}
          >
            <Text color="gray.600" mb={4}>
              Aucune langue configuree
            </Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} mb={4}>
            {languages.map((lang) => (
              <Card.Root key={lang.id}>
                <Card.Body>
                  <HStack justify="space-between">
                    <Box>
                      <Text fontWeight="medium">{lang.locale}</Text>
                      {lang.isDefault && (
                        <Badge colorPalette="brand" size="sm">
                          Par defaut
                        </Badge>
                      )}
                    </Box>
                    <Form method="post">
                      <input
                        type="hidden"
                        name="_action"
                        value="remove_language"
                      />
                      <input type="hidden" name="locale" value={lang.locale} />
                      <Button
                        type="submit"
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        disabled={isSubmitting}
                      >
                        <LuTrash2 />
                      </Button>
                    </Form>
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        )}

        <Form method="post">
          <input type="hidden" name="_action" value="add_language" />
          <HStack>
            <Field.Root flex={1}>
              <Input
                name="locale"
                placeholder="fr, en, de..."
                disabled={isSubmitting}
              />
            </Field.Root>
            <Button type="submit" colorPalette="brand" loading={isSubmitting}>
              <LuPlus /> Ajouter une langue
            </Button>
          </HStack>
        </Form>
      </Box>
    </VStack>
  );
}
