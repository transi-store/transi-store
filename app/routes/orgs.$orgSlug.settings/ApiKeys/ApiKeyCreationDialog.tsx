import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  DialogBackdrop,
  DialogPositioner,
  Portal,
} from "@chakra-ui/react";
import { Box, Text, Input, Button, VStack } from "@chakra-ui/react";
import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import { LuPlus } from "react-icons/lu";

type ApiKeyCreationDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApiKeyCreationDialog({
  isOpen,
  onOpenChange,
}: ApiKeyCreationDialogProps) {
  const { t } = useTranslation();

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("settings.apiKeys.createTitle")}</DialogTitle>
            </DialogHeader>
            <DialogCloseTrigger />
            <Form method="post">
              <input type="hidden" name="intent" value="create-api-key" />
              <DialogBody pb={6}>
                <VStack align="stretch" gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      {t("settings.apiKeys.nameLabel")}
                    </Text>
                    <Input
                      name="name"
                      placeholder={t("settings.apiKeys.namePlaceholder")}
                      maxLength={255}
                    />
                    <Text fontSize="xs" color="fg.muted" mt={1}>
                      {t("settings.apiKeys.nameHelp")}
                    </Text>
                  </Box>
                </VStack>
              </DialogBody>
              <DialogFooter gap={3}>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t("settings.cancel")}
                </Button>
                <Button type="submit" colorPalette="brand">
                  <LuPlus /> {t("settings.create")}
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
