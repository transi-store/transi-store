import { db } from "~/lib/db.server";
import {
  getTranslationKeyByName,
  createTranslationKey,
  upsertTranslation,
} from "~/lib/translation-keys.server";

interface ImportParams {
  projectId: number;
  locale: string;
  data: Record<string, string>;
  strategy: "overwrite" | "skip";
}

interface ImportResult {
  success: boolean;
  stats: {
    total: number;
    keysCreated: number;
    translationsCreated: number;
    translationsUpdated: number;
    translationsSkipped: number;
  };
  errors: string[];
}

interface ParseResult {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Parse and validate JSON file content
 */
export function parseImportJSON(fileContent: string): ParseResult {
  // Check file size (approximate, based on string length)
  if (fileContent.length > MAX_FILE_SIZE) {
    return {
      success: false,
      error: "Le fichier est trop volumineux (maximum 5 MB)",
    };
  }

  try {
    const parsed = JSON.parse(fileContent);

    // Validate structure: must be an object
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {
        success: false,
        error:
          "Le fichier doit contenir un objet JSON avec des paires clé/valeur",
      };
    }

    return {
      success: true,
      data: parsed as Record<string, string>,
    };
  } catch (error) {
    return {
      success: false,
      error: "Format JSON invalide",
    };
  }
}

/**
 * Validate import data structure
 */
export function validateImportData(data: Record<string, string>): string[] {
  const errors: string[] = [];

  const entries = Object.entries(data);

  if (entries.length === 0) {
    return ["Le fichier ne contient aucune traduction"];
  }

  for (const [key, value] of entries) {
    // Check key is non-empty
    if (!key || key.trim() === "") {
      errors.push("Une clé vide a été trouvée dans le fichier");
      continue;
    }

    // Check key length (database limit is 500)
    if (key.length > 500) {
      errors.push(
        `La clé "${key.substring(0, 50)}..." est trop longue (maximum 500 caractères)`,
      );
    }

    // Check value is a string
    if (typeof value !== "string") {
      errors.push(
        `La valeur pour la clé "${key}" doit être une chaîne de caractères`,
      );
    }
  }

  return errors;
}

/**
 * Import translations from parsed JSON data
 * Processes all keys in a transaction (all or nothing)
 */
export async function importTranslations(
  params: ImportParams,
): Promise<ImportResult> {
  const { projectId, locale, data, strategy } = params;

  const stats = {
    total: 0,
    keysCreated: 0,
    translationsCreated: 0,
    translationsUpdated: 0,
    translationsSkipped: 0,
  };

  const errors: string[] = [];

  try {
    const entries = Object.entries(data);
    stats.total = entries.length;

    // Process all imports in a transaction
    await db.transaction(async () => {
      for (const [keyName, value] of entries) {
        try {
          // 1. Check if translation key exists
          let translationKey = await getTranslationKeyByName(
            Number(projectId),
            keyName,
          );

          // 2. Create key if it doesn't exist
          if (!translationKey) {
            const keyId = await createTranslationKey({
              projectId: Number(projectId),
              keyName,
              description: undefined,
            });

            // Reload the key to get full data
            translationKey = await db.query.translationKeys.findFirst({
              where: { id: keyId },
            });

            if (!translationKey) {
              throw new Error(`Échec de la création de la clé "${keyName}"`);
            }

            stats.keysCreated++;
          }

          // 3. Check if translation already exists
          const existingTranslation = await db.query.translations.findFirst({
            where: { keyId: translationKey.id, locale },
          });

          // 4. Apply strategy
          if (existingTranslation) {
            if (strategy === "overwrite") {
              // Update existing translation
              await upsertTranslation({
                keyId: translationKey.id,
                locale,
                value,
              });
              stats.translationsUpdated++;
            } else {
              // Skip existing translation
              stats.translationsSkipped++;
            }
          } else {
            // Create new translation
            await upsertTranslation({
              keyId: translationKey.id,
              locale,
              value,
            });
            stats.translationsCreated++;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Erreur inconnue";
          errors.push(`Erreur pour la clé "${keyName}": ${message}`);
          // Re-throw to rollback transaction
          throw error;
        }
      }
    });

    return {
      success: true,
      stats,
      errors: [],
    };
  } catch (error) {
    // Transaction failed, return error
    return {
      success: false,
      stats,
      errors:
        errors.length > 0
          ? errors
          : [
              error instanceof Error
                ? error.message
                : "Erreur lors de l'import",
            ],
    };
  }
}
