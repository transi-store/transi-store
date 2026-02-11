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
      transition="all 0.2s"
      _hover={{ transform: "translateY(-4px)", boxShadow: "md" }}
      animationName="fade-in, slide-from-bottom"
      animationDuration="500ms"
      animationTimingFunction="ease-out"
      animationFillMode="backwards"
      animationDelay={`${index * 100}ms`}
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
    <Box as="section" py={{ base: 12, md: 20 }}>
      <Container maxW="container.xl">
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
      </Container>
    </Box>
  );
}
