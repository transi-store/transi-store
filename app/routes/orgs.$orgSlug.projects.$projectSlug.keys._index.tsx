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
} from "@chakra-ui/react";
import { Link, Form, useSearchParams } from "react-router";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.keys._index";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import { getTranslationKeys } from "~/lib/translation-keys.server";

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

  const keys = await getTranslationKeys(project.id, {
    search,
    limit,
    offset,
  });

  return { organization, project, keys, search, page };
}

export default function ProjectKeys({ loaderData }: Route.ComponentProps) {
  const { organization, project, keys, search, page } = loaderData;
  const [searchParams] = useSearchParams();

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
            colorScheme="blue"
          >
            Nouvelle clé
          </Button>
        </HStack>

        <Form method="get">
          <HStack>
            <Input
              name="search"
              placeholder="Rechercher une clé..."
              defaultValue={search}
            />
            <Button type="submit" colorScheme="blue">
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
                  <Table.ColumnHeader>Description</Table.ColumnHeader>
                  <Table.ColumnHeader w="150px">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {keys.map((key) => (
                  <Table.Row key={key.id}>
                    <Table.Cell fontFamily="mono" fontSize="sm">
                      {key.keyName}
                    </Table.Cell>
                    <Table.Cell color="gray.600">{key.description || "-"}</Table.Cell>
                    <Table.Cell>
                      <Button
                        as={Link}
                        to={`/orgs/${organization.slug}/projects/${project.slug}/keys/${key.id}`}
                        size="sm"
                        colorScheme="blue"
                      >
                        Éditer
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
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
