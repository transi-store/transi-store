export enum SupportedFormat {
  JSON = "json",
  XLIFF = "xliff",
  YAML = "yaml",
  CSV = "csv",
  PO = "po",
  INI = "ini",
  PHP = "php",
}

/** Human-readable labels for each format (used in UI dropdowns and CLI help). */
export const FORMAT_LABELS: Record<SupportedFormat, string> = {
  [SupportedFormat.JSON]: "JSON",
  [SupportedFormat.XLIFF]: "XLIFF",
  [SupportedFormat.YAML]: "YAML",
  [SupportedFormat.CSV]: "CSV",
  [SupportedFormat.PO]: "Gettext (PO)",
  [SupportedFormat.INI]: "INI",
  [SupportedFormat.PHP]: "PHP",
};

/** Formatted list of supported formats for display in error messages: `'json', 'xliff', …` */
export const SUPPORTED_FORMATS_LIST = new Intl.ListFormat("en", {
  type: "disjunction",
}).format(Object.values(SupportedFormat).map((f) => `'${f}'`));

/** File extension → SupportedFormat mapping. */
const EXTENSION_TO_FORMAT: Record<string, SupportedFormat> = {
  ".json": SupportedFormat.JSON,
  ".xliff": SupportedFormat.XLIFF,
  ".xlf": SupportedFormat.XLIFF,
  ".yaml": SupportedFormat.YAML,
  ".yml": SupportedFormat.YAML,
  ".csv": SupportedFormat.CSV,
  ".po": SupportedFormat.PO,
  ".ini": SupportedFormat.INI,
  ".php": SupportedFormat.PHP,
};

/** Returns the matching SupportedFormat for a filename based on its extension, or `undefined`. */
export function getFormatFromFilename(
  filename: string,
): SupportedFormat | undefined {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return EXTENSION_TO_FORMAT[ext];
}

export function isSupportedFormat(format: string): format is SupportedFormat {
  return (Object.values(SupportedFormat) as Array<string>).includes(format);
}
