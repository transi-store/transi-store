import {
  Container,
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
  Separator,
} from "@chakra-ui/react";
import { Link, useLoaderData, Form, useActionData, useNavigation } from "react-router";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug._index";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages, addLanguageToProject, removeLanguageFromProject } from "~/lib/projects.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, params.orgSlug);

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const languages = await getProjectLanguages(project.id);

  return { organization, project, languages };
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

export default function ProjectDetail() {
  const { organization, project, languages } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Container maxW="container.xl" py={10}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Heading as="h1" size="2xl">
              {project.name}
            </Heading>
            <Button
              as={Link}
              to={`/orgs/${organization.slug}`}
              variant="outline"
              size="sm"
            >
              Retour
            </Button>
          </HStack>
          {project.description && (
            <Text color="gray.600" mb={4}>
              {project.description}
            </Text>
          )}
          <Text fontSize="sm" color="gray.600">
            /{organization.slug}/{project.slug}
          </Text>
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

          {languages.length === 0 ? (
            <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg" mb={4}>
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
                        <input type="hidden" name="_action" value="remove_language" />
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
              <Button
                type="submit"
                colorPalette="brand"
                loading={isSubmitting}
              >
                <LuPlus /> Ajouter une langue
              </Button>
            </HStack>
          </Form>
        </Box>

        {/* Clés de traduction */}
        <Box>
          <HStack justify="space-between" mb={4}>
            <Heading as="h2" size="lg">
              Cles de traduction
            </Heading>
            {languages.length > 0 && (
              <Button
                as={Link}
                to={`/orgs/${organization.slug}/projects/${project.slug}/keys`}
                colorPalette="brand"
                size="sm"
              >
                Gerer les traductions
              </Button>
            )}
          </HStack>

          {languages.length === 0 ? (
            <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
              <Text color="gray.600">
                Ajoutez au moins une langue pour commencer a traduire
              </Text>
            </Box>
          ) : (
            <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
              <Text color="gray.600" mb={4}>
                Gérez vos clés de traduction et leurs traductions dans toutes les langues
              </Text>
              <Button
                as={Link}
                to={`/orgs/${organization.slug}/projects/${project.slug}/keys`}
                colorPalette="brand"
              >
                Voir les traductions
              </Button>
            </Box>
          )}
        </Box>

        {/* Export */}
        {languages.length > 0 && (
          <>
            <Separator />
            <Box>
              <Heading as="h2" size="lg" mb={4}>
                Export
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
                          as="a"
                          href={`/api/orgs/${organization.slug}/projects/${project.slug}/export?format=json&locale=${lang.locale}`}
                          size="sm"
                          variant="outline"
                          download
                        >
                          {lang.locale.toUpperCase()}
                        </Button>
                      ))}
                      <Button
                        as="a"
                        href={`/api/orgs/${organization.slug}/projects/${project.slug}/export?format=json&all`}
                        size="sm"
                        colorPalette="brand"
                        download
                      >
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
                        Exemple : /api/orgs/{organization.slug}/projects/{project.slug}
                        /export?format=xliff&source=en&target=fr
                      </Text>
                      <HStack>
                        <Button
                          as="a"
                          href={`/api/orgs/${organization.slug}/projects/${project.slug}/export?format=xliff&source=${languages[0].locale}&target=${languages[1].locale}`}
                          size="sm"
                          variant="outline"
                          download
                        >
                          {languages[0].locale.toUpperCase()} → {languages[1].locale.toUpperCase()}
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
    </Container>
  );
}
