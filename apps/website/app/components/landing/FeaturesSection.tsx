import {
  Box,
  Container,
  Heading,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import {
  LuGlobe,
  LuFolderOpen,
  LuFileJson,
  LuBrainCircuit,
  LuUsers,
  LuPlug,
} from "react-icons/lu";
import type { IconType } from "react-icons";

function FeatureCard({
  icon: FeatureIcon,
  title,
  description,
  index,
}: {
  icon: IconType;
  title: string;
  description: string;
  index: number;
}) {
  // Neon-bright accent colors cycling through the palette
  const colors = ["#3B82F6", "#87C241", "#43AECE"];
  const accentColor = colors[index % colors.length];

  return (
    <Box
      position="relative"
      p={6}
      bg="surface.panel"
      border="1px solid"
      borderColor="surface.border"
      borderRadius="lg"
      transition="all 0.2s"
      _hover={{ borderColor: accentColor, transform: "translateY(-2px)" }}
      animationName="fade-in, slide-from-bottom"
      animationDuration="400ms"
      animationTimingFunction="ease-out"
      animationFillMode="backwards"
      animationDelay={`${index * 80}ms`}
    >
      {/* Top accent line — like a circuit trace */}
      <Box
        position="absolute"
        top={0}
        left={6}
        w={10}
        h="2px"
        bg={accentColor}
      />

      <VStack align="flex-start" gap={3}>
        <Icon fontSize="xl" color={accentColor}>
          <FeatureIcon />
        </Icon>
        <Heading as="h3" textStyle="md" fontFamily="heading">
          {title}
        </Heading>
        <Text fontSize="sm" color="fg.muted" lineHeight="tall">
          {description}
        </Text>
      </VStack>
    </Box>
  );
}

export function FeaturesSection() {
  const { t } = useTranslation();

  const features: { icon: IconType; title: string; description: string }[] = [
    {
      icon: LuGlobe,
      title: t("landing.features.multiLang.title"),
      description: t("landing.features.multiLang.description"),
    },
    {
      icon: LuFolderOpen,
      title: t("landing.features.multiProject.title"),
      description: t("landing.features.multiProject.description"),
    },
    {
      icon: LuFileJson,
      title: t("landing.features.export.title"),
      description: t("landing.features.export.description"),
    },
    {
      icon: LuBrainCircuit,
      title: t("landing.features.ai.title"),
      description: t("landing.features.ai.description"),
    },
    {
      icon: LuUsers,
      title: t("landing.features.team.title"),
      description: t("landing.features.team.description"),
    },
    {
      icon: LuPlug,
      title: t("landing.features.api.title"),
      description: t("landing.features.api.description"),
    },
  ];

  return (
    <Box as="section" py={{ base: 16, md: 24 }}>
      <Container maxW="container.xl">
        <VStack gap={4} mb={14} textAlign="center">
          <Heading
            as="h2"
            textStyle={{ base: "3xl", md: "4xl" }}
            fontFamily="heading"
          >
            {t("landing.features.title")}
          </Heading>
          <Text color="fg.muted" textStyle="lg" maxW="2xl">
            {t("landing.features.subtitle")}
          </Text>
        </VStack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={5}>
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
