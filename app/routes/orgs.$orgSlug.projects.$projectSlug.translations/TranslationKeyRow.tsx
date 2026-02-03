import {
  Table,
  Text,
  HStack,
  Badge,
  LinkBox,
  LinkOverlay,
  VStack,
  Button,
} from "@chakra-ui/react";
import { Link, Form } from "react-router";
import { useTranslation } from "react-i18next";
import { LuPencil, LuCopy } from "react-icons/lu";
import { TextHighlight } from "~/lib/highlight";
import { isSearchTranlation } from "~/lib/translation-helper";
import { TranslationProgress } from "./TranslationProgress";
import type { RegularDataRow, SearchDataRow } from "~/lib/translation-helper";

type TranslationKeyRowProps = {
  translationKey: RegularDataRow | SearchDataRow;
  search?: string;
  totalLanguages: number;
  organizationSlug: string;
  projectSlug: string;
  currentUrl: string;
};

export function TranslationKeyRow({
  translationKey: key,
  search,
  totalLanguages,
  organizationSlug,
  projectSlug,
  currentUrl,
}: TranslationKeyRowProps) {
  const { t } = useTranslation();

  return (
    <Table.Row key={key.id}>
      <Table.Cell>
        <LinkBox>
          <VStack align="stretch" gap={1}>
            <LinkOverlay asChild>
              <Link
                to={`/orgs/${organizationSlug}/projects/${projectSlug}/keys/${key.id}?redirect=${encodeURIComponent(currentUrl)}`}
              >
                <Text fontFamily="mono" fontSize="sm" fontWeight="medium">
                  <TextHighlight text={key.keyName} query={search} />
                </Text>
              </Link>
            </LinkOverlay>
            {key.description && (
              <Text fontSize="xs" color="gray.400">
                <TextHighlight text={key.description} query={search} />
              </Text>
            )}
            {isSearchTranlation(key) && (
              <>
                {key.matchType === "translation" && key.translationLocale && (
                  <HStack gap={2} mt={1}>
                    <Badge colorScheme="purple" size="sm">
                      {t("translations.badgeTranslation")}
                    </Badge>
                    <Badge colorPalette="brand" size="sm">
                      {key.translationLocale.toUpperCase()}
                    </Badge>
                  </HStack>
                )}
                {key.matchType === "key" && (
                  <Badge colorScheme="purple" size="sm" mt={1}>
                    {t("translations.badgeKey")}
                  </Badge>
                )}
                {key.matchType === "translation" && key.translationValue && (
                  <Text fontSize="xs" color="gray.600" mt={1}>
                    <TextHighlight text={key.translationValue} query={search} />
                  </Text>
                )}
                {key.matchType !== "translation" && key.defaultTranslation && (
                  <Text fontSize="s" color="gray.600">
                    {key.defaultTranslation}
                  </Text>
                )}
              </>
            )}
          </VStack>
        </LinkBox>
      </Table.Cell>
      <Table.Cell>
        <TranslationProgress
          translatedCount={key.translatedLocales.length}
          totalLanguages={totalLanguages}
          translatedLocales={key.translatedLocales}
        />
      </Table.Cell>
      <Table.Cell>
        <HStack gap={2}>
          <Button asChild size="sm" colorPalette="brand">
            <Link
              to={`/orgs/${organizationSlug}/projects/${projectSlug}/keys/${key.id}?redirect=${encodeURIComponent(currentUrl)}`}
            >
              <LuPencil /> {t("translations.edit")}
            </Link>
          </Button>
          <Form method="post">
            <input type="hidden" name="_action" value="duplicate" />
            <input type="hidden" name="keyId" value={key.id} />
            <Button type="submit" size="sm" variant="outline">
              <LuCopy /> {t("translations.duplicate")}
            </Button>
          </Form>
        </HStack>
      </Table.Cell>
    </Table.Row>
  );
}
