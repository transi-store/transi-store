import {
  Container,
  Heading,
  VStack,
  Button,
  Input,
  Box,
  Text,
  HStack,
  Badge,
  Card,
  SimpleGrid,
} from "@chakra-ui/react";
import { Link, Form, useSearchParams } from "react-router";
import type { Route } from "./+types/search";
import { requireUser } from "~/lib/session.server";
import { getUserOrganizations } from "~/lib/organizations.server";
import { globalSearch, type SearchResult } from "~/lib/search.server";

// Escapes regex special chars in the user's query
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Highlights occurrences of words from `query` in `text` using the theme yellow background
// Returns a React node (mixture of strings and <Box as="span"> matches )
function highlightText(text: string | null | undefined, query: string) {
  if (!text) return text;
  const q = query?.trim();
  if (!q || q.length < 2) return text;

  const words = q.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (words.length === 0) return text;

  const parts = text.split(new RegExp(`(${words.join("|")})`, "gi"));

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <Box as="span" key={i} bg="yellow.100" px={1} borderRadius="sm">
        {part}
      </Box>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);

  const searchParams = url.searchParams;

  const query = searchParams.get("q") ?? "";
  const organizationId = searchParams.get("org")
    ? Number(searchParams.get("org"))
    : undefined;
  const projectId = searchParams.get("project")
    ? Number(searchParams.get("project"))
    : undefined;
  const locale = searchParams.get("locale") ?? undefined;

  const organizations = await getUserOrganizations(user.userId);

  let results: Array<SearchResult> = [];

  if (query && query.trim().length >= 2) {
    results = await globalSearch(user.userId, query, {
      organizationId,
      projectId,
      locale,
      limit: 50,
    });
  }

  return { query, results, organizations };
}

export default function Search({ loaderData }: Route.ComponentProps) {
  const { query, results, organizations } = loaderData;
  const [searchParams] = useSearchParams();

  const hasQuery = query && query.trim().length >= 2;

  return (
    <Container maxW="container.xl" py={10}>
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="2xl">
          Recherche
        </Heading>

        <Form method="get">
          <VStack gap={4} align="stretch">
            <Input
              name="q"
              placeholder="Rechercher dans les clés et traductions..."
              defaultValue={query}
              size="lg"
              autoFocus
            />

            {/* Filtres optionnels */}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Organisation
                </Text>
                <select
                  name="org"
                  defaultValue={searchParams.get("org") || ""}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <option value="">Toutes</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Langue
                </Text>
                <Input
                  name="locale"
                  placeholder="fr, en, de..."
                  defaultValue={searchParams.get("locale") || ""}
                />
              </Box>

              <Box display="flex" alignItems="flex-end">
                <Button type="submit" colorPalette="brand" w="full">
                  Rechercher
                </Button>
              </Box>
            </SimpleGrid>
          </VStack>
        </Form>

        {/* Résultats */}
        {hasQuery ? (
          <>
            <HStack justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="medium">
                {results.length > 0
                  ? `${results.length} résultat${results.length > 1 ? "s" : ""} trouvé${results.length > 1 ? "s" : ""}`
                  : "Aucun résultat"}
              </Text>
              {query && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/search">Effacer la recherche</Link>
                </Button>
              )}
            </HStack>

            {results.length === 0 ? (
              <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
                <Text color="gray.600">Aucun résultat pour "{query}"</Text>
                <Text color="gray.500" fontSize="sm" mt={2}>
                  Essayez avec d'autres mots-clés ou modifiez les filtres
                </Text>
              </Box>
            ) : (
              <VStack gap={3} align="stretch">
                {results.map((result) => (
                  <Card.Root key={`${result.keyId}-${result.matchType}`}>
                    <Card.Body>
                      <VStack align="stretch" gap={2}>
                        <HStack justify="space-between" align="start">
                          <Box flex={1}>
                            <HStack mb={2}>
                              <Badge colorScheme="purple" size="sm">
                                {result.matchType === "key"
                                  ? "Clé"
                                  : "Traduction"}
                              </Badge>
                              {result.translationLocale && (
                                <Badge colorPalette="brand" size="sm">
                                  {result.translationLocale.toUpperCase()}
                                </Badge>
                              )}
                            </HStack>

                            <Text
                              fontFamily="mono"
                              fontSize="lg"
                              fontWeight="medium"
                              mb={1}
                            >
                              {highlightText(result.keyName, query)}
                            </Text> 

                            {result.keyDescription && (
                              <Text color="gray.600" fontSize="sm" mb={2}>
                                {highlightText(result.keyDescription, query)}
                              </Text>
                            )} 

                            {result.translationValue && (
                              <Box
                                p={3}
                                bg="gray.50"
                                borderRadius="md"
                                borderLeftWidth={3}
                                borderLeftColor="blue.500"
                              >
                                <Text fontSize="sm">
                                  {highlightText(result.translationValue, query)}
                                </Text>
                              </Box>
                            )}

                            <HStack mt={3} fontSize="sm" color="gray.600">
                              <Text>
                                {result.organizationName} / {result.projectName}
                              </Text>
                            </HStack>
                          </Box>

                          <Button asChild colorPalette="brand" size="sm">
                            <Link
                              to={`/orgs/${result.organizationSlug}/projects/${result.projectSlug}/keys/${result.keyId}`}
                            >
                              Éditer
                            </Link>
                          </Button>
                        </HStack>
                      </VStack>
                    </Card.Body>
                  </Card.Root>
                ))}
              </VStack>
            )}
          </>
        ) : (
          <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
            <Text color="gray.600">
              Saisissez au moins 2 caractères pour lancer une recherche
            </Text>
            <Text color="gray.500" fontSize="sm" mt={2}>
              La recherche s'effectue dans les noms de clés, descriptions et
              valeurs de traduction
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  );
}
