import {
  Box,
  Button,
  Container,
  Heading,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function CTASection() {
  const { t } = useTranslation();

  return (
    <Box as="section" py={{ base: 16, md: 24 }}>
      <Container maxW="container.xl">
        <Box
          position="relative"
          overflow="hidden"
          borderRadius="lg"
          bg={{ _light: "#121B28", _dark: "#0a1018" }}
          color="white"
          border="1px solid"
          borderColor={{ _light: "transparent", _dark: "rgba(67,174,206,0.2)" }}
          px={{ base: 8, md: 12 }}
          py={{ base: 10, md: 14 }}
        >
          {/* Circuit trace decoration */}
          <Box
            position="absolute"
            inset={0}
            pointerEvents="none"
            opacity={0.15}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 600 200"
              preserveAspectRatio="xMidYMid slice"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line
                x1="0"
                y1="40"
                x2="600"
                y2="40"
                stroke="#43AECE"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="160"
                x2="600"
                y2="160"
                stroke="#87C241"
                strokeWidth="1"
              />
              <line
                x1="100"
                y1="0"
                x2="100"
                y2="200"
                stroke="#1569D4"
                strokeWidth="1"
                strokeDasharray="4 8"
              />
              <line
                x1="500"
                y1="0"
                x2="500"
                y2="200"
                stroke="#1569D4"
                strokeWidth="1"
                strokeDasharray="4 8"
              />
              <circle cx="100" cy="40" r="3" fill="#43AECE" />
              <circle cx="500" cy="160" r="3" fill="#87C241" />
            </svg>
          </Box>

          <VStack gap={6} textAlign="center" position="relative">
            <Heading
              as="h2"
              textStyle={{ base: "2xl", md: "4xl" }}
              color="white"
              fontFamily="heading"
            >
              {t("landing.cta.title")}
            </Heading>
            <Text textStyle="lg" color="whiteAlpha.700" maxW="2xl">
              {t("landing.cta.subtitle")}
            </Text>

            <Stack direction={{ base: "column", sm: "row" }} gap={3} mt={2}>
              <Button
                asChild
                size="lg"
                bg="accent.solid"
                color="white"
                fontWeight="bold"
                _hover={{ opacity: 0.9 }}
              >
                <Link to="/auth/login">{t("landing.cta.getStarted")}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                borderColor="whiteAlpha.400"
                color="white"
                _hover={{ bg: "whiteAlpha.100" }}
              >
                <Link to="/pricing">{t("landing.cta.viewPricing")}</Link>
              </Button>
            </Stack>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}
