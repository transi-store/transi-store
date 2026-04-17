import {
  Box,
  Button,
  Heading,
  Input,
  Portal,
  Select,
  SimpleGrid,
  Text,
  VStack,
  createListCollection,
} from "@chakra-ui/react";
import { Form, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { SearchPageOrganization } from "./types";
import type { JSX } from "react";

type SearchHeaderProps = {
  organizations: Array<SearchPageOrganization>;
  query: string;
};

export default function SearchHeader({
  organizations,
  query,
}: SearchHeaderProps): JSX.Element {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const organizationCollection = createListCollection({
    items: organizations.map((organization) => ({
      label: organization.name,
      value: String(organization.id),
    })),
  });

  return (
    <>
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

          <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
            <Box>
              <Text mb={1}>{t("search.organization")}</Text>
              <Select.Root
                collection={organizationCollection}
                name="org"
                defaultValue={
                  searchParams.get("org") ? [searchParams.get("org")!] : []
                }
              >
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
                      {organizationCollection.items.map((organization) => (
                        <Select.Item
                          item={organization}
                          key={organization.value}
                        >
                          {organization.label}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Box>

            <Box>
              <Text mb={1}>{t("search.language")}</Text>
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
    </>
  );
}
