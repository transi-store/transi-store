import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "~/lib/db.server";
import { ImportStrategy } from "./import-strategy";

type ImportParams = {
  projectId: number;
  locale: string;
  data: Record<string, string>;
  strategy: ImportStrategy;
  branchId?: number;
};

export type ImportStats = {
  total: number;
  keysCreated: number;
  translationsCreated: number;
  translationsUpdated: number;
  translationsSkipped: number;
};

type ImportResult = {
  success: boolean;
  stats: ImportStats;
  errors: Array<string>;
};

type ParseResult = {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
};

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
  } catch (_error) {
    return {
      success: false,
      error: "Format JSON invalide",
    };
  }
}

/**
 * Validate import data structure
 */
export function validateImportData(
  data: Record<string, string>,
): Array<string> {
  const errors: Array<string> = [];

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

/** PostgreSQL has a limit on the number of parameters in a single query */
const BATCH_SIZE = 500;

/**
 * Import translations from parsed JSON data using batch operations.
 * Uses INSERT ... ON CONFLICT for efficient bulk processing (~5 queries
 * instead of ~4-6 per entry).
 */
export async function importTranslations({
  projectId,
  locale,
  data,
  strategy,
  branchId,
}: ImportParams): Promise<ImportResult> {
  const stats: ImportStats = {
    total: 0,
    keysCreated: 0,
    translationsCreated: 0,
    translationsUpdated: 0,
    translationsSkipped: 0,
  };

  try {
    const entries = Object.entries(data);
    stats.total = entries.length;

    if (entries.length === 0) {
      return { success: true, stats, errors: [] };
    }

    await db.transaction(async (tx) => {
      const keyNames = entries.map(([keyName]) => keyName);

      // 1. Fetch all existing keys for this project in one query
      const existingKeys = await tx
        .select({ id: schema.translationKeys.id, keyName: schema.translationKeys.keyName })
        .from(schema.translationKeys)
        .where(
          and(
            eq(schema.translationKeys.projectId, projectId),
            inArray(schema.translationKeys.keyName, keyNames),
          ),
        );

      const existingKeyMap = new Map(existingKeys.map((k) => [k.keyName, k.id]));

      // 2. Batch insert new keys (ON CONFLICT DO NOTHING)
      const newKeyNames = keyNames.filter((name) => !existingKeyMap.has(name));

      if (newKeyNames.length > 0) {
        for (let i = 0; i < newKeyNames.length; i += BATCH_SIZE) {
          const batch = newKeyNames.slice(i, i + BATCH_SIZE);
          const insertedKeys = await tx
            .insert(schema.translationKeys)
            .values(
              batch.map((keyName) => ({
                projectId,
                keyName,
                branchId: branchId ?? null,
              })),
            )
            .onConflictDoNothing({
              target: [schema.translationKeys.projectId, schema.translationKeys.keyName],
            })
            .returning({ id: schema.translationKeys.id, keyName: schema.translationKeys.keyName });

          for (const key of insertedKeys) {
            existingKeyMap.set(key.keyName, key.id);
          }
        }

        stats.keysCreated = newKeyNames.length;
      }

      // 3. Build the keyName → keyId map (all keys should now exist)
      // If some keys were skipped by ON CONFLICT DO NOTHING (race condition),
      // re-fetch them
      const missingKeys = keyNames.filter((name) => !existingKeyMap.has(name));
      if (missingKeys.length > 0) {
        const refetchedKeys = await tx
          .select({ id: schema.translationKeys.id, keyName: schema.translationKeys.keyName })
          .from(schema.translationKeys)
          .where(
            and(
              eq(schema.translationKeys.projectId, projectId),
              inArray(schema.translationKeys.keyName, missingKeys),
            ),
          );
        for (const key of refetchedKeys) {
          existingKeyMap.set(key.keyName, key.id);
        }
      }

      // 4. Fetch existing translations for these keys + locale in one query
      const allKeyIds = [...existingKeyMap.values()];
      const existingTranslations = await tx
        .select({ keyId: schema.translations.keyId })
        .from(schema.translations)
        .where(
          and(
            inArray(schema.translations.keyId, allKeyIds),
            eq(schema.translations.locale, locale),
          ),
        );

      const existingTranslationKeyIds = new Set(existingTranslations.map((t) => t.keyId));

      // 5. Batch upsert translations based on strategy
      const translationValues = entries.map(([keyName, value]) => ({
        keyId: existingKeyMap.get(keyName)!,
        locale,
        value,
        isFuzzy: false,
      }));

      if (strategy === ImportStrategy.OVERWRITE) {
        // INSERT ... ON CONFLICT DO UPDATE for all entries
        for (let i = 0; i < translationValues.length; i += BATCH_SIZE) {
          const batch = translationValues.slice(i, i + BATCH_SIZE);
          await tx
            .insert(schema.translations)
            .values(batch)
            .onConflictDoUpdate({
              target: [schema.translations.keyId, schema.translations.locale],
              set: {
                value: sql`excluded.value`,
                updatedAt: sql`now()`,
              },
            });
        }

        // Count stats based on what existed before
        for (const [keyName] of entries) {
          const keyId = existingKeyMap.get(keyName)!;
          if (existingTranslationKeyIds.has(keyId)) {
            stats.translationsUpdated++;
          } else {
            stats.translationsCreated++;
          }
        }
      } else {
        // SKIP strategy: INSERT ... ON CONFLICT DO NOTHING (only create new)
        const newTranslations = translationValues.filter(
          (t) => !existingTranslationKeyIds.has(t.keyId),
        );

        if (newTranslations.length > 0) {
          for (let i = 0; i < newTranslations.length; i += BATCH_SIZE) {
            const batch = newTranslations.slice(i, i + BATCH_SIZE);
            await tx
              .insert(schema.translations)
              .values(batch)
              .onConflictDoNothing({
                target: [schema.translations.keyId, schema.translations.locale],
              });
          }
        }

        stats.translationsCreated = newTranslations.length;
        stats.translationsSkipped = entries.length - newTranslations.length;
      }
    });

    return {
      success: true,
      stats,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      stats,
      errors: [
        error instanceof Error ? error.message : "Erreur lors de l'import",
      ],
    };
  }
}
