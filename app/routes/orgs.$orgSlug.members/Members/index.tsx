import { VStack, Heading } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { MemberItem, type Member } from "./MemberItem";

type MembersListProps = {
  members: Array<Member>;
};

export default function MembersList({ members }: MembersListProps) {
  const { t } = useTranslation();

  return (
    <VStack align="stretch" gap={4} mb={8}>
      <Heading as="h3" size="md">
        {t("members.listTitle", { count: members.length })}
      </Heading>
      {members.map((member) => (
        <MemberItem key={member.id} member={member} />
      ))}
    </VStack>
  );
}
