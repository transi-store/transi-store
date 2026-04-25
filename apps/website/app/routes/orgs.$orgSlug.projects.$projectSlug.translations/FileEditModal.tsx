import {
  Box,
  Button,
  Code,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Field,
  Input,
  Portal,
  Select,
  Text,
  VStack,
  createListCollection,
} from "@chakra-ui/react";
import { useFetcher, useNavigate, useParams } from "react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SupportedFormat, FORMAT_LABELS } from "@transi-store/common";
import { getTranslationsUrl } from "~/lib/routes-helpers";

type ProjectFile = { id: number; filePath: string; format: string };

type FileEditModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the modal opens in edit mode for that file. When undefined, it opens in create mode. */
  file?: ProjectFile;
};

type ActionData = {
  success?: boolean;
  fileId?: number;
  error?: string;
  action?: string;
};

export function FileEditModal({
  isOpen,
  onOpenChange,
  file,
}: FileEditModalProps) {
  const fetcher = useFetcher<ActionData>();
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useTranslation();
  const isSubmitting = fetcher.state !== "idle";
  const isEditMode = file !== undefined;
  const formAction = isEditMode ? "edit_file" : "create_file";

  const formatCollection = createListCollection({
    items: Object.values(SupportedFormat).map((value) => ({
      label: FORMAT_LABELS[value],
      value,
    })),
  });

  const defaultFormat =
    (file?.format as SupportedFormat | undefined) ?? SupportedFormat.JSON;

  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data?.success &&
      fetcher.data.action === formAction
    ) {
      onOpenChange(false);
      if (fetcher.data.action === "create_file" && fetcher.data.fileId) {
        navigate(
          getTranslationsUrl(params.orgSlug ?? "", params.projectSlug ?? "", {
            fileId: fetcher.data.fileId,
          }),
        );
      }
    }
  }, [fetcher.state, fetcher.data, onOpenChange, formAction, navigate, params]);

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <fetcher.Form method="post">
              <input type="hidden" name="_action" value={formAction} />
              {isEditMode && (
                <input type="hidden" name="fileId" value={String(file.id)} />
              )}
              <DialogHeader>
                <DialogTitle>
                  {isEditMode
                    ? t("files.modal.titleEdit")
                    : t("files.modal.titleCreate")}
                </DialogTitle>
                <DialogCloseTrigger />
              </DialogHeader>
              <DialogBody>
                <VStack align="stretch" gap={4}>
                  {fetcher.data?.error && (
                    <Box p={3} bg="red.subtle" color="red.fg" borderRadius="md">
                      <Text>{fetcher.data.error}</Text>
                    </Box>
                  )}
                  <Field.Root required>
                    <Field.Label>{t("files.modal.formatLabel")}</Field.Label>
                    <Select.Root
                      collection={formatCollection}
                      name="fileFormat"
                      defaultValue={[defaultFormat]}
                      disabled={isSubmitting}
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
                            {formatCollection.items.map((item) => (
                              <Select.Item item={item} key={item.value}>
                                {item.label}
                                <Select.ItemIndicator />
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Positioner>
                      </Portal>
                    </Select.Root>
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label>{t("files.modal.pathLabel")}</Field.Label>
                    <Input
                      name="filePath"
                      defaultValue={file?.filePath ?? ""}
                      placeholder="locales/<lang>/common.json"
                      fontFamily="mono"
                      fontSize="sm"
                      disabled={isSubmitting}
                      required
                    />
                    <Field.HelperText>
                      {t("files.modal.pathHelperPrefix")}{" "}
                      <Code fontSize="xs">&lt;lang&gt;</Code>{" "}
                      {t("files.modal.pathHelperSuffix")}
                    </Field.HelperText>
                  </Field.Root>
                </VStack>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {t("settings.cancel")}
                </Button>
                <Button
                  type="submit"
                  colorPalette="brand"
                  loading={isSubmitting}
                >
                  {isEditMode ? t("files.modal.save") : t("files.modal.create")}
                </Button>
              </DialogFooter>
            </fetcher.Form>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
