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
import { VStack, Text, Input, Button } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

type CopyLinkFallbackDialogProps = {
  isOpen: boolean;
  link: string;
  onClose: () => void;
};

export function CopyLinkFallbackDialog({
  isOpen,
  link,
  onClose,
}: CopyLinkFallbackDialogProps) {
  const { t } = useTranslation();

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("members.inviteLink.title")}</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              <VStack align="stretch" gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  {t("members.inviteLink.copyError")}
                </Text>
                <Input
                  value={link}
                  readOnly
                  onClick={(e) => e.currentTarget.select()}
                />
              </VStack>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onClose}>{t("cancel")}</Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
