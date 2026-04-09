import {
  Box,
  Container,
  Heading,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Link, useLocation } from "react-router";

interface DocNavItem {
  label: string;
  href: string;
}

interface DocNavSection {
  title: string;
  items: DocNavItem[];
}

const NAV_SECTIONS: DocNavSection[] = [
  {
    title: "User Guide",
    items: [
      { label: "Getting Started", href: "/docs/usage#getting-started" },
      {
        label: "Managing Translations",
        href: "/docs/usage#managing-translations",
      },
      { label: "Branch Management", href: "/docs/usage#branch-management" },
      { label: "Import and Export", href: "/docs/usage#import-and-export" },
      { label: "AI Translations", href: "/docs/usage#ai-translations" },
      { label: "Team Collaboration", href: "/docs/usage#team-collaboration" },
    ],
  },
  {
    title: "Developer Guide",
    items: [
      {
        label: "Self-Hosting Overview",
        href: "/docs/developer#self-hosting-overview",
      },
      { label: "Requirements", href: "/docs/developer#requirements" },
      { label: "Installation", href: "/docs/developer#installation" },
      { label: "Configuration", href: "/docs/developer#configuration" },
      {
        label: "Running in Production",
        href: "/docs/developer#running-in-production",
      },
      { label: "CLI Tool", href: "/docs/developer#cli-tool" },
    ],
  },
];

interface DocLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function DocLayout({ title, description, children }: DocLayoutProps) {
  const location = useLocation();

  return (
    <Container
      maxW="container.xl"
      py={{ base: 6, md: 10 }}
      px={{ base: 3, md: 4 }}
    >
      <Box
        display={{ base: "block", md: "grid" }}
        gridTemplateColumns={{ md: "260px 1fr" }}
        gap={8}
        alignItems="start"
      >
        <Box
          as="aside"
          position={{ md: "sticky" }}
          top={{ md: 24 }}
          mb={{ base: 6, md: 0 }}
          bg="surface.panel"
          border="1px solid"
          borderColor="surface.border"
          borderRadius="3xl"
          p={5}
          boxShadow={{
            base: "0 18px 36px rgba(15, 23, 42, 0.06)",
            _dark: "0 18px 36px rgba(0, 0, 0, 0.22)",
          }}
        >
          <VStack gap={6} align="stretch">
            {NAV_SECTIONS.map((section) => (
              <Box key={section.title}>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  letterSpacing="0.2em"
                  color="fg.muted"
                  mb={2}
                >
                  {section.title}
                </Text>
                <VStack gap={1} align="stretch">
                  {section.items.map((item) => {
                    const itemPath = item.href.split("#")[0];
                    const itemHash = item.href.includes("#")
                      ? `#${item.href.split("#")[1]}`
                      : "";
                    const isActive =
                      location.pathname === itemPath &&
                      location.hash === itemHash;
                    return (
                      <Box
                        key={item.href}
                        asChild
                        px={3}
                        py={2}
                        borderRadius="xl"
                        fontSize="sm"
                        bg={isActive ? "surface.highlight" : "transparent"}
                        color={isActive ? "fg" : "fg.muted"}
                        fontWeight={isActive ? "medium" : "normal"}
                        border="1px solid"
                        borderColor={isActive ? "brand.muted" : "transparent"}
                        _hover={{ bg: "surface.panelMuted", color: "fg" }}
                        transition="all 0.15s"
                      >
                        <Link to={item.href}>{item.label}</Link>
                      </Box>
                    );
                  })}
                </VStack>
              </Box>
            ))}
          </VStack>
        </Box>

        <Box
          as="main"
          minW={0}
          bg="surface.panel"
          border="1px solid"
          borderColor="surface.border"
          borderRadius="4xl"
          px={{ base: 6, md: 8 }}
          py={{ base: 8, md: 10 }}
          boxShadow={{
            base: "0 24px 48px rgba(15, 23, 42, 0.08)",
            _dark: "0 24px 48px rgba(0, 0, 0, 0.26)",
          }}
        >
          <Box mb={8}>
            <Heading as="h1" size="2xl" mb={2}>
              {title}
            </Heading>
            {description && (
              <Text color="fg.muted" textStyle="lg">
                {description}
              </Text>
            )}
          </Box>

          <Separator mb={8} />

          <Box
            css={{
              "& h1:first-child, & h2:first-child": { marginTop: 0 },
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
