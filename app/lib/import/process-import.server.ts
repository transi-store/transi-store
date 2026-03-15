import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { getBranchBySlug, createBranch } from "~/lib/branches.server";
import {
  parseImportJSON,
  validateImportData,
  importTranslations,
} from "./json.server";
import { parseImportXLIFF } from "./xliff.server";
import type { ImportStats } from "./json.server";
import { ImportStrategy } from "./import-strategy";
import { BRANCH_STATUS } from "../branches";

type ProcessImportResult =
  | { success: true; importStats: ImportStats }
  | { success: false; error: string; details?: string };

type ProcessImportParams = {
  organizationId: number;
  projectSlug: string;
  formData: FormData;
  branchSlug?: string;
};

/**
 * Shared import processing logic used by both the UI action and the API endpoint.
 * Handles all validation (file, locale, strategy, format) and import processing.
 */
export async function processImport(
  params: ProcessImportParams,
): Promise<ProcessImportResult> {
  const { organizationId, projectSlug, formData, branchSlug } = params;

  // 1. Validate file input
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { success: false, error: "Missing 'file' field" };
  }

  // 2. Validate locale input
  const locale = formData.get("locale");
  if (!locale || typeof locale !== "string") {
    return { success: false, error: "Missing 'locale' field" };
  }

  // 3. Validate strategy input
  const strategy = formData.get("strategy");
  if (
    strategy !== ImportStrategy.OVERWRITE &&
    strategy !== ImportStrategy.SKIP
  ) {
    return {
      success: false,
      error: `Invalid 'strategy' field. Use '${ImportStrategy.OVERWRITE}' or '${ImportStrategy.SKIP}'`,
    };
  }

  // 4. Detect format from explicit parameter or file extension
  const formatParam = formData.get("format");
  let format: "json" | "xliff";

  if (
    typeof formatParam === "string" &&
    (formatParam === "json" || formatParam === "xliff")
  ) {
    format = formatParam;
  } else if (file.name.endsWith(".xliff") || file.name.endsWith(".xlf")) {
    format = "xliff";
  } else if (file.name.endsWith(".json") || file.type === "application/json") {
    format = "json";
  } else {
    return {
      success: false,
      error: "Unsupported file format. Use JSON or XLIFF",
    };
  }

  // 5. Read file content
  let fileContent: string;
  try {
    fileContent = await file.text();
  } catch (_error) {
    return { success: false, error: "Unable to read file content" };
  }

  // 6. Resolve project
  const project = await getProjectBySlug(organizationId, projectSlug);
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  // 6b. Resolve optional branch (create if it doesn't exist)
  let branchId: number | undefined;
  if (branchSlug) {
    let branch = await getBranchBySlug(project.id, branchSlug);
    if (!branch) {
      try {
        branch = await createBranch({
          projectId: project.id,
          name: branchSlug,
          slug: branchSlug,
        });
      } catch (_error) {
        return {
          success: false,
          error: `Branch '${branchSlug}' not found and could not be created`,
        };
      }
    }
    if (branch.status !== BRANCH_STATUS.OPEN) {
      return {
        success: false,
        error: `Branch '${branchSlug}' is not open`,
      };
    }
    branchId = branch.id;
  }

  // 7. Verify locale exists in project
  const languages = await getProjectLanguages(project.id);
  if (!languages.some((l) => l.locale === locale)) {
    return {
      success: false,
      error: `Language '${locale}' not found in this project`,
    };
  }

  // 8. Parse file based on format
  const parseResult =
    format === "xliff"
      ? parseImportXLIFF(fileContent)
      : parseImportJSON(fileContent);

  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error ?? "Parse error",
      details: parseResult.error,
    };
  }

  // 9. Validate data structure
  const validationErrors = validateImportData(parseResult.data!);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: "Invalid data",
      details: validationErrors.join(", "),
    };
  }

  // 10. Import translations
  const result = await importTranslations({
    projectId: project.id,
    locale,
    data: parseResult.data!,
    strategy,
    branchId,
  });

  if (!result.success) {
    return {
      success: false,
      error: "Import failed",
      details: result.errors.join(", "),
    };
  }

  return {
    success: true,
    importStats: result.stats,
  };
}
