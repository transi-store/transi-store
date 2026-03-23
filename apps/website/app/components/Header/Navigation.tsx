import { HStack, Input, IconButton, Button } from "@chakra-ui/react";
import { Link, Form } from "react-router";
import { useTranslation } from "react-i18next";
import { LuSearch } from "react-icons/lu";

type NavigationProps = {
  lastOrganizationSlug?: string;
};

export function Navigation({ lastOrganizationSlug }: NavigationProps) {
  const { t } = useTranslation();

  return (
    <HStack gap={{ base: 2, md: 4 }} fontSize="sm">
      {lastOrganizationSlug && (
        <Button asChild variant="ghost" size={{ base: "xs", md: "sm" }}>
          <Link to={`/orgs/${lastOrganizationSlug}`}>
            {t("header.projects")}
          </Link>
        </Button>
      )}
      <Form method="get" action="/search">
        <HStack gap={1}>
          <Input
            bg="bg"
            borderColor="border"
            type="text"
            name="q"
            placeholder={t("header.search")}
            size="sm"
            width={{ base: "120px", md: "200px" }}
          />
          <IconButton
            type="submit"
            aria-label={t("header.search")}
            size="sm"
            colorPalette="brand"
            variant="solid"
          >
            <LuSearch />
          </IconButton>
        </HStack>
      </Form>
    </HStack>
  );
}
