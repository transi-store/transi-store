import { Container, VStack, Box } from "@chakra-ui/react";
import type { Route } from "./+types";
import { userContext } from "~/middleware/auth.server";
import { getUserOrganizations } from "~/lib/organizations.server";
import { globalSearch, type SearchResult } from "~/lib/search.server";
import SearchHeader from "./SearchHeader";
import SearchResultsList from "./SearchResultsList";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
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

  return (
    <Container maxW="container.xl" py={10}>
      <VStack gap={6} align="stretch">
        <SearchHeader organizations={organizations} query={query} />

        {query && query.trim().length >= 2 ? (
          <SearchResultsList query={query} results={results} />
        ) : (
          <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
            <SearchResultsList.EmptyState />
          </Box>
        )}
      </VStack>
    </Container>
  );
}
