/**
 * Full-width markdown translation layout: two side-by-side editors with a
 * center action bar. Each editor publishes its sections + cursor to the
 * `SectionSyncProvider`; subscribers on the other side scroll & highlight
 * their counterpart section.
 */
import {
  memo,
  useCallback,
  useDeferredValue,
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
import {
  MarkdownTranslateAction,
  type MarkdownAiResponse,
} from "./MarkdownTranslateAction";
import AiSuggestionsDialog from "~/components/ai-suggestions-dialog";

const SAVE_DEBOUNCE_MS = 600;

type MarkdownTranslateLayoutProps = {
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
};

export function MarkdownTranslateLayout(props: MarkdownTranslateLayoutProps) {
  return (
    <SectionSyncProvider>
      <MarkdownTranslateInner {...props} />
    </SectionSyncProvider>
  );
}

function MarkdownTranslateInner({
  fileId,
  isMdx,
  languages,
  initialContent,
  fuzzyByLocale,
  initialLeftLocale,
  initialRightLocale,
}: MarkdownTranslateLayoutProps) {
  const { t } = useTranslation();
  const sync = useSectionSync();
  const saveFetcher = useFetcher();
  const fuzzyFetcher = useFetcher();
  const aiFetcher = useFetcher<MarkdownAiResponse>();

  const [leftLocale, setLeftLocale] = useState(initialLeftLocale);
  const [rightLocale, setRightLocale] = useState(initialRightLocale);

  // Per-locale current content. Seeded from props; updated as user types.
  const [contentByLocale, setContentByLocale] = useState<
    Record<string, string>
  >(() => ({ ...initialContent }));

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

  // parseSections() walks the doc through remark-gfm and is too slow to run
  // synchronously on every keystroke. We defer the *parsing* input so React
  // schedules it as a low-priority transition: typing stays snappy and the
  // section-derived UI (alignment, highlight, counterpart lookup) catches up
  // on the next idle frame.
  const deferredLeftContent = useDeferredValue(leftContent);
  const deferredRightContent = useDeferredValue(rightContent);

  const leftSections = useMemo(
    () => parseSections(deferredLeftContent, { mdx: isMdx }),
    [deferredLeftContent, isMdx],
  );
  const rightSections = useMemo(
    () => parseSections(deferredRightContent, { mdx: isMdx }),
    [deferredRightContent, isMdx],
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

  // Drive the section highlight on BOTH sides whenever the active section
  // changes. The active side gets the highlight on the section under the
  // cursor; the other side gets it on the counterpart (and is scrolled into
  // view). Highlights persist as long as the cursor stays in the section.
  useEffect(() => {
    const leftView = leftViewRef.current;
    const rightView = rightViewRef.current;
    if (!leftView || !rightView) return;

    const { activeSide, activeSectionIndex, alignment } = sync.state;

    if (activeSide === null || activeSectionIndex === null) {
      setEditorSectionHighlight(leftView, null);
      setEditorSectionHighlight(rightView, null);
      return;
    }

    const counterpartIdx = findCounterpart(
      alignment,
      activeSide,
      activeSectionIndex,
    );
    const activeSectionLocal =
      activeSide === "left"
        ? leftSections[activeSectionIndex]
        : rightSections[activeSectionIndex];
    const otherSectionLocal =
      counterpartIdx !== null
        ? activeSide === "left"
          ? rightSections[counterpartIdx]
          : leftSections[counterpartIdx]
        : null;

    const activeView = activeSide === "left" ? leftView : rightView;
    const otherView = activeSide === "left" ? rightView : leftView;

    if (activeSectionLocal) {
      setEditorSectionHighlight(activeView, {
        from: activeSectionLocal.range[0],
        to: activeSectionLocal.range[1],
      });
    } else {
      setEditorSectionHighlight(activeView, null);
    }

    if (otherSectionLocal) {
      setEditorSectionHighlight(otherView, {
        from: otherSectionLocal.range[0],
        to: otherSectionLocal.range[1],
      });
      scrollEditorToOffset(otherView, otherSectionLocal.range[0]);
    } else {
      setEditorSectionHighlight(otherView, null);
    }
  }, [sync.state, leftSections, rightSections]);

  const handleCursor = useCallback(
    (side: EditorSide, offset: number) => {
      const sections = side === "left" ? leftSections : rightSections;
      const found = findSectionByOffset(sections, offset);
      sync.reportCursor(side, found ? found.index : null);
    },
    [sync, leftSections, rightSections],
  );

  // Side-bound, stable callbacks for the EditorPane children. Keeping them
  // memoized lets `memo(EditorPane)` skip re-rendering the side that isn't
  // being typed in. Their identities only change when sections (deferred)
  // or the locale switch.
  const handleLeftContentChange = useCallback(
    (v: string) => handleEditorChange(leftLocale, v),
    [handleEditorChange, leftLocale],
  );
  const handleRightContentChange = useCallback(
    (v: string) => handleEditorChange(rightLocale, v),
    [handleEditorChange, rightLocale],
  );
  const handleLeftCursor = useCallback(
    (offset: number) => handleCursor("left", offset),
    [handleCursor],
  );
  const handleRightCursor = useCallback(
    (offset: number) => handleCursor("right", offset),
    [handleCursor],
  );
  const handleLeftViewReady = useCallback((view: EditorView) => {
    leftViewRef.current = view;
  }, []);
  const handleRightViewReady = useCallback((view: EditorView) => {
    rightViewRef.current = view;
  }, []);

  // Compute current section / counterpart for the action bar.
  const activeSide: EditorSide = sync.state.activeSide ?? "left";
  const activeSections = activeSide === "left" ? leftSections : rightSections;
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

  const isCurrentSectionFuzzy = activeSection
    ? Boolean(fuzzyState[activeLocale]?.[activeSection.structuralPath])
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
      const sep =
        otherContent.endsWith("\n") || otherContent.length === 0 ? "" : "\n\n";
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

  // Section AI flow: clicking the action bar button opens a modal that
  // shows 2-3 ranked suggestions (same UX as the per-key translate flow).
  // The user picks one, which is then injected at the counterpart range.
  const [aiSectionDialogOpen, setAiSectionDialogOpen] = useState(false);
  const [aiSectionTargetLocale, setAiSectionTargetLocale] = useState<
    string | null
  >(null);
  const aiSectionContextRef = useRef<{
    targetLocale: string;
    structuralPath: string;
    requestKey: string;
  } | null>(null);

  // Document AI flow stays auto-apply: once the fetcher resolves with a
  // document-scope payload we replace the other-side content directly.
  const pendingDocumentRequestRef = useRef<string | null>(null);
  const appliedDocumentKeyRef = useRef<string | null>(null);
  const pendingDocumentTargetRef = useRef<string | null>(null);

  const handleAiTranslateSection = useCallback(() => {
    if (!activeSection) return;
    const sourceContent = contentByLocale[activeLocale] ?? "";
    const sourceText = getSectionText(sourceContent, activeSection);
    const targetCurrentText = contentByLocale[otherLocale] ?? "";
    const formData = new FormData();
    formData.set("_action", MarkdownTranslateAction.TranslateSection);
    formData.set("sourceLocale", activeLocale);
    formData.set("targetLocale", otherLocale);
    formData.set("sourceText", sourceText);
    formData.set("structuralPath", activeSection.structuralPath);
    formData.set("fileId", String(fileId));
    if (targetCurrentText.length > 0) {
      formData.set("targetCurrentText", targetCurrentText);
    }
    aiSectionContextRef.current = {
      targetLocale: otherLocale,
      structuralPath: activeSection.structuralPath,
      requestKey: `section:${activeSection.structuralPath}:${activeLocale}:${otherLocale}:${Date.now()}`,
    };
    setAiSectionTargetLocale(otherLocale);
    setAiSectionDialogOpen(true);
    aiFetcher.submit(formData, { method: "post" });
  }, [
    activeSection,
    contentByLocale,
    activeLocale,
    otherLocale,
    fileId,
    aiFetcher,
  ]);

  const handleSelectSectionSuggestion = useCallback(
    (text: string) => {
      const ctx = aiSectionContextRef.current;
      if (!ctx) return;
      const { targetLocale, structuralPath } = ctx;
      const targetSections =
        targetLocale === leftLocale ? leftSections : rightSections;
      const target = targetSections.find(
        (s) => s.structuralPath === structuralPath,
      );
      const targetContent = contentByLocale[targetLocale] ?? "";
      if (target) {
        const next =
          targetContent.slice(0, target.range[0]) +
          text +
          targetContent.slice(target.range[1]);
        handleEditorChange(targetLocale, next);
      } else {
        const sep =
          targetContent.length === 0 || targetContent.endsWith("\n")
            ? ""
            : "\n\n";
        handleEditorChange(targetLocale, targetContent + sep + text);
      }
      setAiSectionDialogOpen(false);
    },
    [
      leftLocale,
      leftSections,
      rightSections,
      contentByLocale,
      handleEditorChange,
    ],
  );

  const handleAiTranslateDocument = useCallback(() => {
    const sourceText = contentByLocale[activeLocale] ?? "";
    if (sourceText.length === 0) return;
    const targetCurrentText = contentByLocale[otherLocale] ?? "";
    const formData = new FormData();
    formData.set("_action", MarkdownTranslateAction.TranslateDocument);
    formData.set("sourceLocale", activeLocale);
    formData.set("targetLocale", otherLocale);
    formData.set("sourceText", sourceText);
    formData.set("fileId", String(fileId));
    if (targetCurrentText.length > 0) {
      formData.set("targetCurrentText", targetCurrentText);
    }
    pendingDocumentRequestRef.current = `document:${activeLocale}:${otherLocale}:${Date.now()}`;
    pendingDocumentTargetRef.current = otherLocale;
    aiFetcher.submit(formData, { method: "post" });
  }, [contentByLocale, activeLocale, otherLocale, fileId, aiFetcher]);

  // Auto-apply document-scope translations when the fetcher resolves.
  // Section-scope responses are NOT applied here: the user picks a
  // suggestion in the modal, which calls `handleSelectSectionSuggestion`.
  useEffect(() => {
    if (aiFetcher.state !== "idle") return;
    const data = aiFetcher.data;
    if (!data) return;
    if (!("scope" in data) || data.scope !== "document") return;
    const pendingKey = pendingDocumentRequestRef.current;
    const targetLocale = pendingDocumentTargetRef.current;
    if (!pendingKey || !targetLocale) return;
    if (appliedDocumentKeyRef.current === pendingKey) return;
    appliedDocumentKeyRef.current = pendingKey;
    handleEditorChange(targetLocale, data.translatedText);
  }, [aiFetcher.state, aiFetcher.data, handleEditorChange]);

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
  }, [
    activeSection,
    activeLocale,
    isCurrentSectionFuzzy,
    fileId,
    fuzzyFetcher,
  ]);

  const handleJumpToNextOrphan = useCallback(() => {
    const orphan = sync.state.alignment.find(
      (entry) => entry.leftIndex === null || entry.rightIndex === null,
    );
    if (!orphan) return;
    // Move the cursor to the orphan section: that triggers reportCursor,
    // which updates sync.state, and the highlight effect will paint both
    // sides automatically.
    if (orphan.leftIndex !== null) {
      const target = leftSections[orphan.leftIndex];
      const view = leftViewRef.current;
      if (view && target) {
        view.dispatch({ selection: { anchor: target.range[0] } });
        scrollEditorToOffset(view, target.range[0]);
        view.focus();
      }
    } else if (orphan.rightIndex !== null) {
      const target = rightSections[orphan.rightIndex];
      const view = rightViewRef.current;
      if (view && target) {
        view.dispatch({ selection: { anchor: target.range[0] } });
        scrollEditorToOffset(view, target.range[0]);
        view.focus();
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
          onContentChange={handleLeftContentChange}
          onCursor={handleLeftCursor}
          onViewReady={handleLeftViewReady}
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
          onContentChange={handleRightContentChange}
          onCursor={handleRightCursor}
          onViewReady={handleRightViewReady}
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

      <AiSuggestionsDialog
        open={aiSectionDialogOpen}
        targetLocale={aiSectionTargetLocale}
        onClose={() => setAiSectionDialogOpen(false)}
        onSelect={handleSelectSectionSuggestion}
        size="lg"
        isLoading={
          aiFetcher.state === "submitting" || aiFetcher.state === "loading"
        }
        data={aiFetcher.data}
      />
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

const EditorPane = memo(function EditorPane({
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
          key={locale}
          value={content}
          onChange={onContentChange}
          onCursorChange={onCursor}
          onViewReady={onViewReady}
          mdx={isMdx}
        />
      </Box>
    </Flex>
  );
});
