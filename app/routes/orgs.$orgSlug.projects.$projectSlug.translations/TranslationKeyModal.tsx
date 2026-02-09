import {
  Box,
  Button,
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
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { Form } from "react-router";
import { useTranslation } from "react-i18next";

type TranslationKeyModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: TRANSLATIONS_KEY_MODEL_MODE;
  defaultValues?: {
    keyName?: string;
    description?: string;
  };
  error?: string;
  isSubmitting?: boolean;
};

export const TRANSLATIONS_KEY_MODEL_MODE = {
  CREATE: "create",
  EDIT: "edit",
};
export type TRANSLATIONS_KEY_MODEL_MODE =
  (typeof TRANSLATIONS_KEY_MODEL_MODE)[keyof typeof TRANSLATIONS_KEY_MODEL_MODE];

export function TranslationKeyModal({
  isOpen,
  onOpenChange,
  mode,
  defaultValues,
  error,
  isSubmitting = false,
}: TranslationKeyModalProps) {
  const { t } = useTranslation();
  const isCreate = mode === TRANSLATIONS_KEY_MODEL_MODE.CREATE;

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <Form method="post">
              <input
                type="hidden"
                name="_action"
                value={isCreate ? "createKey" : "editKey"}
              />
              <DialogHeader>
                <DialogTitle>
                  {isCreate ? t("keys.new.title") : t("keys.edit.title")}
                </DialogTitle>
              </DialogHeader>
              <DialogCloseTrigger />
              <DialogBody pb={6}>
                {error && (
                  <Box
                    p={4}
                    bg="red.subtle"
                    color="red.fg"
                    borderRadius="md"
                    mb={4}
                  >
                    {error}
                  </Box>
                )}
                <VStack gap={4} align="stretch">
                  <Field.Root required>
                    <Field.Label>
                      {isCreate
                        ? t("keys.new.nameLabel")
                        : t("keys.edit.keyLabel")}
                    </Field.Label>
                    <Input
                      name="keyName"
                      placeholder={
                        isCreate ? t("keys.new.namePlaceholder") : undefined
                      }
                      defaultValue={defaultValues?.keyName}
                      disabled={isSubmitting}
                      fontFamily="mono"
                      required
                    />
                    {isCreate && (
                      <Field.HelperText>
                        {t("keys.new.nameHelper")}
                      </Field.HelperText>
                    )}
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>
                      {isCreate
                        ? t("keys.new.descriptionLabel")
                        : t("keys.edit.descriptionLabel")}
                    </Field.Label>
                    <Textarea
                      name="description"
                      placeholder={t("keys.edit.descriptionPlaceholder")}
                      defaultValue={defaultValues?.description}
                      disabled={isSubmitting}
                      rows={3}
                    />
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
                  {isCreate ? t("keys.new.create") : t("keys.edit.save")}
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
