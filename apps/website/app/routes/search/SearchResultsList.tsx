import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import SearchResultRow from "./SearchResultRow";
import type { SearchPageResult } from "./types";
import type { JSX } from "react";

type SearchResultsListProps = {
  query: string;
  results: Array<SearchPageResult>;
};

function SearchResultsList({
  query,
  results,
}: SearchResultsListProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <>
      <HStack justify="space-between" align="center">
        <Text fontSize="lg">
          {results.length > 0
            ? t("search.resultLabel", { count: results.length })
            : t("search.noResults")}
        </Text>
        <Button asChild variant="outline" size="sm">
          <Link to="/search">{t("search.clearSearch")}</Link>
        </Button>
      </HStack>

      {results.length === 0 ? (
        <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
          <Text color="fg.muted">{t("search.noResultsFor", { query })}</Text>
          <Text color="fg.subtle" fontSize="sm" mt={2}>
            {t("search.tryOtherKeywords")}
          </Text>
        </Box>
      ) : (
        <VStack gap={3} align="stretch">
          {results.map((result) => (
            <SearchResultRow
              key={`${result.keyId}-${result.matchType}`}
              query={query}
              result={result}
            />
          ))}
        </VStack>
      )}
    </>
  );
}

function SearchEmptyState() {
  const { t } = useTranslation();

  return (
    <>
      <Text color="fg.muted">{t("search.enterQuery")}</Text>
      <Text color="fg.subtle" fontSize="sm" mt={2}>
        {t("search.searchInstructions")}
      </Text>
    </>
  );
}

SearchResultsList.EmptyState = SearchEmptyState;

export default SearchResultsList;
