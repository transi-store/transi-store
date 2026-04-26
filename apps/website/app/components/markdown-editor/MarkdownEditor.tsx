/**
 * Markdown / MDX editor based on CodeMirror v6.
 *
 * Exposes hooks for the parent translation UI:
 * - `onChange(value)` whenever the document changes
 * - `onCursorChange(offset)` whenever the selection moves
 * - `onViewReady(view)` to grab the underlying `EditorView` once mounted (used
 *   by the parent to drive scroll / highlight effects from the other side).
 *
 * Theme switches reactively with `useColorMode()` via a `Compartment` so the
 * view doesn't have to be torn down on color mode change.
 */
import { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";
import { EditorView, keymap } from "@codemirror/view";
import {
  EditorState,
  StateEffect,
  StateField,
  Compartment,
  type Extension,
} from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { Decoration, type DecorationSet } from "@codemirror/view";
import { useColorMode } from "../ui/color-mode";
import { markdownEditorTheme } from "./themes";

export type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (offset: number) => void;
  onBlur?: () => void;
  onViewReady?: (view: EditorView) => void;
  disabled?: boolean;
  /** When true, treat the document as MDX (currently only affects highlighting hints). */
  mdx?: boolean;
};

const setSectionHighlight = StateEffect.define<{
  from: number;
  to: number;
} | null>();

const sectionHighlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setSectionHighlight)) {
        if (effect.value === null) {
          next = Decoration.none;
        } else {
          const { from, to } = effect.value;
          if (from < to) {
            next = Decoration.set([
              Decoration.mark({ class: "cm-section-highlight" }).range(
                from,
                to,
              ),
            ]);
          } else {
            next = Decoration.none;
          }
        }
      }
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * Imperative helper used by the parent: set the section highlight to a range,
 * or clear it by passing `null`.
 */
export function setEditorSectionHighlight(
  view: EditorView,
  range: { from: number; to: number } | null,
): void {
  view.dispatch({ effects: setSectionHighlight.of(range) });
}

/**
 * Imperative helper: scroll the view so `offset` is near the top of the
 * viewport, with a small margin.
 */
export function scrollEditorToOffset(view: EditorView, offset: number): void {
  view.dispatch({
    effects: EditorView.scrollIntoView(offset, { y: "start", yMargin: 80 }),
  });
}

export function MarkdownEditor({
  value,
  onChange,
  onCursorChange,
  onBlur,
  onViewReady,
  disabled = false,
  mdx = false,
}: MarkdownEditorProps) {
  const { colorMode } = useColorMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const editableCompartment = useRef(new Compartment());

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;
  const onViewReadyRef = useRef(onViewReady);
  onViewReadyRef.current = onViewReady;

  // Sync external value into the editor without rebuilding the view.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  // React to color mode changes by reconfiguring the theme compartment.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.current.reconfigure(
        markdownEditorTheme(colorMode === "dark" ? "dark" : "light"),
      ),
    });
  }, [colorMode]);

  // React to disabled changes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: editableCompartment.current.reconfigure(
        EditorView.editable.of(!disabled),
      ),
    });
  }, [disabled]);

  // Initialize editor once.
  useEffect(() => {
    if (!containerRef.current) return;

    const initialColorMode = colorMode === "dark" ? "dark" : "light";

    const extensions: Extension[] = [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({
        base: markdownLanguage,
        addKeymap: true,
      }),
      themeCompartment.current.of(markdownEditorTheme(initialColorMode)),
      editableCompartment.current.of(EditorView.editable.of(!disabled)),
      EditorView.lineWrapping,
      sectionHighlightField,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
        if (
          (update.selectionSet || update.docChanged) &&
          onCursorChangeRef.current
        ) {
          onCursorChangeRef.current(update.state.selection.main.head);
        }
      }),
      EditorView.domEventHandlers({
        blur: () => {
          onBlurRef.current?.();
        },
      }),
    ];

    const state = EditorState.create({ doc: value, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    onViewReadyRef.current?.(view);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Initialize once; subsequent prop changes are handled in dedicated effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mdx]);

  return (
    <Box
      ref={containerRef}
      flex="1"
      minH={0}
      overflow="hidden"
      bg="bg"
      borderWidth={1}
      borderColor="border"
      borderRadius="md"
      _focusWithin={{
        outlineWidth: "2px",
        outlineColor: "brand.focusRing",
      }}
    />
  );
}
