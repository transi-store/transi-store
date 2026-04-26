/**
 * Action discriminator strings posted to the markdown translation route.
 * Mirrors the `FileAction` / `KeyAction` pattern used in the classic UI.
 */
export const MarkdownTranslateAction = {
  SaveContent: "saveContent",
  ToggleFuzzy: "toggleFuzzy",
} as const;

export type MarkdownTranslateActionValue =
  (typeof MarkdownTranslateAction)[keyof typeof MarkdownTranslateAction];
