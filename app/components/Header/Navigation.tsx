import { HStack, Text } from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

type NavigationProps = {
  lastOrganizationSlug?: string;
};

export function Navigation({ lastOrganizationSlug }: NavigationProps) {
  const { t } = useTranslation();

  return (
    <HStack gap={4} fontSize="sm">
      {lastOrganizationSlug && (
        <Text
          asChild
          color="brand.600"
          _hover={{ textDecoration: "underline", color: "brand.700" }}
        >
          <Link to={`/orgs/${lastOrganizationSlug}`}>
            {t("header.projects")}
          </Link>
        </Text>
      )}
      <Text
        asChild
        color="brand.600"
        _hover={{ textDecoration: "underline", color: "brand.700" }}
      >
        <Link to="/search">{t("header.search")}</Link>
      </Text>
    </HStack>
  );
}
