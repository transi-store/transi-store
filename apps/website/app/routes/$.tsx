import { data, Link, useRouteLoaderData } from "react-router";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { Header } from "~/components/Header";
import { Toaster } from "~/components/ui/toaster";
import type { loader as rootLoader } from "~/root";

export function loader() {
  return data(null, { status: 404 });
}

export default function NotFound() {
  const { t } = useTranslation();
  const rootData = useRouteLoaderData<typeof rootLoader>("root");
  const user = rootData?.user ?? null;

  return (
    <>
      <Toaster />
      <Header user={user} />
      <Box as="main">
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
      </Box>
    </>
  );
}
