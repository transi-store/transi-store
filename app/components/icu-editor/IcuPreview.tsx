/**
 * ICU Message Preview component
 * Renders the formatted output of an ICU message with sample values
 */

import { useMemo, useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Input,
  Text,
  Badge,
  Field,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { IntlMessageFormat } from "intl-messageformat";
import { extractVariables } from "./icu-linter";

// Default values for common variable types
function getDefaultValue(varName: string): string | number {
  const lowerName = varName.toLowerCase();
  if (
    lowerName.includes("count") ||
    lowerName.includes("number") ||
    lowerName.includes("qty")
  ) {
    return 5;
  }
  if (lowerName.includes("name") || lowerName.includes("user")) {
    return "John";
  }
  if (lowerName.includes("date")) {
    return new Date().toISOString();
  }
  if (lowerName.includes("gender")) {
    return "male";
  }
  return "example";
}

type IcuPreviewProps = {
  message: string;
  locale: string;
};

export function IcuPreview({ message, locale }: IcuPreviewProps) {
  const { t } = useTranslation();
  const variables = useMemo(() => extractVariables(message), [message]);

  const [localValues, setLocalValues] = useState<
    Record<string, string | number>
  >({});

  const values = useMemo(() => {
    const result: Record<string, string | number> = {};
    for (const v of variables) {
      result[v] = localValues[v] ?? getDefaultValue(v);
    }
    return result;
  }, [variables, localValues]);

  const { formatted, error } = useMemo(() => {
    if (!message.trim()) {
      return { formatted: "", error: null };
    }

    try {
      const formatter = new IntlMessageFormat(message, locale);
      const result = formatter.format(values);
      return {
        formatted: typeof result === "string" ? result : String(result),
        error: null,
      };
    } catch (e) {
      return {
        formatted: "",
        error: e instanceof Error ? e.message : "Formatting error",
      };
    }
  }, [message, locale, values]);

  const handleValueChange = (varName: string, value: string) => {
    // Try to parse as number if it looks like one
    const numValue = parseFloat(value);
    setLocalValues((prev) => ({
      ...prev,
      [varName]: !isNaN(numValue) && value.trim() !== "" ? numValue : value,
    }));
  };

  if (variables.length === 0 && !error) {
    return (
      <Box p={3} bg="bg.subtle" borderRadius="md" borderWidth={1}>
        <Text fontSize="sm" color="fg.muted" mb={1}>
          {t("icu.previewLabel")}
        </Text>
        <Text>{message || <em>{t("icu.emptyMessage")}</em>}</Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" gap={3}>
      {/* Variables input */}
      {variables.length > 0 && (
        <Box
          p={3}
          bg="brand.subtle"
          borderRadius="md"
          borderWidth={1}
          borderColor="brand.muted"
        >
          <Text fontSize="sm" fontWeight="medium" color="brand.fg" mb={2}>
            {t("icu.variablesDetected")}
          </Text>
          <HStack flexWrap="wrap" gap={3}>
            {variables.map((varName) => (
              <Field.Root key={varName} width="auto">
                <HStack gap={2}>
                  <Badge colorPalette="brand" variant="subtle">
                    {varName}
                  </Badge>
                  <Input
                    size="sm"
                    width="120px"
                    value={values[varName] ?? ""}
                    onChange={(e) => handleValueChange(varName, e.target.value)}
                    placeholder={t("icu.valuePlaceholder", { varName })}
                  />
                </HStack>
              </Field.Root>
            ))}
          </HStack>
        </Box>
      )}

      {/* Preview */}
      <Box
        p={3}
        bg={error ? "red.subtle" : "green.subtle"}
        borderRadius="md"
        borderWidth={1}
        borderColor={error ? "red.muted" : "green.muted"}
      >
        <Text
          fontSize="sm"
          fontWeight="medium"
          color={error ? "red.fg" : "green.fg"}
          mb={1}
        >
          {error ? t("icu.errorLabel") : t("icu.previewLabel")}
        </Text>
        {error ? (
          <Text color="red.fg" fontSize="sm">
            {error}
          </Text>
        ) : (
          <Text color="green.emphasized">
            {formatted || <em>{t("icu.emptyMessage")}</em>}
          </Text>
        )}
      </Box>
    </VStack>
  );
}
