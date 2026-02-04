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

type IcuPreviewProps = {
  message: string;
  locale?: string;
};

export function IcuPreview({ message, locale = "fr" }: IcuPreviewProps) {
  const { t } = useTranslation();
  const variables = useMemo(() => extractVariables(message), [message]);

  // Default values for common variable types
  const getDefaultValue = (varName: string): string | number => {
    const lowerName = varName.toLowerCase();
    if (
      lowerName.includes("count") ||
      lowerName.includes("number") ||
      lowerName.includes("qty")
    ) {
      return 5;
    }
    if (lowerName.includes("name") || lowerName.includes("user")) {
      return "Jean";
    }
    if (lowerName.includes("date")) {
      return new Date().toISOString();
    }
    if (lowerName.includes("gender")) {
      return "male";
    }
    return "exemple";
  };

  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {};
    for (const v of variables) {
      initial[v] = getDefaultValue(v);
    }
    return initial;
  });

  // Update values when variables change
  useMemo(() => {
    setValues((prev) => {
      const updated: Record<string, string | number> = {};
      for (const v of variables) {
        updated[v] = prev[v] ?? getDefaultValue(v);
      }
      return updated;
    });
  }, [variables]);

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
        error: e instanceof Error ? e.message : "Erreur de formatage",
      };
    }
  }, [message, locale, values]);

  const handleValueChange = (varName: string, value: string) => {
    // Try to parse as number if it looks like one
    const numValue = parseFloat(value);
    setValues((prev) => ({
      ...prev,
      [varName]: !isNaN(numValue) && value.trim() !== "" ? numValue : value,
    }));
  };

  if (variables.length === 0 && !error) {
    return (
      <Box p={3} bg="gray.50" borderRadius="md" borderWidth={1}>
        <Text fontSize="sm" color="gray.600" mb={1}>
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
          bg="blue.50"
          borderRadius="md"
          borderWidth={1}
          borderColor="blue.200"
        >
          <Text fontSize="sm" fontWeight="medium" color="blue.700" mb={2}>
            {t("icu.variablesDetected")}
          </Text>
          <HStack flexWrap="wrap" gap={3}>
            {variables.map((varName) => (
              <Field.Root key={varName} width="auto">
                <HStack gap={2}>
                  <Badge colorPalette="blue" variant="subtle">
                    {varName}
                  </Badge>
                  <Input
                    size="sm"
                    width="120px"
                    value={String(values[varName] ?? "")}
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
        bg={error ? "red.50" : "green.50"}
        borderRadius="md"
        borderWidth={1}
        borderColor={error ? "red.200" : "green.200"}
      >
        <Text
          fontSize="sm"
          fontWeight="medium"
          color={error ? "red.700" : "green.700"}
          mb={1}
        >
          {error ? t("icu.errorLabel") : t("icu.previewLabel")}
        </Text>
        {error ? (
          <Text color="red.600" fontSize="sm">
            {error}
          </Text>
        ) : (
          <Text color="green.800">{formatted || <em>{t("icu.emptyMessage")}</em>}</Text>
        )}
      </Box>
    </VStack>
  );
}
