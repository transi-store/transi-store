/**
 * Full-width markdown translation layout: two side-by-side editors with a
 * center action bar. Each editor publishes its sections + cursor to the
 * `SectionSyncProvider`; subscribers on the other side scroll & highlight
 * their counterpart section.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Flex,
  HStack,
  Stack,
  Text,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import { useFetcher } from "react-router";
import { useTranslation } from "react-i18next";
import type { EditorView } from "@codemirror/view";
import {
  MarkdownEditorClient,
  scrollEditorToOffset,
  setEditorSectionHighlight,
} from "~/components/markdown-editor";
import {
  findCounterpart,
  findSectionByOffset,
  getSectionText,
  parseSections,
  type Section,
} from "~/lib/markdown-sections";
import { LanguagePicker } from "./LanguagePicker";
import { CenterActionBar } from "./CenterActionBar";
import {
  SectionSyncProvider,
  useSectionSync,
  type EditorSide,
} from "./SectionSyncContext";
import { MarkdownTranslateAction } from "./MarkdownTranslateAction";

const HIGHLIGHT_DURATION_MS = 1200;
const SAVE_DEBOUNCE_MS = 600;

export type MarkdownTranslateLayoutProps = {
  organizationSlug: string;
  projectSlug: string;
  fileId: number;
  filePath: string;
  isMdx: boolean;
  languages: ReadonlyArray<{ locale: string; isDefault: boolean }>;
  /** locale -> persisted content (may be empty when no row exists yet). */
  initialContent: Record<string, string>;
  /** locale -> map of structuralPath -> isFuzzy. */
  fuzzyByLocale: Record<string, Record<string, boolean>>;
  initialLeftLocale: string;
  initialRightLocale: string;
  /** AI translate API endpoint. POST { sourceLocale, targetLocale, sourceText, structuralPath? } */
  aiTranslateUrl: string;
};

export function MarkdownTranslateLayout(props: MarkdownTranslateLayoutProps) {
  return (
    <SectionSyncProvider>
      <MarkdownTranslateInner {...props} />
    </SectionSyncProvider>
  );
}

type AiResponse = {
  translatedText?: string;
  error?: string;
};

