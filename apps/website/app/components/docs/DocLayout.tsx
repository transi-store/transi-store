import {
  Box,
  Button,
  Collapsible,
  Container,
  Heading,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

/** Subtle circuit-board traces as a background for the doc sidebar. */
function SidebarCircuitBg() {
  return (
    <Box
      position="absolute"
      inset={0}
      pointerEvents="none"
      overflow="hidden"
      opacity={0.1}
      borderRadius="lg"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 240 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Horizontal traces */}
        <line
          x1="0"
          y1="60"
          x2="120"
          y2="60"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="140"
          y1="60"
          x2="240"
          y2="60"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="200"
          x2="80"
          y2="200"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <line
          x1="100"
          y1="200"
          x2="240"
          y2="200"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <line
          x1="20"
          y1="340"
          x2="180"
          y2="340"
          stroke="#87C241"
          strokeWidth="1"
        />
        <line
          x1="200"
          y1="340"
          x2="240"
          y2="340"
          stroke="#87C241"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="440"
          x2="240"
          y2="440"
          stroke="#43AECE"
          strokeWidth="1"
        />
        {/* Vertical connectors */}
        <line
          x1="120"
          y1="0"
          x2="120"
          y2="60"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="80"
          y1="60"
          x2="80"
          y2="200"
          stroke="#1569D4"
          strokeWidth="1"
          strokeDasharray="3 6"
        />
        <line
          x1="180"
          y1="200"
          x2="180"
          y2="340"
          stroke="#87C241"
          strokeWidth="1"
        />
        <line
          x1="40"
          y1="340"
          x2="40"
          y2="500"
          stroke="#1569D4"
          strokeWidth="1"
          strokeDasharray="3 6"
        />
        <line
          x1="200"
          y1="340"
          x2="200"
          y2="440"
          stroke="#43AECE"
          strokeWidth="1"
          strokeDasharray="3 6"
        />
        {/* Pin nodes */}
        <circle cx="120" cy="60" r="3" fill="#43AECE" />
        <circle cx="80" cy="200" r="3" fill="#1569D4" />
        <circle cx="180" cy="340" r="3" fill="#87C241" />
        <circle cx="200" cy="340" r="2.5" fill="#43AECE" />
        {/* Connector pad */}
        <rect
          x="130"
          y="54"
          width="12"
          height="12"
          rx="2"
          fill="none"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <rect
          x="90"
          y="194"
          width="12"
          height="12"
          rx="2"
          fill="none"
          stroke="#1569D4"
          strokeWidth="1"
        />
      </svg>
    </Box>
  );
}

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
      {
        label: "Translating Markdown / MDX documents",
        href: "/docs/usage#translating-markdown--mdx-documents-two-side-mode",
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

/** Shared nav items rendered inside both the desktop sidebar and the mobile collapsible. */
function DocNavContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();

  return (
    <VStack gap={5} align="stretch" position="relative">
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
                location.pathname === itemPath && location.hash === itemHash;
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
                  <Link to={item.href} onClick={onClose}>
                    {item.label}
                  </Link>
                </Box>
              );
            })}
          </VStack>
        </Box>
      ))}
    </VStack>
  );
}

interface DocLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function DocLayout({ title, description, children }: DocLayoutProps) {
  const { t } = useTranslation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <>
      <Container
        maxW="container.xl"
        py={{ base: 6, md: 10 }}
        pb={{ base: 16, md: 10 }}
      >
        <title>{title}</title>
        {description && <meta name="description" content={description} />}

        <Box
          display={{ base: "block", md: "grid" }}
          gridTemplateColumns={{ md: "240px 1fr" }}
          gap={8}
          alignItems="start"
        >
          {/* Desktop sidebar — always visible, sticky */}
          <Box
            as="aside"
            hideBelow="md"
            position="sticky"
            top={20}
            bg="surface.panel"
            border="1px solid"
            borderColor="surface.border"
            borderRadius="lg"
            p={4}
            boxShadow="0 0 12px rgba(67,174,206,0.08)"
            overflow="hidden"
          >
            <SidebarCircuitBg />
            <DocNavContent />
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

      {/* Mobile fixed bottom nav — opens upward */}
      <Box
        display={{ base: "block", md: "none" }}
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        zIndex={100}
      >
        <Collapsible.Root
          open={isMobileNavOpen}
          onOpenChange={({ open }) => setIsMobileNavOpen(open)}
        >
          <Collapsible.Content>
            <Box
              bg="surface.panel"
              borderTop="1px solid"
              borderLeft="1px solid"
              borderRight="1px solid"
              borderColor="surface.border"
              maxH="60vh"
              overflowY="auto"
              position="relative"
              boxShadow="0 -4px 16px rgba(67,174,206,0.12)"
            >
              <SidebarCircuitBg />
              <Box p={4}>
                <DocNavContent onClose={() => setIsMobileNavOpen(false)} />
              </Box>
            </Box>
          </Collapsible.Content>
          <Collapsible.Trigger asChild>
            <Button
              variant="ghost"
              w="100%"
              px={4}
              py={3}
              h="auto"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              borderRadius="none"
              bg="surface.panel"
              border="1px solid"
              borderColor="surface.border"
              _hover={{ bg: "surface.panelMuted" }}
            >
              <Text fontSize="sm" fontWeight="medium">
                {t("docs.nav.toggle")}
              </Text>
              {isMobileNavOpen ? <LuChevronDown /> : <LuChevronUp />}
            </Button>
          </Collapsible.Trigger>
        </Collapsible.Root>
      </Box>
    </>
  );
}
