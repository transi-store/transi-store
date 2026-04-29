/**
 * TranslationKeyDrawer
 *
 * A Chakra UI Drawer that loads a translation key's data via useFetcher
 * and renders <TranslationKeyContent /> for inline editing from the
 * translations list — without navigating to a separate page.
 *
 */
import { useEffect } from "react";
import {
  DrawerRoot,
  DrawerBackdrop,
  DrawerPositioner,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerCloseTrigger,
  DrawerTitle,
  Button,
  HStack,
  Spinner,
  Text,
  VStack,
  Box,
  IconButton,
} from "@chakra-ui/react";
import { Link, useFetcher } from "react-router";
import { useTranslation } from "react-i18next";
import { LuExternalLink, LuTrash2 } from "react-icons/lu";
import { getKeyUrl } from "~/lib/routes-helpers";
import { TranslationKeyContent } from "./TranslationKeyContent";
import type { KeyLoaderData } from "~/routes/orgs.$orgSlug.projects.$projectSlug.keys.$keyId";

type TranslationKeyDrawerProps = {
  /** The key ID to edit. */
  keyId: number;
  organizationSlug: string;
  projectSlug: string;
  /** Called when the drawer is closed. */
  onClosed: () => void;
  /** URL to redirect to after deletion. */
  returnUrl?: string;
};

export function TranslationKeyDrawer({
  keyId,
  organizationSlug,
  projectSlug,
  onClosed,
  returnUrl,
}: TranslationKeyDrawerProps) {
  const { t } = useTranslation();

  // Fetcher for loading key data
  const dataFetcher = useFetcher<KeyLoaderData>();

  const keyUrl = getKeyUrl(organizationSlug, projectSlug, keyId);

  // Load key data when component mounts or keyId changes
  useEffect(() => {
    dataFetcher.load(keyUrl);
  }, [keyUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = dataFetcher.state === "loading";
  const data = dataFetcher.data;
  const isDeleting =
    dataFetcher.state === "submitting" && dataFetcher.formMethod === "DELETE";

  const handleDelete = async () => {
    const body: Record<string, string> = {};
    if (returnUrl) {
      body.redirectUrl = returnUrl;
    }
    await dataFetcher.submit(body, { method: "delete", action: keyUrl });

    // Close drawer after successful deletion
    onClosed();
  };

  if (dataFetcher.state === "idle" && !data) {
    return null;
  }

  return (
    <DrawerRoot
      open
      onOpenChange={(e) => {
        if (!e.open) {
          if (document.activeElement instanceof HTMLElement) {
            // trigger blur on active element to save any unsaved changes in TranslationKeyContent before closing
            document.activeElement.blur();
          }
          onClosed();
        }
      }}
      placement="end"
      size="lg"
    >
      <DrawerBackdrop />
      <DrawerPositioner>
        <DrawerContent>
          <DrawerCloseTrigger asChild>
            <IconButton
              size="sm"
              variant="ghost"
              aria-label={t("common.close")}
            >
              ✕
            </IconButton>
          </DrawerCloseTrigger>

          <DrawerHeader borderBottomWidth={1}>
            <HStack>
              <DrawerTitle>
                {data?.key?.keyName ?? t("translations.edit")}
              </DrawerTitle>

              <IconButton
                asChild
                size="sm"
                variant="ghost"
                aria-label={t("translations.openFullPage")}
              >
                <Link to={keyUrl}>
                  <LuExternalLink />
                </Link>
              </IconButton>
            </HStack>
          </DrawerHeader>

          <DrawerBody py={4}>
            {isLoading && !data ? (
              <VStack py={12}>
                <Spinner size="lg" />
                <Text color="fg.muted">{t("common.loading")}</Text>
              </VStack>
            ) : data ? (
              <TranslationKeyContent
                translationKey={data.key}
                languages={data.languages}
                translations={data.translations}
                organization={data.organization}
                project={data.project}
                hasAiProvider={data.hasAiProvider}
                actionUrl={keyUrl}
                compact
              />
            ) : (
              <Box p={4} bg="red.subtle" borderRadius="md">
                <Text color="red.fg">{t("common.error")}</Text>
              </Box>
            )}
          </DrawerBody>

          <DrawerFooter borderTopWidth={1}>
            <Button
              colorPalette="red"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={!data || isDeleting}
              loading={isDeleting}
            >
              <LuTrash2 /> {t("keys.delete")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </DrawerPositioner>
    </DrawerRoot>
  );
}