function MarkdownTranslateInner({
  fileId,
  isMdx,
  languages,
  initialContent,
  fuzzyByLocale,
  initialLeftLocale,
  initialRightLocale,
  aiTranslateUrl,
}: MarkdownTranslateLayoutProps) {
  const { t } = useTranslation();
  const sync = useSectionSync();
  const saveFetcher = useFetcher();
  const fuzzyFetcher = useFetcher();
  const aiFetcher = useFetcher<AiResponse>();

  const [leftLocale, setLeftLocale] = useState(initialLeftLocale);
  const [rightLocale, setRightLocale] = useState(initialRightLocale);

  // Per-locale current content. Seeded from props; updated as user types.
  const [contentByLocale, setContentByLocale] = useState<Record<string, string>>(
    () => ({ ...initialContent }),
  );

  // Per-locale current fuzzy flags (mirrors sidecar). Mutated optimistically.
  const [fuzzyState, setFuzzyState] = useState<
    Record<string, Record<string, boolean>>
  >(() => ({ ...fuzzyByLocale }));

  // CodeMirror view refs, used for scroll/highlight effects.
  const leftViewRef = useRef<EditorView | null>(null);
  const rightViewRef = useRef<EditorView | null>(null);

  // Debounced save timers per locale.
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Per-locale baseline updatedAt, sent back to the server for optimistic concurrency.
  const updatedAtRef = useRef<Record<string, string>>({});

  const leftContent = contentByLocale[leftLocale] ?? "";
  const rightContent = contentByLocale[rightLocale] ?? "";

  const leftSections = useMemo(
    () => parseSections(leftContent, { mdx: isMdx }),
    [leftContent, isMdx],
  );
  const rightSections = useMemo(
    () => parseSections(rightContent, { mdx: isMdx }),
    [rightContent, isMdx],
  );

  // Push sections into context whenever they change.
  useEffect(() => {
    sync.setSections("left", leftSections);
  }, [leftSections, sync]);
  useEffect(() => {
    sync.setSections("right", rightSections);
  }, [rightSections, sync]);

  const persistContent = useCallback(
    (locale: string, value: string) => {
      const formData = new FormData();
      formData.set("_action", MarkdownTranslateAction.SaveContent);
      formData.set("fileId", String(fileId));
      formData.set("locale", locale);
      formData.set("content", value);
      const baseline = updatedAtRef.current[locale];
      if (baseline) formData.set("expectedUpdatedAt", baseline);
      saveFetcher.submit(formData, { method: "post" });
    },
    [fileId, saveFetcher],
  );

  const handleEditorChange = useCallback(
    (locale: string, next: string) => {
      setContentByLocale((prev) =>
        prev[locale] === next ? prev : { ...prev, [locale]: next },
      );
      const existing = saveTimers.current[locale];
      if (existing) clearTimeout(existing);
      saveTimers.current[locale] = setTimeout(() => {
        persistContent(locale, next);
      }, SAVE_DEBOUNCE_MS);
    },
    [persistContent],
  );

  // Drive scroll + highlight on the *other* side when the cursor moves.
  useEffect(() => {
    return sync.subscribe(({ side, counterpartIndex }) => {
      const otherSide: EditorSide = side === "left" ? "right" : "left";
      const otherView = otherSide === "left" ? leftViewRef.current : rightViewRef.current;
      const otherSections = otherSide === "left" ? leftSections : rightSections;
      if (!otherView) return;
      if (counterpartIndex === null) {
        setEditorSectionHighlight(otherView, null);
        return;
      }
      const target = otherSections[counterpartIndex];
      if (!target) return;
      scrollEditorToOffset(otherView, target.range[0]);
      setEditorSectionHighlight(otherView, {
        from: target.range[0],
        to: target.range[1],
      });
      setTimeout(() => {
        setEditorSectionHighlight(otherView, null);
      }, HIGHLIGHT_DURATION_MS);
    });
  }, [sync, leftSections, rightSections]);

  const handleCursor = useCallback(
    (side: EditorSide, offset: number) => {
      const sections = side === "left" ? leftSections : rightSections;
      const found = findSectionByOffset(sections, offset);
      sync.reportCursor(side, found ? found.index : null);
    },
    [sync, leftSections, rightSections],
  );

  // Compute current section / counterpart for the action bar.
  const activeSide: EditorSide = sync.state.activeSide ?? "left";
  const activeSections =
    activeSide === "left" ? leftSections : rightSections;
  const activeIndex = sync.state.activeSectionIndex;
  const activeSection: Section | undefined =
    activeIndex !== null ? activeSections[activeIndex] : undefined;
  const activeLocale = activeSide === "left" ? leftLocale : rightLocale;
  const otherLocale = activeSide === "left" ? rightLocale : leftLocale;
  const otherSide: EditorSide = activeSide === "left" ? "right" : "left";
  const otherSections = otherSide === "left" ? leftSections : rightSections;

  const counterpartIndex =
    activeIndex !== null
      ? findCounterpart(sync.state.alignment, activeSide, activeIndex)
      : null;
  const counterpartSection =
    counterpartIndex !== null ? otherSections[counterpartIndex] : undefined;

  const isCurrentSectionFuzzy =
    activeSection
      ? Boolean(
          fuzzyState[activeLocale]?.[activeSection.structuralPath],
        )
      : false;

  const isAiBusy = aiFetcher.state !== "idle";

  // ---- Action bar handlers ----

  const replaceCounterpartSection = useCallback(
    (text: string) => {
      if (!counterpartSection) return;
      const otherContent = contentByLocale[otherLocale] ?? "";
      const next =
        otherContent.slice(0, counterpartSection.range[0]) +
        text +
        otherContent.slice(counterpartSection.range[1]);
      handleEditorChange(otherLocale, next);
    },
    [counterpartSection, contentByLocale, otherLocale, handleEditorChange],
  );

  const handleCopySection = useCallback(() => {
    if (!activeSection) return;
    const sourceContent = contentByLocale[activeLocale] ?? "";
    const text = getSectionText(sourceContent, activeSection);
    if (counterpartSection) {
      replaceCounterpartSection(text);
    } else {
      // No counterpart on the other side: append at end.
      const otherContent = contentByLocale[otherLocale] ?? "";
      const sep = otherContent.endsWith("\n") || otherContent.length === 0 ? "" : "\n\n";
      handleEditorChange(otherLocale, otherContent + sep + text);
    }
  }, [
    activeSection,
    contentByLocale,
    activeLocale,
    counterpartSection,
    replaceCounterpartSection,
    otherLocale,
    handleEditorChange,
  ]);

  const handleCopyDocument = useCallback(() => {
    const sourceContent = contentByLocale[activeLocale] ?? "";
    handleEditorChange(otherLocale, sourceContent);
  }, [contentByLocale, activeLocale, otherLocale, handleEditorChange]);

  const handleAiTranslateSection = useCallback(() => {
    if (!activeSection) return;
    const sourceContent = contentByLocale[activeLocale] ?? "";
    const sourceText = getSectionText(sourceContent, activeSection);
    const formData = new FormData();
    formData.set("sourceLocale", activeLocale);
    formData.set("targetLocale", otherLocale);
    formData.set("sourceText", sourceText);
    formData.set("structuralPath", activeSection.structuralPath);
    formData.set("fileId", String(fileId));
    formData.set("scope", "section");
    aiFetcher.submit(formData, { method: "post", action: aiTranslateUrl });
  }, [activeSection, contentByLocale, activeLocale, otherLocale, fileId, aiFetcher, aiTranslateUrl]);

  const handleAiTranslateDocument = useCallback(() => {
    const sourceText = contentByLocale[activeLocale] ?? "";
    if (sourceText.length === 0) return;
    const formData = new FormData();
    formData.set("sourceLocale", activeLocale);
    formData.set("targetLocale", otherLocale);
    formData.set("sourceText", sourceText);
    formData.set("fileId", String(fileId));
    formData.set("scope", "document");
    aiFetcher.submit(formData, { method: "post", action: aiTranslateUrl });
  }, [contentByLocale, activeLocale, otherLocale, fileId, aiFetcher, aiTranslateUrl]);

  // Apply AI response when it lands. We use a ref to track the last applied
  // request so we don't re-apply the same response multiple times.
  const appliedAiKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (aiFetcher.state !== "idle") return;
    const data = aiFetcher.data;
    if (!data?.translatedText) return;
    const formAction = aiFetcher.formData;
    const key = formAction
      ? `${formAction.get("scope")}:${formAction.get("structuralPath") ?? ""}:${formAction.get("sourceLocale")}:${formAction.get("targetLocale")}`
      : null;
    if (!key || appliedAiKeyRef.current === key) return;
    appliedAiKeyRef.current = key;

    const scope = formAction?.get("scope");
    const targetLocale = String(formAction?.get("targetLocale") ?? "");
    if (!targetLocale) return;

    if (scope === "section") {
      const structuralPath = String(formAction?.get("structuralPath") ?? "");
      const targetSections =
        targetLocale === leftLocale ? leftSections : rightSections;
      const target = targetSections.find(
        (s) => s.structuralPath === structuralPath,
      );
      const targetContent = contentByLocale[targetLocale] ?? "";
      if (target) {
        const next =
          targetContent.slice(0, target.range[0]) +
          data.translatedText +
          targetContent.slice(target.range[1]);
        handleEditorChange(targetLocale, next);
      } else {
        // No counterpart yet: append.
        const sep =
          targetContent.length === 0 || targetContent.endsWith("\n")
            ? ""
            : "\n\n";
        handleEditorChange(targetLocale, targetContent + sep + data.translatedText);
      }
    } else {
      handleEditorChange(targetLocale, data.translatedText);
    }
  }, [
    aiFetcher.state,
    aiFetcher.data,
    aiFetcher.formData,
    leftLocale,
    rightLocale,
    leftSections,
    rightSections,
    contentByLocale,
    handleEditorChange,
  ]);

  const handleToggleFuzzy = useCallback(() => {
    if (!activeSection) return;
    const next = !isCurrentSectionFuzzy;
    setFuzzyState((prev) => ({
      ...prev,
      [activeLocale]: {
        ...(prev[activeLocale] ?? {}),
        [activeSection.structuralPath]: next,
      },
    }));
    const formData = new FormData();
    formData.set("_action", MarkdownTranslateAction.ToggleFuzzy);
    formData.set("fileId", String(fileId));
    formData.set("locale", activeLocale);
    formData.set("structuralPath", activeSection.structuralPath);
    formData.set("isFuzzy", next ? "true" : "false");
    fuzzyFetcher.submit(formData, { method: "post" });
  }, [activeSection, activeLocale, isCurrentSectionFuzzy, fileId, fuzzyFetcher]);

  const handleJumpToNextOrphan = useCallback(() => {
    const orphan = sync.state.alignment.find(
      (entry) => entry.leftIndex === null || entry.rightIndex === null,
    );
    if (!orphan) return;
    if (orphan.leftIndex !== null) {
      const target = leftSections[orphan.leftIndex];
      const view = leftViewRef.current;
      if (view && target) {
        scrollEditorToOffset(view, target.range[0]);
        setEditorSectionHighlight(view, {
          from: target.range[0],
          to: target.range[1],
        });
        setTimeout(() => setEditorSectionHighlight(view, null), HIGHLIGHT_DURATION_MS);
      }
    } else if (orphan.rightIndex !== null) {
      const target = rightSections[orphan.rightIndex];
      const view = rightViewRef.current;
      if (view && target) {
        scrollEditorToOffset(view, target.range[0]);
        setEditorSectionHighlight(view, {
          from: target.range[0],
          to: target.range[1],
        });
        setTimeout(() => setEditorSectionHighlight(view, null), HIGHLIGHT_DURATION_MS);
      }
    }
  }, [sync.state.alignment, leftSections, rightSections]);

  const handleSwapSides = useCallback(() => {
    setLeftLocale(rightLocale);
    setRightLocale(leftLocale);
  }, [leftLocale, rightLocale]);

  // Track persisted updatedAt baselines from the server.
  useEffect(() => {
    const data = saveFetcher.data as
      | { updatedAt?: string; locale?: string; conflict?: boolean }
      | undefined;
    if (data?.updatedAt && data.locale) {
      updatedAtRef.current[data.locale] = data.updatedAt;
    }
  }, [saveFetcher.data]);

  const isSaving = saveFetcher.state === "submitting";
  const saveError =
    (saveFetcher.data as { error?: string } | undefined)?.error ?? null;

  return (
    <Stack gap={3} h="full" w="full">
      <HStack justify="space-between" wrap="wrap" gap={2}>
        <Text fontSize="sm" color="fg.muted">
          {isSaving
            ? t("markdownTranslate.status.saving")
            : saveError
              ? saveError
              : t("markdownTranslate.status.saved")}
        </Text>
        {isAiBusy && (
          <HStack gap={2} fontSize="sm" color="fg.muted">
            <Spinner size="xs" />
            <Text>{t("markdownTranslate.status.aiTranslating")}</Text>
          </HStack>
        )}
      </HStack>

      <Flex
        gap={2}
        align="stretch"
        h={{ base: "calc(100vh - 220px)", md: "calc(100vh - 200px)" }}
        minH="400px"
      >
        <EditorPane
          side="left"
          locale={leftLocale}
          otherLocale={rightLocale}
          content={leftContent}
          languages={languages}
          isMdx={isMdx}
          onLocaleChange={setLeftLocale}
          onContentChange={(v) => handleEditorChange(leftLocale, v)}
          onCursor={(offset) => handleCursor("left", offset)}
          onViewReady={(view) => (leftViewRef.current = view)}
          isActive={sync.state.activeSide === "left"}
          fuzzyForLocale={fuzzyState[leftLocale]}
          activeStructuralPath={
            sync.state.activeSide === "left" && activeSection
              ? activeSection.structuralPath
              : null
          }
          orphanCount={
            sync.state.alignment.filter((e) => e.rightIndex === null).length
          }
        />
        <CenterActionBar
          hasCurrentSection={activeSection !== undefined}
          isCurrentSectionFuzzy={isCurrentSectionFuzzy}
          isAiBusy={isAiBusy}
          onCopySectionToCounterpart={handleCopySection}
          onCopyDocumentToCounterpart={handleCopyDocument}
          onTranslateSectionWithAi={handleAiTranslateSection}
          onTranslateDocumentWithAi={handleAiTranslateDocument}
          onToggleSectionFuzzy={handleToggleFuzzy}
          onJumpToNextOrphan={handleJumpToNextOrphan}
          onSwapSides={handleSwapSides}
        />
        <EditorPane
          side="right"
          locale={rightLocale}
          otherLocale={leftLocale}
          content={rightContent}
          languages={languages}
          isMdx={isMdx}
          onLocaleChange={setRightLocale}
          onContentChange={(v) => handleEditorChange(rightLocale, v)}
          onCursor={(offset) => handleCursor("right", offset)}
          onViewReady={(view) => (rightViewRef.current = view)}
          isActive={sync.state.activeSide === "right"}
          fuzzyForLocale={fuzzyState[rightLocale]}
          activeStructuralPath={
            sync.state.activeSide === "right" && activeSection
              ? activeSection.structuralPath
              : null
          }
          orphanCount={
            sync.state.alignment.filter((e) => e.leftIndex === null).length
          }
        />
      </Flex>
    </Stack>
  );
}

