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
import { VStack, Box, Text, Input, Button } from "@chakra-ui/react";
import { Form } from "react-router";
import { useTranslation } from "react-i18next";

type InviteMemberDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InviteMemberDialog({
  isOpen,
  onOpenChange,
}: InviteMemberDialogProps) {
  const { t } = useTranslation();

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("members.invite")}</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              <Form method="post" id="invite-form">
                <input type="hidden" name="intent" value="invite-user" />
                <VStack align="stretch" gap={4}>
                  <Box>
                    <Text mb={2}>{t("members.invite.emailLabel")}</Text>
                    <Input
                      name="email"
                      type="email"
                      placeholder="email@exemple.com"
                      required
                    />
                  </Box>
                </VStack>
              </Form>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" form="invite-form" colorScheme="brand">
                {t("members.createInvitation")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
