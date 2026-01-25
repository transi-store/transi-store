/**
 * CodeMirror language support for ICU MessageFormat
 * Provides syntax highlighting for ICU message format variables and plurals
 */

import { EditorView, Decoration, ViewPlugin } from "@codemirror/view";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

// CSS classes for decorations
const variableDecoration = Decoration.mark({ class: "icu-variable" });
const pluralKeywordDecoration = Decoration.mark({
  class: "icu-plural-keyword",
});
const argumentDecoration = Decoration.mark({ class: "icu-argument" });
const braceDecoration = Decoration.mark({ class: "icu-brace" });

interface Token {
  type:
    | "variable"
    | "pluralKeyword"
    | "selectKeyword"
    | "argument"
    | "brace"
    | "text";
  from: number;
  to: number;
  value: string;
}

/**
 * Simple tokenizer for ICU messages
 * Identifies variables, keywords, and arguments
 */
export function tokenizeIcu(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let depth = 0;

  while (i < text.length) {
    const char = text[i];

    if (char === "{") {
      // Found opening brace
      tokens.push({ type: "brace", from: i, to: i + 1, value: "{" });
      depth++;

      // Try to parse variable name
      const remaining = text.slice(i + 1);
      const varMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);

      if (varMatch) {
        const varName = varMatch[1];
        const varStart = i + 1;
        const varEnd = varStart + varName.length;

        // Check what comes after the variable name
        const afterVar = text
          .slice(varEnd)
          .match(/^\s*,\s*(plural|selectordinal|select|number|date|time)/);

        if (afterVar) {
          // It's a complex pattern like {count, plural, ...}
          tokens.push({
            type: "variable",
            from: varStart,
            to: varEnd,
            value: varName,
          });

          const keyword = afterVar[1];
          const keywordStart = text.indexOf(keyword, varEnd);
          const keywordEnd = keywordStart + keyword.length;

          if (keyword === "plural" || keyword === "selectordinal") {
            tokens.push({
              type: "pluralKeyword",
              from: keywordStart,
              to: keywordEnd,
              value: keyword,
            });
          } else if (keyword === "select") {
            tokens.push({
              type: "selectKeyword",
              from: keywordStart,
              to: keywordEnd,
              value: keyword,
            });
          }

          i = keywordEnd;
        } else {
          // Simple variable like {name}
          tokens.push({
            type: "variable",
            from: varStart,
            to: varEnd,
            value: varName,
          });
          i = varEnd;
        }
      } else {
        i++;
      }
    } else if (char === "}") {
      tokens.push({ type: "brace", from: i, to: i + 1, value: "}" });
      depth--;
      i++;
    } else if (depth > 0) {
      // Inside a complex pattern, look for arguments
      const remaining = text.slice(i);
      const argMatch = remaining.match(
        /^(zero|one|two|few|many|other|male|female|=\d+)\b/,
      );

      if (argMatch) {
        const arg = argMatch[1];
        tokens.push({
          type: "argument",
          from: i,
          to: i + arg.length,
          value: arg,
        });
        i += arg.length;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return tokens;
}

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
        const decorations: {
          from: number;
          to: number;
          decoration: Decoration;
        }[] = [];
        const doc = view.state.doc.toString();

        // Tokenize ICU message
        const tokens = tokenizeIcu(doc);

        for (const token of tokens) {
          let decoration: Decoration | null = null;

          switch (token.type) {
            case "variable":
              decoration = variableDecoration;
              break;
            case "pluralKeyword":
            case "selectKeyword":
              decoration = pluralKeywordDecoration;
              break;
            case "argument":
              decoration = argumentDecoration;
              break;
            case "brace":
              decoration = braceDecoration;
              break;
          }

          if (decoration) {
            decorations.push({
              from: token.from,
              to: token.to,
              decoration,
            });
          }
        }

        // Sort by position
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
export const icuEditorTheme = EditorView.theme({
  "&": {
    fontSize: "14px",
    border: "1px solid #d0d7de",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "#0969da",
    boxShadow: "0 0 0 3px rgba(9, 105, 218, 0.3)",
  },
  ".cm-content": {
    padding: "8px 12px",
    fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
  },
  ".cm-line": {
    padding: "2px 0",
  },
  // ICU syntax highlighting
  ".icu-variable": {
    color: "#0550ae",
    fontWeight: "600",
    backgroundColor: "rgba(5, 80, 174, 0.1)",
    borderRadius: "3px",
    padding: "1px 2px",
  },
  ".icu-plural-keyword": {
    color: "#8250df",
    fontWeight: "600",
  },
  ".icu-select-keyword": {
    color: "#cf222e",
    fontWeight: "600",
  },
  ".icu-argument": {
    color: "#116329",
    fontWeight: "500",
    fontStyle: "italic",
  },
  ".icu-brace": {
    color: "#6e7781",
    fontWeight: "bold",
  },
});

/**
 * Complete ICU language extension for CodeMirror
 */
export function icuLanguage(): Extension {
  return [icuEditorTheme, createIcuDecorator()];
}
