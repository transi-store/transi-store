import { HStack, Input, Button } from "@chakra-ui/react";
import { Form, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { getTranslationsUrl } from "~/lib/routes-helpers";

type TranslationsSearchBarProps = {
  search?: string;
  organizationSlug: string;
  projectSlug: string;
};

export function TranslationsSearchBar({
  search,
  organizationSlug,
  projectSlug,
}: TranslationsSearchBarProps) {
  const { t } = useTranslation();

  return (
    <Form method="get">
      <HStack>
        <Input
          name="search"
          placeholder={t("translations.searchPlaceholder")}
          defaultValue={search}
        />
        <Button type="submit" colorPalette="brand">
          {t("translations.search")}
        </Button>
        {search && (
          <Button asChild variant="outline">
            <Link to={getTranslationsUrl(organizationSlug, projectSlug)}>
              {t("translations.clear")}
            </Link>
          </Button>
        )}
      </HStack>
    </Form>
  );
}
