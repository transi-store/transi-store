import { Box, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type MockupContainerProps = {
  url: string;
  children: ReactNode;
};

export function MockupContainer({ url, children }: MockupContainerProps) {
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
      {/* Browser address bar — neutral style */}
      <Box
        bg="bg.subtle"
        px={4}
        py={2}
        borderBottom="1px solid"
        borderColor="border"
      >
        <Box
          px={3}
          py={1}
          bg="bg"
          borderRadius="md"
          border="1px solid"
          borderColor="border"
        >
          <Text fontSize="xs" color="fg.muted" fontFamily="mono">
            {url}
          </Text>
        </Box>
      </Box>

      {children}
    </Box>
  );
}
