import { Heading, VStack, Box, Text } from "@chakra-ui/react";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/orgs.$orgSlug.members";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { db } from "~/lib/db.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  // Récupérer les membres
  const memberships = await db.query.organizationMembers.findMany({
    where: { organizationId: organization.id },
  });

  // Récupérer les utilisateurs correspondants
  const userIds = memberships.map((m) => m.userId);
  const users =
    userIds.length > 0
      ? await db.query.users.findMany({
          where: { id: { in: userIds } },
        })
      : [];

  // Combiner les données
  const members = memberships.map((m) => ({
    ...m,
    user: users.find((u) => u.id === m.userId)!,
  }));

  return { members };
}

export default function OrganizationMembers() {
  const { members } = useLoaderData<typeof loader>();

  return (
    <Box pt={6}>
      <Heading as="h2" size="lg" mb={4}>
        Membres ({members.length})
      </Heading>

      <VStack align="stretch" gap={2}>
        {members.map((member) => (
          <Box key={member.id} p={4} borderWidth={1} borderRadius="md">
            <Text fontWeight="medium">
              {member.user.name || member.user.email}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {member.user.email}
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
