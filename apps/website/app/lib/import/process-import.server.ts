import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { getBranchBySlug, createBranch } from "~/lib/branches.server";
import { validateImportData } from "./validate-import-data.server";
import { importTranslations } from "./import-translations.server";
import type { ImportStats } from "./import-translations.server";
import { createTranslationFormat } from "~/lib/format/format-factory.server";
import { BRANCH_STATUS } from "../branches";
import {
  SupportedFormat,
  SUPPORTED_FORMATS_LIST,
  getFormatFromFilename,
} from "@transi-store/common";
import { importFieldsSchema } from "../api-doc/schemas/import";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

type ProcessImportResult =
  | { success: true; importStats: ImportStats }
  | { success: false; error: string; details?: string };

type ProcessImportParams = {
  organizationId: number;
  projectSlug: string;
  formData: FormData;
  branchSlug?: string;
  fileId: number;
};

/**
 * Shared import processing logic used by both the UI action and the API endpoint.
 * Handles all validation (file, locale, strategy, format) and import processing.
 */
export async function processImport({
  organizationId,
  projectSlug,
  formData,
  fileId,
}: ProcessImportParams): Promise<ProcessImportResult> {
  // 1. Validate file input
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { success: false, error: "Missing 'file' field" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "File is too large (maximum 5 MB)" };
  }

  // 2. Validate text fields with shared Zod schema
  const fieldsResult = importFieldsSchema().safeParse({
    locale: formData.get("locale"),
    strategy: formData.get("strategy") || undefined,
    format: formData.get("format") || undefined,
    branch: formData.get("branch") || undefined,
  });

  if (!fieldsResult.success) {
    return {
      success: false,
      error: fieldsResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }

  const {
    locale,
    strategy,
    format: formatParam,
    branch: branchSlug,
  } = fieldsResult.data;

  // 4. Detect format from explicit parameter or file extension
  let format: SupportedFormat;

  if (formatParam) {
    format = formatParam;
  } else {
    const detected =
      getFormatFromFilename(file.name) ??
      (file.type === "application/json" ? SupportedFormat.JSON : undefined);

    if (!detected) {
      return {
        success: false,
        error: `Unsupported file format. Use ${SUPPORTED_FORMATS_LIST}`,
      };
    }

    format = detected;
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
    return { success: false, error: `Project "${projectSlug}" not found` };
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
  const translator = createTranslationFormat(format);
  const parseResult = translator.parseImport(fileContent);

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
    fileId,
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
