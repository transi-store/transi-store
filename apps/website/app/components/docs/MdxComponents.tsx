import {
  Box,
  Code,
  Heading,
  HStack,
  Link,
  Separator,
  Text,
} from "@chakra-ui/react";
import type { MDXComponents } from "mdx/types";

export const mdxComponents: MDXComponents = {
  h1: ({ children, id }) => (
    <Heading as="h1" id={id} size="2xl" mt={8} mb={4} lineHeight="tight">
      {children}
    </Heading>
  ),
  h2: ({ children, id }) => (
    <Heading as="h2" id={id} size="xl" mt={8} mb={3} lineHeight="tight">
      {children}
    </Heading>
  ),
  h3: ({ children, id }) => (
    <Heading as="h3" id={id} size="lg" mt={6} mb={2}>
      {children}
    </Heading>
  ),
  h4: ({ children, id }) => (
    <Heading as="h4" id={id} size="md" mt={4} mb={2}>
      {children}
    </Heading>
  ),
  p: ({ children }) => (
    <Text mb={4} lineHeight="tall" color="fg">
      {children}
    </Text>
  ),
  ul: ({ children }) => (
    <Box as="ul" pl={6} mb={4} css={{ listStyleType: "disc" }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box as="ol" pl={6} mb={4} css={{ listStyleType: "decimal" }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Box as="li" mb={1} lineHeight="tall">
      {children}
    </Box>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <Box
          as="pre"
          bg="bg.subtle"
          border="1px solid"
          borderColor="border"
          borderRadius="md"
          p={4}
          mb={4}
          overflowX="auto"
          fontSize="sm"
          fontFamily="mono"
        >
          <Box as="code">{children}</Box>
        </Box>
      );
    }
    return (
      <Code
        bg="bg.subtle"
        px={1.5}
        py={0.5}
        borderRadius="sm"
        fontSize="sm"
        fontFamily="mono"
      >
        {children}
      </Code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <Box
      borderLeftWidth={3}
      borderColor="accent.solid"
      pl={4}
      py={1}
      mb={4}
      bg="bg.subtle"
      borderRadius="sm"
    >
      {children}
    </Box>
  ),
  hr: () => <Separator my={8} />,
  a: ({ href, children }) => (
    <Link href={href} color="accent.solid" textDecoration="underline">
      {children}
    </Link>
  ),
  strong: ({ children }) => (
    <Text as="strong" fontWeight="semibold">
      {children}
    </Text>
  ),
  em: ({ children }) => <Text as="em">{children}</Text>,
  table: ({ children }) => (
    <Box overflowX="auto" mb={4}>
      <Box
        as="table"
        width="full"
        borderWidth={1}
        borderColor="border"
        borderRadius="md"
        overflow="hidden"
      >
        {children}
      </Box>
    </Box>
  ),
  thead: ({ children }) => (
    <Box as="thead" bg="bg.subtle">
      {children}
    </Box>
  ),
  tbody: ({ children }) => <Box as="tbody">{children}</Box>,
  tr: ({ children }) => (
    <HStack as="tr" borderBottomWidth={1} borderColor="border">
      {children}
    </HStack>
  ),
  th: ({ children }) => (
    <Box
      as="th"
      px={4}
      py={2}
      textAlign="left"
      fontWeight="semibold"
      fontSize="sm"
    >
      {children}
    </Box>
  ),
  td: ({ children }) => (
    <Box as="td" px={4} py={2} fontSize="sm">
      {children}
    </Box>
  ),
};
