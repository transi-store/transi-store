/**
 * TranslationKeyDrawer
 *
 * A Chakra UI Drawer that loads a translation key's data via useFetcher
 * and renders <TranslationKeyContent /> for inline editing from the
 * translations list — without navigating to a separate page.
 *
 * The drawer waits for all pending save operations before closing,
 * ensuring data consistency.
 */
import { useEffect, useState } from "react";
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
  /** Called when the drawer is fully closed (after all pending saves). */
  onClosed: () => void;
};

export function TranslationKeyDrawer({
  keyId,
  organizationSlug,
  projectSlug,
  onClosed,
}: TranslationKeyDrawerProps) {
  const { t } = useTranslation();

  // Fetcher for loading key data
  const dataFetcher = useFetcher<KeyLoaderData>();

  // Track if user wants to close (wait for pending operations)
  const [isClosing, setIsClosing] = useState(false);

  // Track active fetchers from TranslationKeyContent
  const [activeFetchers, setActiveFetchers] = useState(0);

  // Derive whether the drawer should be open
  const keyUrl = getKeyUrl(organizationSlug, projectSlug, keyId);
  const isDeleteSuccessful =
    dataFetcher.state === "idle" &&
    !!dataFetcher.data &&
    dataFetcher.formMethod === "DELETE";
  const internalOpen =
    !isDeleteSuccessful && !(isClosing && activeFetchers === 0);

  // Notify parent after successful deletion
  useEffect(() => {
    if (isDeleteSuccessful) {
      onClosed();
    }
  }, [isDeleteSuccessful, onClosed]);

  // Notify parent when user wants to close AND no pending operations
  useEffect(() => {
    if (isClosing && activeFetchers === 0) {
      onClosed();
    }
  }, [isClosing, activeFetchers, onClosed]);

  // Load key data when component mounts or keyId changes
  useEffect(() => {
    dataFetcher.load(keyUrl);
  }, [keyUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = dataFetcher.state === "loading";
  const data = dataFetcher.data;
  const isDeleting =
    dataFetcher.state === "submitting" && dataFetcher.formMethod === "DELETE";

  const handleDelete = () => {
    dataFetcher.submit({}, { method: "delete", action: keyUrl });
  };

  const handleCloseRequest = () => {
    setIsClosing(true);
  };

  const handleFetcherStateChange = (count: number) => {
    setActiveFetchers(count);
  };

  if (dataFetcher.state === "idle" && !data) {
    return null;
  }

  return (
    <DrawerRoot
      open={internalOpen}
      onOpenChange={(e) => {
        if (!e.open) {
          handleCloseRequest();
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
                onFetcherStateChange={handleFetcherStateChange}
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
