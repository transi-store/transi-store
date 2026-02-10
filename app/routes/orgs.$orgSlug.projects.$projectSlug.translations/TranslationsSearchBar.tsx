import {
  HStack,
  Input,
  Button,
  Box,
  Text,
  Select,
  createListCollection,
  Portal,
} from "@chakra-ui/react";
import { Form, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { getTranslationsUrl } from "~/lib/routes-helpers";

type TranslationsSearchBarProps = {
  search?: string;
  sort: "alphabetical" | "createdAt" | "relevance";
  organizationSlug: string;
  projectSlug: string;
};

export function TranslationsSearchBar({
  search,
  sort,
  organizationSlug,
  projectSlug,
}: TranslationsSearchBarProps) {
  const { t } = useTranslation();
  const sortOptions = [
    {
      label: t("translations.sort.alphabetical"),
      value: "alphabetical",
    },
    {
      label: t("translations.sort.createdAt"),
      value: "createdAt",
    },
  ];
  if (search) {
    sortOptions.unshift({
      label: t("translations.sort.relevance"),
      value: "relevance",
    });
  }
  const sortCollection = createListCollection({
    items: sortOptions,
  });
  const sortValue =
    sortOptions.find((option) => option.value === sort)?.value ??
    sortOptions[0]?.value ??
    "alphabetical";
  const preservedSort = sort === "relevance" ? undefined : sort;

  return (
    <Form method="get">
      <HStack align="end" flexWrap="wrap">
        <Input
          name="search"
          placeholder={t("translations.searchPlaceholder")}
          defaultValue={search}
          minW={{ base: "240px", md: "320px" }}
        />
        <Box minW="220px">
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            {t("translations.sort.label")}
          </Text>
          <Select.Root
            collection={sortCollection}
            name="sort"
            defaultValue={[sortValue]}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText />
              </Select.Trigger>
              <Select.Indicator />
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {sortCollection.items.map((option) => (
                    <Select.Item item={option} key={option.value}>
                      {option.label}
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>
        </Box>
        <Button type="submit" colorPalette="brand">
          {t("translations.search")}
        </Button>
        {search && (
          <Button asChild variant="outline">
            <Link
              to={getTranslationsUrl(organizationSlug, projectSlug, {
                sort: preservedSort,
              })}
            >
              {t("translations.clear")}
            </Link>
          </Button>
        )}
      </HStack>
    </Form>
  );
}
