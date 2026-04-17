import {
  Badge,
  Box,
  Button,
  Card,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { TextHighlight } from "~/lib/highlight";
import { getKeyUrl, getTranslationsUrl } from "~/lib/routes-helpers";
import type { SearchPageResult } from "./types";
import type { JSX } from "react";
import CopyButton from "~/components/copy-button";

type SearchResultRowProps = {
  query: string;
  result: SearchPageResult;
};

export default function SearchResultRow({
  query,
  result,
}: SearchResultRowProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <Card.Root>
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

              <Text fontFamily="mono" fontSize="lg" mb={1}>
                <TextHighlight text={result.keyName} query={query} />
                <CopyButton
                  text={result.keyName}
                  ariaLabel={t("translation.key.copy")}
                />
              </Text>

              {result.keyDescription && (
                <Text color="fg.muted" fontSize="sm" mb={2}>
                  <TextHighlight text={result.keyDescription} query={query} />
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
                  {result.organizationName} /
                  <Link
                    to={getTranslationsUrl(
                      result.organizationSlug,
                      result.projectSlug,
                      { search: result.keyName, sort: "relevance" },
                    )}
                  >
                    {result.projectName}
                  </Link>
                </Text>
              </HStack>
            </Box>

            <Button asChild colorPalette="brand" size="sm">
              <Link
                to={getKeyUrl(
                  result.organizationSlug,
                  result.projectSlug,
                  result.keyId,
                )}
              >
                {t("search.edit")}
              </Link>
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
