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
  HStack,
  Input,
  Portal,
  Select,
  Text,
  VStack,
  createListCollection,
} from "@chakra-ui/react";
import { useFetcher } from "react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SupportedFormat, FORMAT_LABELS } from "@transi-store/common";

type ProjectFile = { id: number; filePath: string; format: string };

type FileManagementModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  file?: ProjectFile;
  onDeleted?: () => void;
};

type ActionData = {
  success?: boolean;
  error?: string;
  action?: string;
};

export function FileManagementModal({
  isOpen,
  onOpenChange,
  mode,
  file,
  onDeleted,
}: FileManagementModalProps) {
  const fetcher = useFetcher<ActionData>();
  const { t } = useTranslation();
  const isSubmitting = fetcher.state !== "idle";

  const formatCollection = createListCollection({
    items: Object.values(SupportedFormat).map((value) => ({
      label: FORMAT_LABELS[value],
      value,
    })),
  });

  const defaultFormat =
    (file?.format as SupportedFormat) ?? SupportedFormat.JSON;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      if (fetcher.data.action === "delete_file") {
        onDeleted?.();
      } else {
        onOpenChange(false);
      }
    }
  }, [fetcher.state, fetcher.data, onOpenChange, onDeleted]);

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <fetcher.Form method="post">
              <input
                type="hidden"
                name="_action"
                value={mode === "create" ? "add_file" : "edit_file"}
              />
              {file && (
                <input type="hidden" name="fileId" value={String(file.id)} />
              )}
              <DialogHeader>
                <DialogTitle>
                  {mode === "create"
                    ? t("files.modal.titleCreate")
                    : t("files.modal.titleEdit")}
                </DialogTitle>
                <DialogCloseTrigger />
              </DialogHeader>
              <DialogBody>
                <VStack align="stretch" gap={4}>
                  {fetcher.data?.error && (
                    <Text color="fg.error">{fetcher.data.error}</Text>
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
                    <Field.Label>{t("files.modal.outputLabel")}</Field.Label>
                    <Input
                      name="fileOutput"
                      defaultValue={file?.filePath}
                      placeholder="locales/<lang>/common.json"
                      fontFamily="mono"
                      fontSize="sm"
                      disabled={isSubmitting}
                    />
                    <Field.HelperText>
                      {t("files.modal.outputHelperPrefix")}{" "}
                      <Code fontSize="xs">&lt;lang&gt;</Code>{" "}
                      {t("files.modal.outputHelperSuffix")}
                    </Field.HelperText>
                  </Field.Root>
                </VStack>
              </DialogBody>
              <DialogFooter>
                <HStack justify="space-between" flex={1}>
                  {mode === "edit" && file && (
                    <Box>
                      <Button
                        type="button"
                        colorPalette="red"
                        variant="ghost"
                        disabled={isSubmitting}
                        onClick={() => {
                          fetcher.submit(
                            { _action: "delete_file", fileId: String(file.id) },
                            { method: "post" },
                          );
                        }}
                      >
                        {t("keys.delete")}
                      </Button>
                    </Box>
                  )}
                  <HStack ml="auto">
                    <Button
                      variant="ghost"
                      disabled={isSubmitting}
                      onClick={() => onOpenChange(false)}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      type="submit"
                      colorPalette="brand"
                      loading={isSubmitting}
                    >
                      {mode === "create"
                        ? t("files.modal.submit")
                        : t("files.modal.save")}
                    </Button>
                  </HStack>
                </HStack>
              </DialogFooter>
            </fetcher.Form>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
