import { Badge, Box, HStack, Stack, Text, VStack } from "@chakra-ui/react";
import { LuGitBranch, LuGitMerge } from "react-icons/lu";

const SAMPLE_BRANCHES = [
  {
    name: "feature/add-checkout-translations",
    status: "open",
    keys: 12,
    deletions: 0,
  },
  {
    name: "fix/update-error-messages",
    status: "open",
    keys: 5,
    deletions: 2,
  },
  {
    name: "release/v2.1.0",
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
              transi-store.io/orgs/acme/projects/webapp/branches
            </Text>
          </Box>
        </Stack>
      </Box>

      {/* Content */}
      <Box p={4}>
        <HStack justify="space-between" mb={4}>
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
            + New branch
          </Box>
        </HStack>

        <VStack gap={2} align="stretch">
          {SAMPLE_BRANCHES.map((branch) => (
            <Box
              key={branch.name}
              p={3}
              borderRadius="md"
              border="1px solid"
              borderColor="border"
              bg="bg.subtle"
            >
              <HStack justify="space-between">
                <HStack>
                  {branch.status === "merged" ? (
                    <LuGitMerge color="var(--chakra-colors-purple-500)" />
                  ) : (
                    <LuGitBranch color="var(--chakra-colors-green-500)" />
                  )}
                  <Text
                    fontWeight="medium"
                    fontSize="sm"
                    color={branch.status === "merged" ? "fg.muted" : "fg"}
                  >
                    {branch.name}
                  </Text>
                  <Badge
                    colorPalette={branch.status === "open" ? "green" : "purple"}
                    size="sm"
                  >
                    {branch.status}
                  </Badge>
                </HStack>
                <HStack gap={2}>
                  {branch.status === "open" && (
                    <>
                      <Badge variant="outline" size="sm">
                        {branch.keys} keys
                      </Badge>
                      {branch.deletions > 0 && (
                        <Badge variant="outline" colorPalette="red" size="sm">
                          {branch.deletions} deletions
                        </Badge>
                      )}
                      <Box
                        px={2}
                        py={0.5}
                        border="1px solid"
                        borderColor="border"
                        borderRadius="md"
                        fontSize="xs"
                        cursor="pointer"
                        _hover={{ bg: "bg.subtle" }}
                      >
                        Edit
                      </Box>
                    </>
                  )}
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>
    </Box>
  );
}
