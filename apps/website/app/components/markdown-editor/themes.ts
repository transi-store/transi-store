/**
 * Light and dark themes for the markdown CodeMirror editor.
 *
 * Two pieces are exported per theme:
 * - the editor chrome (`EditorView.theme`) — gutters, selection, etc.
 * - the syntax highlight style (`HighlightStyle`) — colors per Lezer tag.
 *
 * Tokens roughly track Chakra's `bg`, `fg`, `border` semantic colors so the
 * editor blends with the rest of the UI in both color modes.
 */
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

const baseTheme = EditorView.theme({
  "&": {
    fontSize: "14px",
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    lineHeight: "1.6",
  },
  ".cm-content": {
    padding: "16px",
    caretColor: "currentColor",
  },
  ".cm-gutters": {
    border: "none",
  },
  ".cm-section-highlight": {
    transition: "background-color 0.4s ease-out",
  },
});

const lightSyntax = HighlightStyle.define([
  { tag: t.heading, color: "#0b6bcb", fontWeight: "700" },
  { tag: t.heading1, color: "#0b6bcb", fontWeight: "700", fontSize: "1.05em" },
  { tag: t.heading2, color: "#0b6bcb", fontWeight: "700" },
  { tag: t.heading3, color: "#0b6bcb", fontWeight: "600" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#1f7a4d", textDecoration: "underline" },
  { tag: t.url, color: "#1f7a4d" },
  { tag: t.monospace, color: "#7a3e9d" },
  { tag: t.keyword, color: "#7a3e9d" },
  { tag: t.string, color: "#1f7a4d" },
  { tag: t.comment, color: "#6b7280", fontStyle: "italic" },
  { tag: t.meta, color: "#6b7280" },
  { tag: t.processingInstruction, color: "#6b7280" },
  { tag: t.contentSeparator, color: "#9ca3af" },
  { tag: t.atom, color: "#b45309" },
  { tag: t.number, color: "#b45309" },
  { tag: t.bool, color: "#b45309" },
]);

const darkSyntax = HighlightStyle.define([
  { tag: t.heading, color: "#7cc4ff", fontWeight: "700" },
  { tag: t.heading1, color: "#7cc4ff", fontWeight: "700", fontSize: "1.05em" },
  { tag: t.heading2, color: "#7cc4ff", fontWeight: "700" },
  { tag: t.heading3, color: "#7cc4ff", fontWeight: "600" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#7ee2b8", textDecoration: "underline" },
  { tag: t.url, color: "#7ee2b8" },
  { tag: t.monospace, color: "#d6a8ff" },
  { tag: t.keyword, color: "#d6a8ff" },
  { tag: t.string, color: "#7ee2b8" },
  { tag: t.comment, color: "#9ca3af", fontStyle: "italic" },
  { tag: t.meta, color: "#9ca3af" },
  { tag: t.processingInstruction, color: "#9ca3af" },
  { tag: t.contentSeparator, color: "#6b7280" },
  { tag: t.atom, color: "#fbbf24" },
  { tag: t.number, color: "#fbbf24" },
  { tag: t.bool, color: "#fbbf24" },
]);

const lightChrome = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "#1f2937",
    },
    ".cm-content": {
      caretColor: "#111827",
    },
    ".cm-cursor": {
      borderLeftColor: "#111827",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(11, 107, 203, 0.18)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(11, 107, 203, 0.06)",
    },
    ".cm-section-highlight": {
      backgroundColor: "rgba(255, 213, 79, 0.32)",
    },
  },
  { dark: false },
);

const darkChrome = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "#e5e7eb",
    },
    ".cm-content": {
      caretColor: "#f9fafb",
    },
    ".cm-cursor": {
      borderLeftColor: "#f9fafb",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(124, 196, 255, 0.24)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(124, 196, 255, 0.08)",
    },
    ".cm-section-highlight": {
      backgroundColor: "rgba(255, 213, 79, 0.18)",
    },
  },
  { dark: true },
);

export function markdownEditorTheme(colorMode: "light" | "dark"): Extension[] {
  const isDark = colorMode === "dark";
  return [
    baseTheme,
    isDark ? darkChrome : lightChrome,
    syntaxHighlighting(isDark ? darkSyntax : lightSyntax),
  ];
}