type EditorPaneProps = {
  side: EditorSide;
  locale: string;
  otherLocale: string;
  content: string;
  languages: ReadonlyArray<{ locale: string; isDefault: boolean }>;
  isMdx: boolean;
  onLocaleChange: (locale: string) => void;
  onContentChange: (value: string) => void;
  onCursor: (offset: number) => void;
  onViewReady: (view: EditorView) => void;
  isActive: boolean;
  fuzzyForLocale: Record<string, boolean> | undefined;
  activeStructuralPath: string | null;
  orphanCount: number;
};

function EditorPane({
  locale,
  otherLocale,
  content,
  languages,
  isMdx,
  onLocaleChange,
  onContentChange,
  onCursor,
  onViewReady,
  isActive,
  fuzzyForLocale,
  activeStructuralPath,
  orphanCount,
}: EditorPaneProps) {
  const { t } = useTranslation();
  const isCurrentSectionFuzzy = activeStructuralPath
    ? Boolean(fuzzyForLocale?.[activeStructuralPath])
    : false;

  return (
    <Flex direction="column" flex="1" minW={0} gap={2}>
      <HStack justify="space-between" gap={2} wrap="wrap">
        <LanguagePicker
          value={locale}
          onChange={onLocaleChange}
          languages={languages}
          disabledLocale={otherLocale}
        />
        <HStack gap={2}>
          {isActive && (
            <Badge size="xs" colorPalette="brand" variant="subtle">
              {t("markdownTranslate.badges.active")}
            </Badge>
          )}
          {isCurrentSectionFuzzy && (
            <Badge size="xs" colorPalette="yellow" variant="subtle">
              {t("markdownTranslate.badges.fuzzy")}
            </Badge>
          )}
          {orphanCount > 0 && (
            <Badge size="xs" colorPalette="red" variant="subtle">
              {t("markdownTranslate.badges.orphans", { count: orphanCount })}
            </Badge>
          )}
        </HStack>
      </HStack>
      <Box flex="1" minH={0} display="flex">
        <MarkdownEditorClient
          value={content}
          onChange={onContentChange}
          onCursorChange={onCursor}
          onViewReady={onViewReady}
          mdx={isMdx}
        />
      </Box>
    </Flex>
  );
}
