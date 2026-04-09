import {
  Box,
  Container,
  Heading,
  HStack,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

export function HowItWorksSection() {
  const { t } = useTranslation();

  const steps = [
    {
      number: 1,
      title: t("landing.howItWorks.step1.title"),
      description: t("landing.howItWorks.step1.description"),
      color: "#1569D4",
    },
    {
      number: 2,
      title: t("landing.howItWorks.step2.title"),
      description: t("landing.howItWorks.step2.description"),
      color: "#87C241",
    },
    {
      number: 3,
      title: t("landing.howItWorks.step3.title"),
      description: t("landing.howItWorks.step3.description"),
      color: "#43AECE",
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
            {t("landing.howItWorks.title")}
          </Heading>
          <Text color="fg.muted" textStyle="lg">
            {t("landing.howItWorks.subtitle")}
          </Text>
        </VStack>

        <Stack
          direction={{ base: "column", md: "row" }}
          gap={0}
          justify="center"
          align="stretch"
        >
          {steps.map((step, index) => (
            <HStack
              key={step.number}
              flex={1}
              gap={0}
              align="stretch"
              animationName="fade-in, slide-from-bottom"
              animationDuration="400ms"
              animationTimingFunction="ease-out"
              animationFillMode="backwards"
              animationDelay={`${index * 120}ms`}
            >
              <VStack
                flex={1}
                gap={4}
                p={6}
                bg="surface.panel"
                border="1px solid"
                borderColor="surface.border"
                borderRadius="lg"
                align="flex-start"
                position="relative"
              >
                {/* Step number — like a pin label */}
                <HStack gap={3} align="center">
                  <Box
                    w={10}
                    h={10}
                    borderRadius="md"
                    bg={step.color}
                    color="white"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="lg"
                    fontWeight="bold"
                    fontFamily="heading"
                  >
                    {step.number}
                  </Box>
                  <Heading as="h3" textStyle="md" fontFamily="heading">
                    {step.title}
                  </Heading>
                </HStack>
                <Text color="fg.muted" fontSize="sm" lineHeight="tall">
                  {step.description}
                </Text>
              </VStack>

              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <Box
                  display={{ base: "none", md: "flex" }}
                  alignItems="center"
                  px={2}
                >
                  <Box w={8} h="2px" bg={step.color} opacity={0.5} />
                </Box>
              )}
            </HStack>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
