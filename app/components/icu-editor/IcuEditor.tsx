/**
 * ICU Editor Component
 * A CodeMirror-based editor with ICU syntax highlighting and validation
 */

import { useEffect, useRef, useCallback, useState } from "react";
import {
  Box,
  VStack,
  Text,
  Badge,
  HStack,
  Collapsible,
} from "@chakra-ui/react";
import {
  EditorView,
  keymap,
  placeholder as placeholderExt,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { icuLanguage } from "./icu-language";
import { icuLinter, validateIcuMessage, extractVariables } from "./icu-linter";
import { IcuPreview } from "./IcuPreview";
import { IcuTemplateButtons } from "./IcuTemplateButtons";
import {
  LuChevronDown,
  LuChevronRight,
  LuCircleAlert,
  LuCircleCheck,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";

interface IcuEditorProps {
  /** Initial value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when editor loses focus */
  onBlur?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Locale for preview */
  locale?: string;
  /** Show preview panel */
  showPreview?: boolean;
  /** Minimum height */
  minHeight?: string;
  /** Name attribute for form submission */
  name?: string;
}

export function IcuEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Entrez votre traduction ICU...",
  disabled = false,
  locale = "fr",
  showPreview = true,
  minHeight = "80px",
  name,
}: IcuEditorProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const onBlurRef = useRef(onBlur);
  // Update ref during render (valid React pattern for callbacks)
  onBlurRef.current = onBlur;

  const [internalValue, setInternalValue] = useState(value);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [variables, setVariables] = useState<string[]>([]);

  // Update internal value when prop changes
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
      if (editorRef.current) {
        const currentContent = editorRef.current.state.doc.toString();
        if (currentContent !== value) {
          editorRef.current.dispatch({
            changes: { from: 0, to: currentContent.length, insert: value },
          });
        }
      }
    }
  }, [value]);

  // Validate and extract variables
  useEffect(() => {
    const validationErrors = validateIcuMessage(internalValue);
    setErrors(validationErrors.map((e) => e.message));
    setVariables(extractVariables(internalValue));
  }, [internalValue]);

  // Handle content changes
  const handleChange = useCallback(
    (newValue: string) => {
      setInternalValue(newValue);
      onChange(newValue);
    },
    [onChange],
  );

  // Insert template at cursor position
  const handleInsertTemplate = useCallback((template: string) => {
    if (!editorRef.current) return;

    const view = editorRef.current;
    const { state } = view;
    const { from, to } = state.selection.main;

    // Insert the template at cursor position
    view.dispatch({
      changes: { from, to, insert: template },
      selection: { anchor: from + template.length },
    });

    // Focus the editor after insertion
    view.focus();
  }, []);

  // Initialize CodeMirror
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions: Extension[] = [
      // Basic setup
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),

      // ICU language support
      icuLanguage(),
      icuLinter(),

      // Placeholder
      placeholderExt(placeholder),

      // Update listener
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          handleChange(update.state.doc.toString());
        }
      }),

      // Blur handler
      EditorView.domEventHandlers({
        blur: () => {
          if (onBlurRef.current) {
            onBlurRef.current();
          }
        },
      }),

      // Editable state
      EditorView.editable.of(!disabled),

      // Line wrapping
      EditorView.lineWrapping,

      // Custom styling
      EditorView.theme({
        "&": {
          minHeight,
        },
        ".cm-scroller": {
          overflow: "auto",
        },
      }),
    ];

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    editorRef.current = view;

    return () => {
      view.destroy();
      editorRef.current = null;
    };
  }, [placeholder, disabled, minHeight]);

  const isValid = errors.length === 0;

  return (
    <VStack align="stretch" gap={2} w="full">
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={internalValue} />}

      {/* Template buttons */}
      <IcuTemplateButtons
        onInsertTemplate={handleInsertTemplate}
        disabled={disabled}
      />

      {/* Editor container */}
      <Box
        ref={containerRef}
        borderRadius="md"
        overflow="hidden"
        opacity={disabled ? 0.6 : 1}
        cursor={disabled ? "not-allowed" : "text"}
        _focusWithin={{
          boxShadow: "0 0 0 2px var(--chakra-colors-brand-500)",
        }}
      />

      {/* Status bar */}
      <HStack justify="space-between" fontSize="xs" color="gray.600">
        <HStack gap={2}>
          {isValid ? (
            <HStack color="green.600">
              <LuCircleCheck />
              <Text>Syntaxe valide</Text>
            </HStack>
          ) : (
            <HStack color="red.600">
              <LuCircleAlert />
              <Text>{errors[0]}</Text>
            </HStack>
          )}
        </HStack>

        <HStack gap={1}>
          {variables.map((v) => (
            <Badge key={v} size="sm" colorPalette="blue" variant="subtle">
              {v}
            </Badge>
          ))}
        </HStack>
      </HStack>

      {/* Preview panel */}
      {showPreview && internalValue.trim() && (
        <Box borderWidth={1} borderRadius="md" overflow="hidden">
          <Box
            as="button"
            w="100%"
            p={2}
            bg="gray.50"
            cursor="pointer"
            display="flex"
            alignItems="center"
            gap={2}
            _hover={{ bg: "gray.100" }}
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
                <IcuPreview message={internalValue} locale={locale} />
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
        </Box>
      )}
    </VStack>
  );
}
