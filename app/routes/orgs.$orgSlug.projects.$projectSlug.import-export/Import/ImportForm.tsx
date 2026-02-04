import { VStack, Button, Box, Text, Field } from "@chakra-ui/react";
import { NativeSelect } from "@chakra-ui/react/native-select";
import { FileUpload } from "@chakra-ui/react/file-upload";
import { Switch } from "@chakra-ui/react/switch";
import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import { LuUpload } from "react-icons/lu";
import type { RefObject } from "react";
import type { ProjectLanguage } from "../../../../drizzle/schema";

type ImportFormProps = {
  languages: Array<ProjectLanguage>;
  isSubmitting: boolean;
  formRef: RefObject<HTMLFormElement | null>;
  shouldOverwrite: boolean;
  onOverwriteChange: (checked: boolean) => void;
};

export function ImportForm({
  languages,
  isSubmitting,
  formRef,
  shouldOverwrite,
  onOverwriteChange,
}: ImportFormProps) {
  const { t } = useTranslation();

  return (
    <Form method="post" encType="multipart/form-data" ref={formRef}>
      <input type="hidden" name="_action" value="import" />

      <VStack gap={4} align="stretch">
        {/* File input */}
        <Field.Root required>
          <Field.Label>{t("import.fileLabel")}</Field.Label>
          <FileUpload.Root
            accept="application/json,.json"
            required
            disabled={isSubmitting}
            name="file"
            maxFiles={1}
          >
            <FileUpload.HiddenInput />
            <FileUpload.Trigger asChild>
              <Button variant="outline" size="sm">
                <LuUpload /> {t("import.upload")}
              </Button>
            </FileUpload.Trigger>
            <FileUpload.List />
          </FileUpload.Root>
          <Field.HelperText>{t("import.formatExample")}</Field.HelperText>
        </Field.Root>

        {/* Language select */}
        <Field.Root required>
          <Field.Label>{t("import.targetLang")}</Field.Label>
          <NativeSelect.Root disabled={isSubmitting} maxW="300px">
            <NativeSelect.Field
              name="locale"
              placeholder={t("import.chooseLanguage")}
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.locale}>
                  {lang.locale.toUpperCase()}
                  {lang.isDefault ? t("project.defaultSuffix") : ""}
                </option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Field.Root>

        {/* Strategy switch */}
        <Field.Root>
          <input
            type="hidden"
            name="strategy"
            value={shouldOverwrite ? "overwrite" : "skip"}
          />
          <Switch.Root
            checked={shouldOverwrite}
            onCheckedChange={(e) => onOverwriteChange(e.checked)}
            disabled={isSubmitting}
          >
            <Switch.HiddenInput />
            <Switch.Control />
            <Switch.Label>{t("import.overwriteLabel")}</Switch.Label>
          </Switch.Root>

          <Box>
            <Text fontSize="sm" color="gray.600">
              {t("import.overwriteHelp")}
            </Text>
          </Box>
        </Field.Root>

        <Button type="submit" colorPalette="brand" loading={isSubmitting}>
          <LuUpload /> {t("import.submit")}
        </Button>
      </VStack>
    </Form>
  );
}
