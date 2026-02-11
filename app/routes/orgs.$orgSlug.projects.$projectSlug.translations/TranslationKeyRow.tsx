import {
  Table,
  Text,
  HStack,
  Badge,
  LinkBox,
  LinkOverlay,
  VStack,
  Button,
  IconButton,
} from "@chakra-ui/react";
import { toaster } from "~/components/ui/toaster";
import { Link, Form, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { LuPencil, LuCopy } from "react-icons/lu";
import { TextHighlight } from "~/lib/highlight";
import { isSearchTranlation } from "~/lib/translation-helper";
import { TranslationProgress } from "./TranslationProgress";
import type { RegularDataRow, SearchDataRow } from "~/lib/translation-helper";
import { getKeyUrl } from "~/lib/routes-helpers";

type TranslationKeyRowProps = {
  translationKey: RegularDataRow | SearchDataRow;
  search?: string;
  totalLanguages: number;
  organizationSlug: string;
  projectSlug: string;
  currentUrl: string;
};

type CopyOptions = {
  successTitle?: string;
  successDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
};

// TODO extract this "copy to clipboard" logic into a reusable hook
function usehandleCopyText() {
  const { t } = useTranslation();

  const handleCopy = async (text: string, options?: CopyOptions) => {
    try {
      await navigator.clipboard.writeText(text);
      toaster.success({
        title: options?.successTitle ?? t("copy.success.title"),
        description: options?.successDescription,
        duration: 3000,
      });
    } catch (error) {
      toaster.error({
        title: options?.errorTitle ?? t("copy.error.title"),
        description: options?.errorDescription,
        duration: 3000,
      });
    }
  };

  return handleCopy;
}

export function TranslationKeyRow({
  translationKey: key,
  search,
  totalLanguages,
  organizationSlug,
  projectSlug,
  currentUrl,
}: TranslationKeyRowProps) {
  const { t } = useTranslation();
  const handleCopyText = usehandleCopyText();

  const [searchParams] = useSearchParams();

  const highlight = searchParams.get("highlight");

  return (
    <Table.Row
      key={key.id}
      bg={
        highlight?.split(",").includes(key.keyName)
          ? "accent.subtle"
          : undefined
      }
    >
      <Table.Cell>
        <LinkBox>
          <VStack align="stretch" gap={1}>
            <HStack>
              <LinkOverlay asChild>
                <Link
                  to={`${getKeyUrl(organizationSlug, projectSlug, key.id)}?redirectTo=${encodeURIComponent(currentUrl)}`}
                >
                  <Text fontFamily="mono" fontSize="sm" fontWeight="medium">
                    <TextHighlight text={key.keyName} query={search} />
                  </Text>
                </Link>
              </LinkOverlay>

              <IconButton
                aria-label={t("translation.key.copy")}
                variant="ghost"
                onClick={() => handleCopyText(key.keyName)}
              >
                <LuCopy />
              </IconButton>
            </HStack>

            {key.description && (
              <Text fontSize="xs" color="gray.400">
                <TextHighlight text={key.description} query={search} />
              </Text>
            )}
            {isSearchTranlation(key) && (
              <>
                {key.matchType === "translation" && key.translationLocale && (
                  <HStack gap={2} mt={1}>
                    <Badge colorPalette="purple" size="sm">
                      {t("translations.badgeTranslation")}
                    </Badge>
                    <Badge colorPalette="brand" size="sm">
                      {key.translationLocale.toUpperCase()}
                    </Badge>
                  </HStack>
                )}
                {key.matchType === "key" && (
                  <Badge colorPalette="purple" size="sm" mt={1}>
                    {t("translations.badgeKey")}
                  </Badge>
                )}
                {key.matchType === "translation" && key.translationValue && (
                  <Text fontSize="xs" color="fg.muted" mt={1}>
                    <TextHighlight text={key.translationValue} query={search} />
                  </Text>
                )}
                {key.matchType !== "translation" && key.defaultTranslation && (
                  <Text fontSize="s" color="fg.muted">
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
              to={`${getKeyUrl(organizationSlug, projectSlug, key.id, { redirectTo: currentUrl })}`}
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
