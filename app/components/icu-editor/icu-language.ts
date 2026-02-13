/**
 * CodeMirror language support for ICU MessageFormat
 * Provides syntax highlighting for ICU message format variables and plurals
 */

import { EditorView, Decoration, ViewPlugin } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { parseIcu } from "./icu-linter";
import {
  TYPE,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";

// CSS classes for decorations
const variableDecoration = Decoration.mark({ class: "icu-variable" });
const pluralKeywordDecoration = Decoration.mark({
  class: "icu-plural-keyword",
});
const argumentDecoration = Decoration.mark({ class: "icu-argument" });
const braceDecoration = Decoration.mark({ class: "icu-brace" });

// Combined decorator plugin
function createIcuDecorator() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const decorations: Array<{
          from: number;
          to: number;
          decoration: Decoration;
        }> = [];
        const doc = view.state.doc.toString();

        // Parse ICU message to get AST
        const ast = parseIcu(doc);
        if (!ast) {
          return Decoration.set([]);
        }

        // Walk the AST and create decorations directly
        function walkAst(nodes: Array<MessageFormatElement>): void {
          for (const node of nodes) {
            if (!node.location) continue;

            const start = node.location.start.offset;
            const end = node.location.end.offset;

            if (node.type === TYPE.argument) {
              decorations.push({
                from: start,
                to: start + 1,
                decoration: braceDecoration,
              });
              decorations.push({
                from: start + 1,
                to: end - 1,
                decoration: variableDecoration,
              });

              decorations.push({
                from: end - 1,
                to: end,
                decoration: braceDecoration,
              });
            } else if (node.type === TYPE.plural) {
              // Plural pattern like {count, plural, ...}
              decorations.push({
                from: start,
                to: start + 1,
                decoration: braceDecoration,
              });

              const varName = node.value;
              const varStart = start + 1;
              const varEnd = varStart + varName.length;
              decorations.push({
                from: varStart,
                to: varEnd,
                decoration: variableDecoration,
              });

              // Highlight "plural" keyword
              const pluralPos = doc.indexOf("plural", varEnd);
              if (pluralPos !== -1 && pluralPos < end) {
                decorations.push({
                  from: pluralPos,
                  to: pluralPos + 6,
                  decoration: pluralKeywordDecoration,
                });
              }

              // Highlight "selectordinal" keyword
              const selectOrdinalPos = doc.indexOf("selectordinal", varEnd);
              if (selectOrdinalPos !== -1 && selectOrdinalPos < end) {
                decorations.push({
                  from: selectOrdinalPos,
                  to: selectOrdinalPos + 12,
                  decoration: pluralKeywordDecoration,
                });
              }

              // Process plural options
              for (const [key, option] of Object.entries(node.options)) {
                if (!option.location) continue;

                const optionStart = option.location.start.offset;
                const optionEnd = option.location.end.offset;

                // Highlight option keyword (one, other, etc.)
                const argPos = doc.lastIndexOf(key, optionStart);
                if (argPos !== -1 && argPos < optionStart) {
                  decorations.push({
                    from: argPos,
                    to: argPos + key.length,
                    decoration: argumentDecoration,
                  });
                }

                // Highlight braces around option content
                decorations.push({
                  from: optionStart,
                  to: optionStart + 1,
                  decoration: braceDecoration,
                });
                decorations.push({
                  from: optionEnd - 1,
                  to: optionEnd,
                  decoration: braceDecoration,
                });

                // Recursively process option content
                walkAst(option.value);
              }

              // Highlight closing brace
              decorations.push({
                from: end - 1,
                to: end,
                decoration: braceDecoration,
              });
            } else if (node.type === TYPE.select) {
              // Select pattern like {gender, select, ...}
              // Highlight opening brace
              decorations.push({
                from: start,
                to: start + 1,
                decoration: braceDecoration,
              });

              // Highlight variable name
              const varName = node.value;
              const varStart = start + 1;
              const varEnd = varStart + varName.length;
              decorations.push({
                from: varStart,
                to: varEnd,
                decoration: variableDecoration,
              });

              // Highlight "select" keyword
              const selectPos = doc.indexOf("select", varEnd);

              if (selectPos !== -1 && selectPos < end) {
                decorations.push({
                  from: selectPos,
                  to: selectPos + 6,
                  decoration: pluralKeywordDecoration,
                });
              }

              // Process select options
              for (const [key, option] of Object.entries(node.options)) {
                if (!option.location) continue;

                const optionStart = option.location.start.offset;
                const optionEnd = option.location.end.offset;

                // Highlight option keyword (male, female, other, etc.)
                const argPos = doc.lastIndexOf(key, optionStart);
                if (argPos !== -1 && argPos < optionStart) {
                  decorations.push({
                    from: argPos,
                    to: argPos + key.length,
                    decoration: argumentDecoration,
                  });
                }

                // Highlight braces around option content
                decorations.push({
                  from: optionStart,
                  to: optionStart + 1,
                  decoration: braceDecoration,
                });
                decorations.push({
                  from: optionEnd - 1,
                  to: optionEnd,
                  decoration: braceDecoration,
                });

                // Recursively process option content
                walkAst(option.value);
              }

              // Highlight closing brace
              decorations.push({
                from: end - 1,
                to: end,
                decoration: braceDecoration,
              });
            } else if (
              node.type === TYPE.number ||
              node.type === TYPE.date ||
              node.type === TYPE.time
            ) {
              // Number/Date/Time format
              decorations.push({
                from: start,
                to: start + 1,
                decoration: braceDecoration,
              });

              const varStart = start + 1;
              const varEnd = varStart + node.value.length;
              decorations.push({
                from: varStart,
                to: varEnd,
                decoration: variableDecoration,
              });

              decorations.push({
                from: end - 1,
                to: end,
                decoration: braceDecoration,
              });
            } else if (node.type === TYPE.tag) {
              // Tag element - process children
              if ("children" in node) {
                walkAst(node.children);
              }
            } else if (node.type === TYPE.pound) {
              // Pound symbol in plural - highlight as argument
              decorations.push({
                from: start,
                to: end,
                decoration: argumentDecoration,
              });
            }
          }
        }

        walkAst(ast);

        // Sort by position and convert to ranges
        decorations.sort((a, b) => a.from - b.from);
        return Decoration.set(
          decorations.map((d) => d.decoration.range(d.from, d.to)),
        );
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}

