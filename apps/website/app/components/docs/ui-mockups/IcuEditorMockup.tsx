import { useState } from "react";
import {
  Box,
  Text,
  HStack,
  Badge,
  VStack,
  Field,
  Flex,
} from "@chakra-ui/react";
import { Switch } from "@chakra-ui/react/switch";
import { IcuEditorClient } from "~/components/icu-editor";
import { IcuPreview } from "~/components/icu-editor/IcuPreview";
import { MockupContainer } from "./MockupContainer";

const INITIAL_VALUE =
  "Hello {name}, you have {count, plural, one {# new message} other {# new messages}}.";

const INITIAL_FR_VALUE =
  "Bonjour {name}, vous avez {count, plural, one {# nouveau message} other {# nouveaux messages}}.";

export function IcuEditorMockup() {
  const [frValue, setFrValue] = useState(INITIAL_FR_VALUE);
  const [isFuzzy, setIsFuzzy] = useState(false);

  return (
    <MockupContainer url="transi-store.com/orgs/acme/projects/webapp/keys/42">
      <Box p={4}>
        <VStack align="stretch" gap={5}>
          {/* Key name header */}
          <Box>
            <Text fontFamily="mono" fontWeight="semibold" fontSize="lg">
              notifications.inbox_count
            </Text>
            <Text fontSize="sm" color="fg.muted" mt={1}>
              Pluralization with variable interpolation
            </Text>
          </Box>

          {/* Source locale — EN, read-only */}
          <Field.Root>
            <HStack mb={2}>
              <Text fontWeight="medium">EN</Text>
              <Badge colorPalette="brand" size="sm">
                Default
              </Badge>
            </HStack>
            <Box
              px={3}
              py={2}
              borderWidth={1}
              borderColor="border"
              bg="bg.subtle"
              borderRadius="md"
              fontFamily="mono"
              fontSize="sm"
              color="fg.muted"
            >
              {INITIAL_VALUE}
            </Box>
          </Field.Root>

          {/* Target locale — FR, interactive editor */}
          <Field.Root>
            <Flex justify="space-between" w="full" mb={2} wrap="wrap" gap={2}>
              <Text fontWeight="medium">FR</Text>
              <Switch.Root
                size="sm"
                checked={isFuzzy}
                onCheckedChange={(e: { checked: boolean }) =>
                  setIsFuzzy(e.checked)
                }
              >
                <Switch.HiddenInput />
                <Switch.Label>
                  <Text fontSize="sm" color="fg.muted">
                    Mark as fuzzy
                  </Text>
                </Switch.Label>
                <Switch.Control />
              </Switch.Root>
            </Flex>
            <IcuEditorClient
              name="translation_fr"
              value={frValue}
              onChange={setFrValue}
              placeholder="Enter French translation…"
              disabled={false}
              locale="fr"
            />

            {/* Live preview */}
            {frValue && (
              <Box
                borderWidth={1}
                borderRadius="md"
                overflow="hidden"
                w="full"
                mt={2}
              >
                <IcuPreview message={frValue} locale="fr" />
              </Box>
            )}
          </Field.Root>
        </VStack>
      </Box>
    </MockupContainer>
  );
}
