import { Box, Stack, Text } from "@chakra-ui/react";
import { BranchList } from "~/components/branches/BranchList";
import { BRANCH_STATUS } from "~/lib/branches";

const SAMPLE_BRANCHES = [
  {
    id: 1,
    name: "feature/add-checkout-translations",
    slug: "feature-add-checkout-translations",
    description: "New keys for the checkout flow",
    status: BRANCH_STATUS.OPEN,
    keyCount: 12,
    deletionCount: 0,
  },
  {
    id: 2,
    name: "fix/update-error-messages",
    slug: "fix-update-error-messages",
    description: null,
    status: BRANCH_STATUS.OPEN,
    keyCount: 5,
    deletionCount: 2,
  },
  {
    id: 3,
    name: "release/v2.1.0",
    slug: "release-v2-1-0",
    description: null,
    status: BRANCH_STATUS.MERGED,
    keyCount: 0,
    deletionCount: 0,
  },
];

export function BranchesMockup() {
  return (
    <Box
      borderRadius="xl"
      overflow="hidden"
      border="1px solid"
      borderColor="border"
      bg="bg"
      boxShadow="md"
      my={6}
    >
      {/* Browser chrome */}
      <Box
        bg="bg.subtle"
        px={4}
        py={2}
        borderBottom="1px solid"
        borderColor="border"
      >
        <Stack direction="row" gap={2} align="center">
          <Box w={3} h={3} borderRadius="full" bg="red.400" />
          <Box w={3} h={3} borderRadius="full" bg="yellow.400" />
          <Box w={3} h={3} borderRadius="full" bg="green.400" />
          <Box
            flex={1}
            mx={4}
            px={3}
            py={1}
            bg="bg"
            borderRadius="md"
            border="1px solid"
            borderColor="border"
          >
            <Text fontSize="xs" color="fg.muted" fontFamily="mono">
              transi-store.com/orgs/acme/projects/webapp/branches
            </Text>
          </Box>
        </Stack>
      </Box>

      {/* Real BranchList component with sample data — non-interactive */}
      <Box p={4} pointerEvents="none">
        <BranchList
          branches={SAMPLE_BRANCHES}
          organizationSlug="acme"
          projectSlug="webapp"
        />
      </Box>
    </Box>
  );
}
