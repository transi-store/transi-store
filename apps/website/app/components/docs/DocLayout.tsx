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
    <Container maxW="container.xl" py={{ base: 6, md: 10 }}>
      <Box
        display={{ base: "block", md: "grid" }}
        gridTemplateColumns={{ md: "240px 1fr" }}
        gap={8}
        alignItems="start"
      >
        <Box
          as="aside"
          position={{ md: "sticky" }}
          top={{ md: 20 }}
          mb={{ base: 6, md: 0 }}
          bg="surface.panel"
          border="1px solid"
          borderColor="surface.border"
          borderRadius="lg"
          p={4}
          boxShadow="0 0 12px rgba(67,174,206,0.08)"
        >
          <VStack gap={5} align="stretch">
            {NAV_SECTIONS.map((section) => (
              <Box key={section.title}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="0.15em"
                  color="neon.fg"
                  textShadow="0 0 8px rgba(67,174,206,0.3)"
                  mb={2}
                >
                  {section.title}
                </Text>
                <VStack gap={0.5} align="stretch">
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
                        py={1.5}
                        borderRadius="md"
                        fontSize="sm"
                        bg={isActive ? "surface.highlight" : "transparent"}
                        color={isActive ? "fg" : "fg.muted"}
                        fontWeight={isActive ? "medium" : "normal"}
                        borderLeft="2px solid"
                        borderColor={isActive ? "brand.solid" : "transparent"}
                        _hover={{ bg: "surface.panelMuted", color: "fg" }}
                        transition="all 0.15s"
                        boxShadow={
                          isActive
                            ? "inset 2px 0 8px rgba(59,130,246,0.2)"
                            : undefined
                        }
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

        <Box as="main" minW={0}>
          <Box mb={8}>
            <Heading as="h1" size="2xl" mb={2} fontFamily="heading">
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
