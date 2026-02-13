/**
 * ICU MessageFormat linter for CodeMirror
 * Uses @formatjs/icu-messageformat-parser to validate ICU messages
 */

import { linter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import { parse, TYPE } from "@formatjs/icu-messageformat-parser";
import type { MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import type { Extension } from "@codemirror/state";

export type IcuError = {
  message: string;
  location?: {
    start: { offset: number; line: number; column: number };
    end: { offset: number; line: number; column: number };
  };
};

/**
 * Parse an ICU message and return the AST
 * Returns null if parsing fails
 */
export function parseIcu(text: string): Array<MessageFormatElement> | null {
  if (!text.trim()) {
    return null;
  }

  try {
    return parse(text, {
      requiresOtherClause: false,
      shouldParseSkeletons: true,
      captureLocation: true,
    });
  } catch {
    return null;
  }
}

/**
 * Validate an ICU message and return errors if any
 */
export function validateIcuMessage(text: string): Array<IcuError> {
  if (!text.trim()) {
    return [];
  }

  try {
    parse(text, {
      requiresOtherClause: true,
      shouldParseSkeletons: true,
    });
    return [];
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Parse the error to extract location if available
      const errorMessage = error.message;

      // The parser throws errors with location info
      // Try to extract position from error message
      const locationMatch = errorMessage.match(/at position (\d+)/i);
      const offset = locationMatch ? parseInt(locationMatch[1], 10) : 0;

      return [
        {
          message: cleanErrorMessage(errorMessage),
          location: {
            start: { offset, line: 1, column: offset + 1 },
            end: { offset: offset + 1, line: 1, column: offset + 2 },
          },
        },
      ];
    }

    return [
      {
        message: "Erreur de syntaxe ICU inconnue",
      },
    ];
  }
}

/**
 * Clean up the error message for display
 */
function cleanErrorMessage(message: string): string {
  // Remove technical details, make it user-friendly
  return message
    .replace(/^SyntaxError:\s*/i, "")
    .replace(/Expected .+ but .+ found/i, (match) => {
      return match.replace(/".+?"/g, (quoted) => `« ${quoted.slice(1, -1)} »`);
    });
}

/**
 * CodeMirror linter extension for ICU messages
 */
export function icuLinter(): Extension {
  return linter((view) => {
    const diagnostics: Array<Diagnostic> = [];
    const text = view.state.doc.toString();

    if (!text.trim()) {
      return diagnostics;
    }

    const errors = validateIcuMessage(text);

    for (const error of errors) {
      const from = error.location?.start.offset ?? 0;
      const to = error.location?.end.offset ?? Math.min(from + 10, text.length);

      diagnostics.push({
        from: Math.max(0, from),
        to: Math.min(to, text.length),
        severity: "error",
        message: error.message,
      });
    }

    return diagnostics;
  });
}

/**
 * Extract variable names from an ICU message
 */
export function extractVariables(text: string): Array<string> {
  const ast = parseIcu(text);
  if (!ast) {
    return [];
  }
  const variables = new Set<string>();

  function walkAst(nodes: Array<MessageFormatElement>): void {
    for (const node of nodes) {
      if (node.type === TYPE.argument) {
        // ArgumentElement
        variables.add(node.value);
      } else if (node.type === TYPE.plural || node.type === TYPE.select) {
        // PluralElement or SelectElement
        variables.add(node.value);
        for (const option of Object.values(node.options)) {
          walkAst(option.value);
        }
      } else if (
        node.type === TYPE.number ||
        node.type === TYPE.date ||
        node.type === TYPE.time
      ) {
        // NumberElement, DateElement, TimeElement
        variables.add(node.value);
      } else if (node.type === TYPE.tag) {
        // TagElement - has children
        if ("children" in node) {
          walkAst(node.children);
        }
      }
    }
  }

  walkAst(ast);

  return Array.from(variables).sort();
}
