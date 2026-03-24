import { Box, Collapsible, Text } from "@chakra-ui/react";
import { type JSX, useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { IcuPreview } from "../icu-editor/IcuPreview";
import { useTranslation } from "react-i18next";

type Props = {
  value: string;
  locale: string;
};

export function TranslationPreview({ value, locale }: Props): JSX.Element {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <Box
        as="button"
        w="100%"
        p={2}
        bg="bg.subtle"
        cursor="pointer"
        display="flex"
        alignItems="center"
        gap={2}
        _hover={{ bg: "bg.subtle.hover" }}
        onClick={() => setIsPreviewOpen(!isPreviewOpen)}
      >
        {isPreviewOpen ? <LuChevronDown /> : <LuChevronRight />}
        <Text fontSize="sm" fontWeight="medium">
          {t("icu.previewLabel")}
        </Text>
      </Box>

      <Collapsible.Root open={isPreviewOpen}>
        <Collapsible.Content>
          <Box p={3}>
            <IcuPreview message={value} locale={locale} />
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </>
  );
}
