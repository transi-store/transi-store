import { Box, Text, HStack, Badge, Card, IconButton } from "@chakra-ui/react";
import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import { LuTrash2 } from "react-icons/lu";
import type { OrganizationMember, User } from "../../../../drizzle/schema";

export type Member = OrganizationMember & {
  user: User;
  isCurrentUser: boolean;
};

type MemberItemProps = {
  member: Member;
};

export function MemberItem({ member }: MemberItemProps) {
  const { t } = useTranslation();

  return (
    <Card.Root>
      <Card.Body>
        <HStack justify="space-between">
          <Box flex="1">
            <HStack>
              <Text fontWeight="medium">
                {member.user.name || member.user.email}
              </Text>
              {member.isCurrentUser && (
                <Badge colorPalette="brand">{t("members.you")}</Badge>
              )}
            </HStack>
            <Text fontSize="sm" color="fg.muted">
              {member.user.email}
            </Text>
            <Text fontSize="xs" color="fg.subtle">
              {t("members.memberSince")}{" "}
              {new Date(member.createdAt).toLocaleDateString("fr-FR")}
            </Text>
          </Box>
          {!member.isCurrentUser && (
            <Form method="post">
              <input type="hidden" name="intent" value="remove-member" />
              <input type="hidden" name="membershipId" value={member.id} />
              <IconButton
                type="submit"
                aria-label={t("members.removeMemberAria")}
                variant="ghost"
                colorPalette="red"
                onClick={(e) => {
                  if (!confirm(t("members.removeMemberConfirm"))) {
                    e.preventDefault();
                  }
                }}
              >
                <LuTrash2 />
              </IconButton>
            </Form>
          )}
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
