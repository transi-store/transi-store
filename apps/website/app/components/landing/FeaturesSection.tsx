import {
  Box,
  Card,
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
  return (
    <Card.Root
      variant="outline"
      bg="surface.panelMuted"
      borderColor="surface.border"
      borderRadius="2xl"
      overflow="hidden"
      position="relative"
      transition="all 0.2s"
      _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
      animationName="fade-in, slide-from-bottom"
      animationDuration="500ms"
      animationTimingFunction="ease-out"
      animationFillMode="backwards"
      animationDelay={`${index * 100}ms`}
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        h: "3px",
        bgGradient: "linear(to-r, brand.solid, accent.solid)",
      }}
    >
      <Card.Body gap={3}>
        <Icon fontSize="2xl" color="brand.solid">
          <FeatureIcon />
        </Icon>
        <Card.Title>{title}</Card.Title>
        <Card.Description>{description}</Card.Description>
      </Card.Body>
    </Card.Root>
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
    <Box as="section" py={{ base: 12, md: 20 }} px={{ base: 3, md: 4 }}>
      <Container maxW="container.xl">
        <Box
          bg="surface.panel"
          border="1px solid"
          borderColor="surface.border"
          borderRadius="4xl"
          px={{ base: 6, md: 8 }}
          py={{ base: 8, md: 10 }}
          boxShadow={{
            base: "0 24px 48px rgba(15, 23, 42, 0.06)",
            _dark: "0 24px 48px rgba(0, 0, 0, 0.24)",
          }}
        >
          <VStack gap={4} mb={12} textAlign="center">
            <Heading as="h2" textStyle={{ base: "3xl", md: "4xl" }}>
              {t("landing.features.title")}
            </Heading>
            <Text color="fg.muted" textStyle="lg" maxW="2xl">
              {t("landing.features.subtitle")}
            </Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
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
        </Box>
      </Container>
    </Box>
  );
}
