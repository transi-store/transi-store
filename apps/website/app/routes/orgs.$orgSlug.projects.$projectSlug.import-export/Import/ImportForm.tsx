import { VStack, Button, Box, Text, Field } from "@chakra-ui/react";
import { NativeSelect } from "@chakra-ui/react/native-select";
import { FileUpload } from "@chakra-ui/react/file-upload";
import { Switch } from "@chakra-ui/react/switch";
import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import { LuUpload } from "react-icons/lu";
import { useState } from "react";
import type { ProjectLanguage } from "../../../../drizzle/schema";
import { ImportStrategy } from "@transi-store/common";

type ImportFormProps = {
  languages: Array<ProjectLanguage>;
  isSubmitting: boolean;
};

export function ImportForm({ languages, isSubmitting }: ImportFormProps) {
  const { t } = useTranslation();
  const [shouldOverwrite, setShouldOverwrite] = useState(false);

  return (
    <Form method="post" encType="multipart/form-data">
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
            value={
              shouldOverwrite ? ImportStrategy.OVERWRITE : ImportStrategy.SKIP
            }
          />
          <Switch.Root
            checked={shouldOverwrite}
            onCheckedChange={(e) => setShouldOverwrite(e.checked)}
            disabled={isSubmitting}
          >
            <Switch.HiddenInput />
            <Switch.Control />
            <Switch.Label>{t("import.overwriteLabel")}</Switch.Label>
          </Switch.Root>

          <Box>
            <Text fontSize="sm" color="fg.muted">
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
