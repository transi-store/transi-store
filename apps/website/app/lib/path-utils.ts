import type { TFunction } from "i18next";

// Validates a project file path. Returns a localized error message or null
// if valid. Rules:
//   - must contain the "<lang>" placeholder
//   - must not be an absolute path (UNIX "/..." or Windows "C:/...")
//   - must not contain ".." segments (path traversal)
export function validateOutputPath(
  filePath: string,
  t: TFunction,
): string | null {
  if (!filePath.includes("<lang>")) {
    return t("files.errors.path.missingLangPlaceholder");
  }
  if (/^[/\\]/.test(filePath) || /^[a-zA-Z]:/.test(filePath)) {
    return t("files.errors.path.notRelative");
  }
  const parts = filePath.replace(/\\/g, "/").split("/");
  if (parts.some((p) => p === "..")) {
    return t("files.errors.path.containsDotDot");
  }
  return null;
}
