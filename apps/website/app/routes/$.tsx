import { data, Link } from "react-router";
import { Button, Container, Heading, Text, VStack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

export function loader() {
  return data(null, { status: 404 });
}

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <Container maxW="container.lg" py={20}>
      <VStack gap={6} textAlign="center">
        <Heading
          fontSize={{ base: "8xl", md: "9xl" }}
          fontWeight="bold"
          color="accent.solid"
          lineHeight={1}
        >
          404
        </Heading>
        <Heading size="2xl" fontWeight="semibold">
          {t("notFound.title")}
        </Heading>
        <Text color="fg.muted" fontSize="lg" maxW="md">
          {t("notFound.description")}
        </Text>
        <Button asChild size="lg" mt={4}>
          <Link to="/">{t("notFound.backHome")}</Link>
        </Button>
      </VStack>
    </Container>
  );
}
