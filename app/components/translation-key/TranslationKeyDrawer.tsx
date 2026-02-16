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
import { useEffect, useRef, useState } from "react";
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

type DrawerLoaderData = {
  organization: { id: number; slug: string; name: string };
  project: { id: number; slug: string; name: string };
  key: {
    id: number;
    keyName: string;
    description: string | null;
    projectId: number;
  };
  languages: Array<{ id: number; locale: string; isDefault: boolean }>;
  translations: Array<{ locale: string; value: string }>;
  hasAiProvider: boolean;
};

type TranslationKeyDrawerProps = {
  /** The key ID to edit. Required when open=true. */
  keyId: number;
  organizationSlug: string;
  projectSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the drawer is fully closed (after all pending saves). */
  onClosed: () => void;
  /** Called after the key is deleted so the parent can revalidate. */
  onDeleted: () => void;
};

export function TranslationKeyDrawer({
  keyId,
  organizationSlug,
  projectSlug,
  open,
  onOpenChange,
  onClosed,
  onDeleted,
}: TranslationKeyDrawerProps) {
  const { t } = useTranslation();

  // Fetcher for loading key data
  const dataFetcher = useFetcher<DrawerLoaderData>();

  // Track if user wants to close (wait for pending operations)
  const [isClosing, setIsClosing] = useState(false);

  // Track active fetchers from TranslationKeyContent
  const activeFetchersRef = useRef(0);

  // Internal open state to prevent premature closing
  const [internalOpen, setInternalOpen] = useState(open);

  const keyUrl = getKeyUrl(organizationSlug, projectSlug, keyId);

  // Sync internal open state with external prop when opening
  useEffect(() => {
    if (open && !internalOpen) {
      setInternalOpen(true);
      setIsClosing(false);
    }
  }, [open, internalOpen]);

  // Load key data when opened or keyId changes
  useEffect(() => {
    if (open && keyUrl) {
      dataFetcher.load(keyUrl);
    }
  }, [open, keyUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  //   // Close drawer after successful deletion
  //   useEffect(() => {
  //     if (deleteFetcher.state === "idle" && deleteFetcher.data !== undefined) {
  //       setInternalOpen(false);
  //       setIsClosing(false);
  //       onOpenChange(false);
  //       onDeleted?.();
  //       onClosed?.();
  //     }
  //   }, [deleteFetcher.state, deleteFetcher.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Actually close the drawer when user wants to close AND no pending operations
  useEffect(() => {
    if (isClosing && activeFetchersRef.current === 0) {
      setInternalOpen(false);
      setIsClosing(false);
      onOpenChange(false);
      onClosed();
    }
  }, [isClosing, onOpenChange, onClosed]);

  const isLoading =
    dataFetcher.state === "loading" || dataFetcher.state === "submitting";
  const data = dataFetcher.data;

  const handleDelete = async () => {
    // Use native fetch instead of useFetcher to avoid React Router
    // revalidating the now-deleted key route (which would 404).
    // await fetch(keyUrl, {
    //   method: "DELETE",
    //   headers: { Accept: "application/json" },
    // });

    await dataFetcher.submit(
      {
        // skipRevalidation: "true",
        // redirectUrl: `/orgs/${organizationSlug}/projects/${projectSlug}/translations`,
        // _action: "deleteKey",
        // keyId: String(keyId),
      },
      {
        method: "delete",
        action: keyUrl,
      },
    );

    setInternalOpen(false);
    setIsClosing(false);
    onOpenChange(false);
    onDeleted();
    onClosed();
  };

  const handleCloseRequest = () => {
    setIsClosing(true);
  };

  const handleFetcherStateChange = (activeFetchers: number) => {
    activeFetchersRef.current = activeFetchers;
  };

  // Unmount drawer during/after deletion to prevent revalidation 404
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
              disabled={!data}
            >
              <LuTrash2 /> {t("keys.delete")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </DrawerPositioner>
    </DrawerRoot>
  );
}
