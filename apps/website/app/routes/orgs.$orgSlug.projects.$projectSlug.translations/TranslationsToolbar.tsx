import {
  HStack,
  Portal,
  SegmentGroup,
  Select,
  Text,
  createListCollection,
} from "@chakra-ui/react";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { TranslationFilter } from "~/lib/sort/keySort";

type Language = { locale: string; isDefault: boolean | null };

type TranslationsToolbarProps = {
  languages: Language[];
  effectiveLocale: string;
  filter: TranslationFilter;
  filterCounts: Record<TranslationFilter, number>;
  onLocaleChange: (locale: string) => void;
  onFilterChange: (filter: TranslationFilter) => void;
};

export function TranslationsToolbar({
  languages,
  effectiveLocale,
  filter,
  filterCounts,
  onLocaleChange,
  onFilterChange,
}: TranslationsToolbarProps): JSX.Element | null {
  const { t } = useTranslation();

  if (languages.length === 0) {
    return null;
  }

  const languageCollection = createListCollection({
    items: languages.map((lang) => ({
      label: lang.locale.toUpperCase(),
      value: lang.locale,
    })),
  });

  const filterItems = Object.values(TranslationFilter).map((filterValue) => ({
    label: (
      <HStack gap={1.5} as="span">
        <span>{t("translations.filter", { filterValue })}</span>
        <Text as="span" color="fg.muted" fontSize="xs">
          {filterCounts[filterValue]}
        </Text>
      </HStack>
    ),
    value: filterValue,
  }));

  return (
    <HStack gap={3} align="center" flexWrap="wrap">
      <Select.Root
        size="sm"
        width="100px"
        collection={languageCollection}
        value={[effectiveLocale]}
        onValueChange={(e) => {
          if (e.value[0]) {
            onLocaleChange(e.value[0]);
          }
        }}
      >
        <Select.HiddenSelect />
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
      <SegmentGroup.Root
        size="sm"
        value={filter}
        onValueChange={(e) => {
          if (e.value) {
            onFilterChange(e.value as TranslationFilter);
          }
        }}
      >
        <SegmentGroup.Indicator />
        <SegmentGroup.Items items={filterItems} />
      </SegmentGroup.Root>
    </HStack>
  );
}
