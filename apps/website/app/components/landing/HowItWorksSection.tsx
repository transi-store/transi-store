import { Box, Container, Heading, Stack, Text, VStack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

export function HowItWorksSection() {
  const { t } = useTranslation();

  const steps = [
    {
      number: 1,
      title: t("landing.howItWorks.step1.title"),
      description: t("landing.howItWorks.step1.description"),
    },
    {
      number: 2,
      title: t("landing.howItWorks.step2.title"),
      description: t("landing.howItWorks.step2.description"),
    },
    {
      number: 3,
      title: t("landing.howItWorks.step3.title"),
      description: t("landing.howItWorks.step3.description"),
    },
  ];

  return (
    <Box
      as="section"
      py={{ base: 12, md: 20 }}
      px={{ base: 3, md: 4 }}
      bg="transparent"
    >
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
              {t("landing.howItWorks.title")}
            </Heading>
            <Text color="fg.muted" textStyle="lg">
              {t("landing.howItWorks.subtitle")}
            </Text>
          </VStack>

          <Stack
            direction={{ base: "column", md: "row" }}
            gap={{ base: 8, md: 12 }}
            justify="center"
            align={{ base: "center", md: "flex-start" }}
          >
            {steps.map((step, index) => (
              <VStack
                key={step.number}
                gap={4}
                textAlign="center"
                flex={1}
                maxW="sm"
                p={6}
                borderRadius="3xl"
                bg="surface.panelMuted"
                border="1px solid"
                borderColor="surface.border"
                animationName="fade-in, slide-from-bottom"
                animationDuration="500ms"
                animationTimingFunction="ease-out"
                animationFillMode="backwards"
                animationDelay={`${index * 150}ms`}
              >
                <Box
                  w={14}
                  h={14}
                  borderRadius="2xl"
                  bg="brand.solid"
                  color="brand.contrast"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="xl"
                  fontWeight="bold"
                  boxShadow="inset 0 0 0 1px rgba(255,255,255,0.12)"
                >
                  {step.number}
                </Box>
                <Heading as="h3" textStyle="lg">
                  {step.title}
                </Heading>
                <Text color="fg.muted">{step.description}</Text>
              </VStack>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
