import { Heading, Box, Text, HStack } from "@chakra-ui/react";
import { useState } from "react";
import { Link } from "react-router";

const COVERAGE_ACCENT = {
  full: { color: "#87C241", glow: "rgba(135, 194, 65, 0.28)" },
  high: { color: "#43AECE", glow: "rgba(67, 174, 206, 0.28)" },
  normal: { color: "#1569D4", glow: "rgba(21, 105, 212, 0.28)" },
} as const;

function getCoverageAccent(coverage: number) {
  if (coverage === 1) return COVERAGE_ACCENT.full;
  if (coverage >= 0.85) return COVERAGE_ACCENT.high;
  return COVERAGE_ACCENT.normal;
}

export type ProjectWithStats = {
  id: number;
  name: string;
  slug: string;
  updatedAt: string;
  translationKeyCount: number;
  locales: Array<{ locale: string; isDefault: boolean }>;
  coverage: number;
};

function LocalePill({
  locale,
  isDefault,
}: {
  locale: string;
  isDefault: boolean;
}) {
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={1.5}
      py={0.5}
      borderRadius={4}
      fontSize="10px"
      fontFamily="mono"
      fontWeight={500}
      letterSpacing="0.02em"
      border="1px solid"
      bg={isDefault ? "surface.highlight" : "bg.muted"}
      color={isDefault ? "brand.fg" : "fg.subtle"}
      borderColor={isDefault ? "brand.500" : "surface.border"}
    >
      {locale}
    </Box>
  );
}

export default function ProjectCard({
  project,
  href,
}: {
  project: ProjectWithStats;
  href: string;
}) {
  const [hovered, setHovered] = useState(false);
  const accent = getCoverageAccent(project.coverage);
  const updatedDate = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(project.updatedAt));

  return (
    <Box
      asChild
      position="relative"
      display="flex"
      flexDirection="column"
      gap={3.5}
      bg="surface.panel"
      border="1px solid"
      borderColor="surface.border"
      borderRadius={8}
      p="22px 22px 18px"
      cursor="pointer"
      textDecoration="none"
      color="inherit"
      transition="all 0.2s"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderColor: hovered ? accent.color : undefined,
        boxShadow: hovered ? `0 4px 20px ${accent.glow}` : undefined,
        transform: hovered ? "translateY(-2px)" : undefined,
      }}
    >
      <Link to={href}>
        {/* Colored top stripe */}
        <Box
          position="absolute"
          top={0}
          left="22px"
          width="36px"
          height="2px"
          style={{
            background: accent.color,
            boxShadow: `0 0 6px ${accent.color}`,
          }}
        />

        {/* Slug + Name */}
        <Box>
          <Text
            fontFamily="mono"
            fontSize="11px"
            color="fg.subtle"
            mb={1}
            lineHeight={1}
          >
            {project.slug}
          </Text>
          <Heading as="h3" size="md" fontWeight={600} letterSpacing="-0.01em">
            {project.name}
          </Heading>
        </Box>

        {/* Locale pills */}
        {project.locales.length > 0 && (
          <HStack wrap="wrap" gap={1}>
            {project.locales.map((l) => (
              <LocalePill
                key={l.locale}
                locale={l.locale}
                isDefault={l.isDefault}
              />
            ))}
          </HStack>
        )}

        {/* Coverage bar */}
        <Box>
          <HStack justify="space-between" mb={1.5} alignItems="baseline">
            <Text fontFamily="mono" fontSize="11px" color="fg.muted">
              {project.translationKeyCount.toLocaleString()} keys &middot;{" "}
              {project.locales.length} locales
            </Text>
            <Text
              fontFamily="mono"
              fontSize="11px"
              color={project.coverage === 1 ? "accent.fg" : "fg"}
              fontWeight={project.coverage === 1 ? 600 : 400}
            >
              {Math.round(project.coverage * 100)}%
            </Text>
          </HStack>
          <Box
            height="4px"
            borderRadius="999px"
            bg="bg.muted"
            overflow="hidden"
          >
            <Box
              height="100%"
              style={{
                width: `${project.coverage * 100}%`,
                background: accent.color,
                boxShadow: `0 0 4px ${accent.color}`,
              }}
            />
          </Box>
        </Box>

        <Text fontFamily="mono" fontSize="11px" color="fg.subtle">
          Updated {updatedDate}
        </Text>
      </Link>
    </Box>
  );
}
