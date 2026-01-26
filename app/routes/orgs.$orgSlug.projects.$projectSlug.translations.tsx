import {
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
} from "@chakra-ui/react";
import { Link, Form, useOutletContext } from "react-router";
import { LuPlus, LuPencil } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.translations";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import { getTranslationKeys } from "~/lib/translation-keys.server";

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

  return { keys, search, page };
}

export default function ProjectTranslations({
  loaderData,
}: Route.ComponentProps) {
  const { keys, search, page } = loaderData;
  const { organization, project, languages } = useOutletContext<ContextType>();

  const totalLanguages = languages.length;

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between">
        <Box>
          <Heading as="h2" size="lg">
            Clés de traduction
          </Heading>
          <Text color="gray.600" mt={2}>
            {keys.length} clé{keys.length > 1 ? "s" : ""}
          </Text>
        </Box>
        {languages.length > 0 && (
          <Button asChild colorPalette="brand">
            <Link
              to={`/orgs/${organization.slug}/projects/${project.slug}/keys/new`}
            >
              <LuPlus /> Nouvelle clé
            </Link>
          </Button>
        )}
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
            <Button asChild variant="outline">
              <Link
                to={`/orgs/${organization.slug}/projects/${project.slug}/translations`}
              >
                Effacer
              </Link>
            </Button>
          )}
        </HStack>
      </Form>

      {languages.length === 0 ? (
        <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
          <Text color="gray.600" mb={4}>
            Ajoutez au moins une langue dans les paramètres pour commencer à
            traduire
          </Text>
          <Button asChild colorPalette="brand">
            <Link
              to={`/orgs/${organization.slug}/projects/${project.slug}/settings`}
            >
              Gérer les langues
            </Link>
          </Button>
        </Box>
      ) : keys.length === 0 ? (
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
                const progressPercent =
                  totalLanguages > 0
                    ? (translatedCount / totalLanguages) * 100
                    : 0;

                return (
                  <Table.Row key={key.id}>
                    <Table.Cell>
                      <VStack align="stretch" gap={1}>
                        <Text
                          fontFamily="mono"
                          fontSize="sm"
                          fontWeight="medium"
                        >
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
                        <Progress.Root
                          value={progressPercent}
                          size="sm"
                          colorPalette="brand"
                        >
                          <Progress.Track>
                            <Progress.Range />
                          </Progress.Track>
                        </Progress.Root>
                        {key.translatedLocales.length > 0 && (
                          <HStack gap={1} flexWrap="wrap">
                            {key.translatedLocales.map((locale) => (
                              <Badge
                                key={locale}
                                size="sm"
                                colorPalette="brand"
                              >
                                {locale.toUpperCase()}
                              </Badge>
                            ))}
                          </HStack>
                        )}
                      </VStack>
                    </Table.Cell>
                    <Table.Cell>
                      <Button asChild size="sm" colorPalette="brand">
                        <Link
                          to={`/orgs/${organization.slug}/projects/${project.slug}/keys/${key.id}`}
                        >
                          <LuPencil /> Éditer
                        </Link>
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
                <Button asChild>
                  <Link
                    to={`/orgs/${organization.slug}/projects/${project.slug}/translations?${new URLSearchParams(
                      {
                        ...(search && { search }),
                        page: String(page - 1),
                      },
                    )}`}
                  >
                    Page précédente
                  </Link>
                </Button>
              )}
              <Text>Page {page}</Text>
              <Button asChild>
                <Link
                  to={`/orgs/${organization.slug}/projects/${project.slug}/translations?${new URLSearchParams(
                    {
                      ...(search && { search }),
                      page: String(page + 1),
                    },
                  )}`}
                >
                  Page suivante
                </Link>
              </Button>
            </HStack>
          )}
        </>
      )}
    </VStack>
  );
}
