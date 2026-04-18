/**
 * Validates that a file path is safe:
 * - Must not contain ".." segments (path traversal)
 * - Must not be an absolute path (starts with "/" or a drive letter on Windows)
 * - Must contain the "<lang>" placeholder
 */
export function validateOutputPath(filePath: string): string | null {
  if (!filePath.includes("<lang>")) {
    return "filePath must contain the '<lang>' placeholder";
  }
  // Reject absolute paths
  if (/^[/\\]/.test(filePath) || /^[a-zA-Z]:/.test(filePath)) {
    return "filePath must be a relative path";
  }
  // Reject path traversal sequences
  const parts = filePath.replace(/\\/g, "/").split("/");
  if (parts.some((p) => p === "..")) {
    return "filePath must not contain '..' segments";
  }
  return null;
}
