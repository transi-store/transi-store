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
          borderColor={{
            _light: "transparent",
            _dark: "rgba(67,174,206,0.25)",
          }}
          css={{
            _dark: {
              boxShadow:
                "0 0 15px rgba(67,174,206,0.15), inset 0 0 30px rgba(67,174,206,0.04)",
            },
          }}
          px={{ base: 8, md: 12 }}
          py={{ base: 10, md: 14 }}
        >
          {/* Circuit trace decoration — denser with animated dot */}
          <Box position="absolute" inset={0} pointerEvents="none" opacity={0.2}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 600 200"
              preserveAspectRatio="xMidYMid slice"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <style>{`@media (prefers-reduced-motion: reduce) { animateMotion { display: none; } }`}</style>
              <line
                x1="0"
                y1="30"
                x2="600"
                y2="30"
                stroke="#43AECE"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="100"
                x2="250"
                y2="100"
                stroke="#1569D4"
                strokeWidth="1"
              />
              <line
                x1="300"
                y1="100"
                x2="600"
                y2="100"
                stroke="#1569D4"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="170"
                x2="600"
                y2="170"
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
                x1="350"
                y1="0"
                x2="350"
                y2="200"
                stroke="#43AECE"
                strokeWidth="1"
                strokeDasharray="4 8"
              />
              <line
                x1="500"
                y1="0"
                x2="500"
                y2="200"
                stroke="#87C241"
                strokeWidth="1"
                strokeDasharray="4 8"
              />
              <circle cx="100" cy="30" r="3" fill="#43AECE" />
              <circle cx="250" cy="100" r="3" fill="#1569D4" />
              <circle cx="500" cy="170" r="3" fill="#87C241" />
              <circle cx="350" cy="30" r="3" fill="#43AECE" />
              <rect
                x="290"
                y="93"
                width="14"
                height="14"
                rx="2"
                fill="none"
                stroke="#1569D4"
                strokeWidth="1"
              />

              {/* Animated dot */}
              <circle r="4" fill="#43AECE">
                <animateMotion
                  dur="8s"
                  repeatCount="indefinite"
                  path="M 0,30 L 350,30 L 350,170 L 600,170"
                />
              </circle>
              <circle r="8" fill="#43AECE" opacity="0.3">
                <animateMotion
                  dur="8s"
                  repeatCount="indefinite"
                  path="M 0,30 L 350,30 L 350,170 L 600,170"
                />
              </circle>
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
