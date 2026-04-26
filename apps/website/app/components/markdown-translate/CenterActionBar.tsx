/**
 * Vertical action bar rendered between the two markdown editors. Each button
 * is icon-only with an i18n tooltip; buttons that operate on "the current
 * section" stay disabled until the user has placed the cursor in a section.
 */
import { IconButton, Stack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import {
  LuArrowLeftRight,
  LuCopy,
  LuFileText,
  LuFlag,
  LuSparkles,
  LuFiles,
  LuChevronDown,
} from "react-icons/lu";

export type CenterActionBarProps = {
  hasCurrentSection: boolean;
  isCurrentSectionFuzzy: boolean;
  isAiBusy: boolean;
  onCopySectionToCounterpart: () => void;
  onCopyDocumentToCounterpart: () => void;
  onTranslateSectionWithAi: () => void;
  onTranslateDocumentWithAi: () => void;
  onToggleSectionFuzzy: () => void;
  onJumpToNextOrphan: () => void;
  onSwapSides: () => void;
};

export function CenterActionBar({
  hasCurrentSection,
  isCurrentSectionFuzzy,
  isAiBusy,
  onCopySectionToCounterpart,
  onCopyDocumentToCounterpart,
  onTranslateSectionWithAi,
  onTranslateDocumentWithAi,
  onToggleSectionFuzzy,
  onJumpToNextOrphan,
  onSwapSides,
}: CenterActionBarProps) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="column"
      gap={2}
      align="center"
      py={3}
      px={2}
      borderWidth={1}
      borderColor="border"
      borderRadius="md"
      bg="bg.subtle"
      position="sticky"
      top="0"
      alignSelf="flex-start"
      minW="56px"
    >
      <IconButton
        aria-label={t("markdownTranslate.actions.copySection")}
        title={t("markdownTranslate.actions.copySection")}
        size="sm"
        variant="ghost"
        disabled={!hasCurrentSection}
        onClick={onCopySectionToCounterpart}
      >
        <LuCopy />
      </IconButton>
      <IconButton
        aria-label={t("markdownTranslate.actions.copyDocument")}
        title={t("markdownTranslate.actions.copyDocument")}
        size="sm"
        variant="ghost"
        onClick={onCopyDocumentToCounterpart}
      >
        <LuFiles />
      </IconButton>
      <IconButton
        aria-label={t("markdownTranslate.actions.aiTranslateSection")}
        title={t("markdownTranslate.actions.aiTranslateSection")}
        size="sm"
        variant="ghost"
        disabled={!hasCurrentSection || isAiBusy}
        loading={isAiBusy && hasCurrentSection}
        onClick={onTranslateSectionWithAi}
      >
        <LuSparkles />
      </IconButton>
      <IconButton
        aria-label={t("markdownTranslate.actions.aiTranslateDocument")}
        title={t("markdownTranslate.actions.aiTranslateDocument")}
        size="sm"
        variant="ghost"
        disabled={isAiBusy}
        loading={isAiBusy && !hasCurrentSection}
        onClick={onTranslateDocumentWithAi}
      >
        <LuFileText />
      </IconButton>
      <IconButton
        aria-label={
          isCurrentSectionFuzzy
            ? t("markdownTranslate.actions.unmarkFuzzy")
            : t("markdownTranslate.actions.markFuzzy")
        }
        title={
          isCurrentSectionFuzzy
            ? t("markdownTranslate.actions.unmarkFuzzy")
            : t("markdownTranslate.actions.markFuzzy")
        }
        size="sm"
        variant={isCurrentSectionFuzzy ? "solid" : "ghost"}
        colorPalette={isCurrentSectionFuzzy ? "yellow" : undefined}
        disabled={!hasCurrentSection}
        onClick={onToggleSectionFuzzy}
      >
        <LuFlag />
      </IconButton>
      <IconButton
        aria-label={t("markdownTranslate.actions.nextOrphan")}
        title={t("markdownTranslate.actions.nextOrphan")}
        size="sm"
        variant="ghost"
        onClick={onJumpToNextOrphan}
      >
        <LuChevronDown />
      </IconButton>
      <IconButton
        aria-label={t("markdownTranslate.actions.swapSides")}
        title={t("markdownTranslate.actions.swapSides")}
        size="sm"
        variant="ghost"
        onClick={onSwapSides}
      >
        <LuArrowLeftRight />
      </IconButton>
    </Stack>
  );
}
