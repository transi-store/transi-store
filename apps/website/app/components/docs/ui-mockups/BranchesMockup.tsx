import {
  Badge,
  Box,
  Card,
  HStack,
  Progress,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuGitBranch, LuGitMerge } from "react-icons/lu";

const SAMPLE_BRANCHES = [
  {
    name: "feature/add-checkout-translations",
    description: "New keys for the checkout flow",
    status: "open",
    keys: 12,
    deletions: 0,
  },
  {
    name: "fix/update-error-messages",
    description: undefined,
    status: "open",
    keys: 5,
    deletions: 2,
  },
  {
    name: "release/v2.1.0",
    description: undefined,
    status: "merged",
    keys: 0,
    deletions: 0,
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

      {/* Content */}
      <Box p={4}>
        <Stack
          direction={{ base: "column", sm: "row" }}
          justify="space-between"
          align={{ base: "stretch", sm: "center" }}
          gap={3}
          mb={4}
        >
          <HStack>
            <LuGitBranch />
            <Text fontWeight="semibold" fontSize="lg">
              Branches
            </Text>
          </HStack>
          <Box
            px={3}
            py={1.5}
            bg="accent.solid"
            color="white"
            borderRadius="md"
            fontSize="sm"
            fontWeight="semibold"
          >
            + Create branch
          </Box>
        </Stack>

        <VStack gap={3} align="stretch">
          {SAMPLE_BRANCHES.map((branch) => (
            <Card.Root key={branch.name} size="sm">
              <Card.Body>
                <HStack justify="space-between" align="center">
                  <VStack align="start" gap={1}>
                    <HStack>
                      <LuGitBranch />
                      <Text
                        fontWeight="semibold"
                        color={branch.status === "merged" ? "fg.muted" : "fg"}
                      >
                        {branch.name}
                      </Text>
                      <Badge
                        colorPalette={
                          branch.status === "open" ? "green" : "purple"
                        }
                        size="sm"
                      >
                        {branch.status === "open" ? "Open" : "Merged"}
                      </Badge>
                    </HStack>
                    {branch.description && (
                      <Text color="fg.muted" fontSize="sm">
                        {branch.description}
                      </Text>
                    )}
                  </VStack>
                  <HStack gap={3}>
                    {branch.status === "open" && (
                      <>
                        <Badge variant="outline" size="sm">
                          {branch.keys} {branch.keys === 1 ? "key" : "keys"}
                        </Badge>
                        {branch.deletions > 0 && (
                          <Badge variant="outline" size="sm" colorPalette="red">
                            {branch.deletions}{" "}
                            {branch.deletions === 1 ? "deletion" : "deletions"}
                          </Badge>
                        )}
                        <Box
                          px={2}
                          py={1}
                          border="1px solid"
                          borderColor="border"
                          borderRadius="md"
                          fontSize="sm"
                          cursor="pointer"
                        >
                          Edit
                        </Box>
                      </>
                    )}
                  </HStack>
                </HStack>
              </Card.Body>
            </Card.Root>
          ))}
        </VStack>
      </Box>
    </Box>
  );
}
