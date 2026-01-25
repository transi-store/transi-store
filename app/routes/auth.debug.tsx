import type { Route } from "./+types/auth.debug";
import { generateAuthorizationUrl } from "~/lib/auth.server";
import { Box, Container, Heading, Text, VStack, Code } from "@chakra-ui/react";
import { useLoaderData } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const { url, codeVerifier, state } = await generateAuthorizationUrl();
    return {
      success: true,
      url,
      state,
      codeVerifierLength: codeVerifier.length,
      env: {
        OAUTH_AUTHORIZATION_URL: process.env.OAUTH_AUTHORIZATION_URL,
        OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID,
        OAUTH_REDIRECT_URI: process.env.OAUTH_REDIRECT_URI,
        OAUTH_SCOPES: process.env.OAUTH_SCOPES,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default function AuthDebug() {
  const data = useLoaderData<typeof loader>();

  return (
    <Container maxW="container.lg" py={10}>
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="xl">
          OAuth Debug
        </Heading>

        {data.success ? (
          <>
            <Box>
              <Heading as="h2" size="md" mb={2}>
                Generated Authorization URL:
              </Heading>
              <Code
                p={4}
                display="block"
                whiteSpace="pre-wrap"
                wordBreak="break-all"
              >
                {data.url}
              </Code>
            </Box>

            <Box>
              <Heading as="h2" size="md" mb={2}>
                State:
              </Heading>
              <Text>{data.state}</Text>
            </Box>

            <Box>
              <Heading as="h2" size="md" mb={2}>
                Code Verifier Length:
              </Heading>
              <Text>{data.codeVerifierLength} characters</Text>
            </Box>

            <Box>
              <Heading as="h2" size="md" mb={2}>
                Environment Variables:
              </Heading>
              <Code p={4} display="block" whiteSpace="pre-wrap">
                {JSON.stringify(data.env, null, 2)}
              </Code>
            </Box>
          </>
        ) : (
          <Box p={4} bg="red.100" borderRadius="md">
            <Heading as="h2" size="md" color="red.700" mb={2}>
              Error:
            </Heading>
            <Text color="red.700">{data.error}</Text>
          </Box>
        )}
      </VStack>
    </Container>
  );
}
