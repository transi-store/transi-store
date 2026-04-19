// Validates a project file path and returns an error message, or null if valid.
// Rules:
//   - must contain the "<lang>" placeholder
//   - must not be an absolute path (UNIX "/..." or Windows "C:/...")
//   - must not contain ".." segments (path traversal)
export function validateOutputPath(filePath: string): string | null {
  if (!filePath.includes("<lang>")) {
    return "filePath must contain the '<lang>' placeholder";
  }
  if (/^[/\\]/.test(filePath) || /^[a-zA-Z]:/.test(filePath)) {
    return "filePath must be a relative path";
  }
  const parts = filePath.replace(/\\/g, "/").split("/");
  if (parts.some((p) => p === "..")) {
    return "filePath must not contain '..' segments";
  }
  return null;
}