// Theme for the ICU editor
const icuEditorTheme = EditorView.theme({
  // "&": {
  // fontSize: "14px",
  // border: "1px solid #d0d7de",
  // borderRadius: "6px",
  // backgroundColor: "#ffffff",
  // },
  // "&.cm-focused": {
  //   outline: "none",
  //   borderColor: "#0969da",
  //   boxShadow: "0 0 0 3px rgba(9, 105, 218, 0.3)",
  // },
  // ".cm-content": {
  //   padding: "8px 12px",
  //   fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
  // },
  // ".cm-line": {
  //   padding: "2px 0",
  // },
  // ICU syntax highlighting
  ".icu-variable": {
    color: "#3B82F6",
    fontWeight: "600",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderRadius: "3px",
    padding: "1px 2px",
  },
  ".icu-plural-keyword": {
    color: "#6D28D9",
    fontWeight: "600",
  },
  ".icu-select-keyword": {
    color: "#B42318",
    fontWeight: "600",
  },
  ".icu-argument": {
    color: "#65A30D",
    fontWeight: "500",
    fontStyle: "italic",
  },
  ".icu-brace": {
    color: "#757f8d",
    fontWeight: "bold",
  },
});

const icuEditorThemeDark = EditorView.theme(
  {
    // ICU syntax highlighting (One Dark-friendly colors)
    ".icu-variable": {
      color: "#84CAFF",
      fontWeight: "600",
      backgroundColor: "rgba(132, 202, 255, 0.18)",
      borderRadius: "3px",
      padding: "1px 2px",
    },
    ".icu-plural-keyword": {
      color: "#D6B4FF",
      fontWeight: "600",
    },
    ".icu-select-keyword": {
      color: "#FF9AA2",
      fontWeight: "600",
    },
    ".icu-argument": {
      color: "#BEF264",
      fontWeight: "500",
      fontStyle: "italic",
    },
    ".icu-brace": {
      color: "#D0D4DB",
      fontWeight: "bold",
    },
  },
  { dark: true },
);

/**
 * Complete ICU language extension for CodeMirror
 */
export function icuLanguage({
  colorMode,
}: {
  colorMode: "light" | "dark";
}): Extension {
  if (colorMode === "dark") {
    return [oneDark, icuEditorThemeDark, createIcuDecorator()];
  }

  return [icuEditorTheme, createIcuDecorator()];
}
