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
} from "@chakra-ui/react";
import { Form, useNavigate, useSubmit } from "react-router";
import { useTranslation } from "react-i18next";
import {
  getBranchUrl,
  getTranslationsUrl,
  removeUndefinedValues,
} from "~/lib/routes-helpers";
import { TranslationKeysSort } from "~/lib/sort/keySort";
import type { FormEvent } from "react";

type TranslationsSearchBarProps = {
  search?: string;
  sort: TranslationKeysSort;
  organizationSlug: string;
  projectSlug: string;
  branchSlug?: string;
};

export function TranslationsSearchBar({
  search,
  sort,
  organizationSlug,
  projectSlug,
  branchSlug,
}: TranslationsSearchBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const submit = useSubmit();

  const buildUrl = (queryParams?: {
    search?: string | null;
    sort?: string | null;
  }) => {
    if (branchSlug) {
      return getBranchUrl(
        organizationSlug,
        projectSlug,
        branchSlug,
        queryParams,
      );
    }

    return getTranslationsUrl(organizationSlug, projectSlug, queryParams);
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

  const sortCollection = createListCollection({
    items: sortOptions,
  });

  return (
    <Form method="get" onSubmit={handleFormSubmit}>
      <HStack
        align="end"
        flexWrap="wrap"
        gap={3}
        bg="surface.panel"
        border="1px solid"
        borderColor="surface.border"
        borderRadius="2xl"
        px={4}
        py={4}
        boxShadow={{
          base: "0 12px 24px rgba(15, 23, 42, 0.05)",
          _dark: "0 12px 24px rgba(0, 0, 0, 0.18)",
        }}
      >
        <Box flex="1">
          <InputGroup
            endElement={
              search ? (
                <CloseButton
                  size="xs"
                  onClick={() => {
                    navigate(
                      buildUrl({
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
              bg="surface.panelMuted"
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
              <Select.Trigger bg="surface.panelMuted">
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
  );
}
