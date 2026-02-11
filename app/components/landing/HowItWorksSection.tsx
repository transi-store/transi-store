import {
  Box,
  Container,
  Heading,
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
    <Box as="section" py={{ base: 12, md: 20 }} bg="bg.subtle">
      <Container maxW="container.xl">
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
              animationName="fade-in, slide-from-bottom"
              animationDuration="500ms"
              animationTimingFunction="ease-out"
              animationFillMode="backwards"
              animationDelay={`${index * 150}ms`}
            >
              <Box
                w={14}
                h={14}
                borderRadius="full"
                bg="brand.solid"
                color="brand.contrast"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="xl"
                fontWeight="bold"
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
      </Container>
    </Box>
  );
}
