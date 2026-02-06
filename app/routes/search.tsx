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
  Select,
  createListCollection,
  Portal,
} from "@chakra-ui/react";
import { Link, Form, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/search";
import { requireUser } from "~/lib/session.server";
import { getUserOrganizations } from "~/lib/organizations.server";
import { TextHighlight } from "../lib/highlight";
import { globalSearch, type SearchResult } from "~/lib/search.server";

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
  const { t } = useTranslation();
  const { query, results, organizations } = loaderData;
  const [searchParams] = useSearchParams();

  const hasQuery = query && query.trim().length >= 2;

  const itemCollection = createListCollection({
    items: organizations.map((org) => ({
      label: org.name,
      value: String(org.id),
    })),
  });

  return (
    <Container maxW="container.xl" py={10}>
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="2xl">
          {t("search.title")}
        </Heading>

        <Form method="get">
          <VStack gap={4} align="stretch">
            <Input
              name="q"
              placeholder={t("search.placeholder")}
              defaultValue={query}
              size="lg"
              autoFocus
            />

            {/* Filtres optionnels */}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  {t("search.organization")}
                </Text>
                <Select.Root collection={itemCollection} name="org">
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder={t("search.all")} />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.ClearTrigger />
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {itemCollection.items.map((framework) => (
                          <Select.Item item={framework} key={framework.value}>
                            {framework.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  {t("search.language")}
                </Text>
                <Input
                  name="locale"
                  placeholder={t("search.localePlaceholder")}
                  defaultValue={searchParams.get("locale") || ""}
                />
              </Box>

              <Box display="flex" alignItems="flex-end">
                <Button type="submit" colorPalette="brand" w="full">
                  {t("search.search")}
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
                  ? `${results.length} ${t("search.resultLabel", { count: results.length })}`
                  : t("search.noResults")}
              </Text>
              {query && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/search">{t("search.clearSearch")}</Link>
                </Button>
              )}
            </HStack>

            {results.length === 0 ? (
              <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
                <Text color="fg.muted">
                  {t("search.noResultsFor", { query })}
                </Text>
                <Text color="fg.subtle" fontSize="sm" mt={2}>
                  {t("search.tryOtherKeywords")}
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
                              <Badge colorPalette="purple" size="sm">
                                {result.matchType === "key"
                                  ? t("search.badgeKey")
                                  : t("search.badgeTranslation")}
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
                              <TextHighlight
                                text={result.keyName}
                                query={query}
                              />
                            </Text>

                            {result.keyDescription && (
                              <Text color="fg.muted" fontSize="sm" mb={2}>
                                <TextHighlight
                                  text={result.keyDescription}
                                  query={query}
                                />
                              </Text>
                            )}

                            {result.translationValue && (
                              <Box
                                p={3}
                                bg="bg.subtle"
                                borderRadius="md"
                                borderLeftWidth={3}
                                borderLeftColor="brand.solid"
                              >
                                <Text fontSize="sm">
                                  <TextHighlight
                                    text={result.translationValue}
                                    query={query}
                                  />
                                </Text>
                              </Box>
                            )}

                            <HStack mt={3} fontSize="sm" color="fg.muted">
                              <Text>
                                {result.organizationName} / {result.projectName}
                              </Text>
                            </HStack>
                          </Box>

                          <Button asChild colorPalette="brand" size="sm">
                            <Link
                              to={`/orgs/${result.organizationSlug}/projects/${result.projectSlug}/keys/${result.keyId}`}
                            >
                              {t("search.edit")}
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
            <Text color="fg.muted">{t("search.enterQuery")}</Text>
            <Text color="fg.subtle" fontSize="sm" mt={2}>
              {t("search.searchInstructions")}
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  );
}
