import {
  HStack,
  Input,
  Button,
  Box,
  Select,
  createListCollection,
  Portal,
  InputGroup,
  CloseButton,
  VStack,
} from "@chakra-ui/react";
import { Form, useNavigate, useSubmit } from "react-router";
import { useTranslation } from "react-i18next";
import {
  getBranchUrl,
  getTranslationsUrl,
  removeUndefinedValues,
} from "~/lib/routes-helpers";
import { TranslationFilter, TranslationKeysSort } from "~/lib/sort/keySort";
import type { FormEvent } from "react";

type Language = { id: string; locale: string; isDefault: boolean };

type TranslationsSearchBarProps = {
  search?: string;
  sort: TranslationKeysSort;
  organizationSlug: string;
  projectSlug: string;
  branchSlug?: string;
  fileId?: number;
  languages: Language[];
  selectedLocale?: string;
  filter: TranslationFilter;
};

export function TranslationsSearchBar({
  search,
  sort,
  organizationSlug,
  projectSlug,
  branchSlug,
  fileId,
  languages,
  selectedLocale,
  filter,
}: TranslationsSearchBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const submit = useSubmit();

  // Resolve which locale is currently displayed (URL param or project default)
  const defaultLocale =
    languages.find((l) => l.isDefault)?.locale ?? languages[0]?.locale;
  const activeLocale = selectedLocale ?? defaultLocale;

  const buildUrl = (queryParams?: {
    search?: string | null;
    sort?: string | null;
    locale?: string | null;
    filter?: string | null;
  }) => {
    const params = {
      search,
      sort,
      locale: activeLocale,
      filter,
      ...queryParams,
      fileId,
    };
    if (branchSlug) {
      return getBranchUrl(organizationSlug, projectSlug, branchSlug, params);
    }

    return getTranslationsUrl(organizationSlug, projectSlug, params);
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const searchValue = formData.get("search") as string | null;
    const sortValue = formData.get("sort") as string | null;

    navigate(
      buildUrl({
        search: searchValue,
        // If search is filled, reset sort to RELEVANCE (or undefined)
        sort: searchValue ? TranslationKeysSort.RELEVANCE : sortValue,
      }),
    );
  };

  const sortOptions = Object.values(TranslationKeysSort)
    .map((sortValue) => {
      return { label: t("translations.sort", { sortValue }), value: sortValue };
    })
    .filter(
      (option) => search || option.value !== TranslationKeysSort.RELEVANCE,
    ); // Do not display "Relevance" in the sort options, as it is an implicit sort when a search is performed

  const sortCollection = createListCollection({ items: sortOptions });

  const languageOptions = languages.map((lang) => ({
    label: lang.locale.toUpperCase(),
    value: lang.locale,
  }));
  const languageCollection = createListCollection({ items: languageOptions });

  const filterOptions = Object.values(TranslationFilter).map((filterValue) => ({
    label: t("translations.filter", { filterValue }),
    value: filterValue,
  }));
  const filterCollection = createListCollection({ items: filterOptions });

  return (
    <VStack align="stretch" gap={3}>
      {/* Row 1: search input + sort selector + search button */}
      <Form method="get" onSubmit={handleFormSubmit}>
        <HStack align="end" flexWrap="wrap" gap={3}>
          <Box flex="1">
            <InputGroup
              endElement={
                search ? (
                  <CloseButton
                    size="xs"
                    onClick={() => {
                      navigate(
                        buildUrl({
                          search: null,
                          sort:
                            sort === TranslationKeysSort.RELEVANCE
                              ? undefined
                              : sort,
                        }),
                      );
                    }}
                    me="-2"
                  />
                ) : undefined
              }
            >
              <Input
                key={search}
                name="search"
                placeholder={t("translations.searchPlaceholder")}
                defaultValue={search}
                minW={{ base: "240px", md: "320px" }}
              />
            </InputGroup>
          </Box>
          <Box minW="200px">
            <Select.Root
              collection={sortCollection}
              name="sort"
              value={[sort]}
              onValueChange={(e) => {
                submit(
                  removeUndefinedValues({
                    search,
                    sort: e.value[0],
                    fileId,
                    locale: activeLocale,
                    filter,
                  }),
                  {
                    method: "get",
                    action: branchSlug
                      ? getBranchUrl(organizationSlug, projectSlug, branchSlug)
                      : getTranslationsUrl(organizationSlug, projectSlug),
                  },
                );
              }}
            >
              <Select.HiddenSelect />
              <Select.Label>{t("translations.sort.label")}</Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
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
          <Box>
            <Button type="submit" colorPalette="brand">
              {t("translations.search")}
            </Button>
          </Box>
        </HStack>
      </Form>

      {/* Row 2: language selector + filter selector */}
      {languages.length > 0 && (
        <HStack align="end" flexWrap="wrap" gap={3}>
          <Box minW="200px">
            <Select.Root
              collection={languageCollection}
              value={activeLocale ? [activeLocale] : []}
              onValueChange={(e) => {
                navigate(buildUrl({ locale: e.value[0] }));
              }}
            >
              <Select.HiddenSelect />
              <Select.Label>{t("translations.language.label")}</Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {languageCollection.items.map((option) => (
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
          <Box minW="200px">
            <Select.Root
              collection={filterCollection}
              value={[filter]}
              onValueChange={(e) => {
                navigate(buildUrl({ filter: e.value[0] }));
              }}
            >
              <Select.HiddenSelect />
              <Select.Label>{t("translations.filter.label")}</Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {filterCollection.items.map((option) => (
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
        </HStack>
      )}
    </VStack>
  );
}
