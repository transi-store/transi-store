/**
 * ICU Editor Component
 * A CodeMirror-based editor with ICU syntax highlighting and validation
 */
import { useEffect, useRef, useCallback } from "react";
import { Box, VStack, Text, Badge, HStack } from "@chakra-ui/react";
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
import { IcuTemplateButtons } from "./IcuTemplateButtons";
import { LuCircleAlert, LuCircleCheck } from "react-icons/lu";
import { useColorMode } from "../ui/color-mode";

export type IcuEditorProps = {
  /** Initial value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when editor loses focus */
  onBlur?: () => void;
  /** Placeholder text */
  placeholder: string;
  /** Whether the editor is disabled */
  disabled: boolean;
  /** Locale for preview */
  locale: string;
  /** Name attribute for form submission */
  name: string;
};

export function IcuEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  name,
}: IcuEditorProps) {
  const { colorMode } = useColorMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const onBlurRef = useRef(onBlur);
  // eslint-disable-next-line react-hooks/refs -- valid React pattern for stable callback refs
  onBlurRef.current = onBlur;

  // Update internal value when prop changes
  useEffect(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.state.doc.toString();
      if (currentContent !== value) {
        editorRef.current.dispatch({
          changes: { from: 0, to: currentContent.length, insert: value },
        });
      }
    }
  }, [value]);

  const errors = validateIcuMessage(value).map((e) => e.message);
  const variables = extractVariables(value);

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

    const extensions: Array<Extension> = [
      // Basic setup
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),

      // ICU language support
      icuLinter(),

      icuLanguage({ colorMode }),

      EditorView.darkTheme.of(colorMode === "dark"),

      // Placeholder
      placeholderExt(placeholder),

      // Update listener
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
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

      // Base theme (works for both light and dark)
      // EditorView.theme({
      //   "&": {
      //     minHeight,
      //   },
      //   ".cm-scroller": {
      //     overflow: "auto",
      //   },
      // }),
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
  }, [placeholder, disabled, colorMode, value, onChange]);

  const isValid = errors.length === 0;

  return (
    <VStack align="stretch" gap={2} w="full">
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Template buttons */}
      <IcuTemplateButtons
        onInsertTemplate={handleInsertTemplate}
        disabled={disabled}
      />

      {/* Editor container */}
      <Box
        ref={containerRef}
        borderWidth={1}
        borderColor="border"
        bg="bg"
        borderRadius="md"
        overflow="hidden"
        opacity={disabled ? 0.6 : 1}
        cursor={disabled ? "not-allowed" : "text"}
        _focusWithin={{
          outlineWidth: "2px",
          outlineColor: "brand.focusRing",
        }}
      />

      {/* Status bar */}
      <HStack justify="space-between" fontSize="xs" color="fg.muted">
        <HStack gap={2}>
          {isValid ? (
            <HStack color="green.fg">
              <LuCircleCheck />
              <Text>Syntaxe valide</Text>
            </HStack>
          ) : (
            <HStack color="red.fg">
              <LuCircleAlert />
              <Text>{errors[0]}</Text>
            </HStack>
          )}
        </HStack>

        <HStack gap={1}>
          {variables.map((v) => (
            <Badge key={v} size="sm" colorPalette="brand" variant="subtle">
              {v}
            </Badge>
          ))}
        </HStack>
      </HStack>
    </VStack>
  );
}
