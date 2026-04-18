import { db, schema } from "./db.server";
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import { searchTranslationKeys } from "./search-utils.server";
import { type RegularDataRow, type SearchDataRow } from "./translation-helper";
import { TranslationKeysSort } from "./sort/keySort";
import type { TranslationKey } from "../../drizzle/schema";

type TranslationKeysReturnType = {
  count: number;
  data: Array<RegularDataRow | SearchDataRow>;
};

/**
 * Build the WHERE condition for filtering translation keys by branch.
 * - branchId = undefined → main only (branch_id IS NULL)
 * - branchId = number, branchOnly = false → main + that branch (for export)
 * - branchId = number, branchOnly = true → only that branch (for UI)
 * - allBranches = true → all keys regardless of branch (no branch filtering)
 *
 * Always excludes soft-deleted keys (deletedAt IS NULL).
 */
function branchFilter({
  branchId,
  branchOnly,
  allBranches,
}: {
  branchId?: number;
  branchOnly?: boolean;
  allBranches?: boolean;
}): SQL {
  const notDeleted = isNull(schema.translationKeys.deletedAt);

  if (allBranches) {
    return notDeleted;
  }

  if (branchId !== undefined) {
    if (branchOnly) {
      return and(eq(schema.translationKeys.branchId, branchId), notDeleted)!;
    }
    return and(
      or(
        isNull(schema.translationKeys.branchId),
        eq(schema.translationKeys.branchId, branchId),
      )!,
      notDeleted,
    )!;
  }
  return and(isNull(schema.translationKeys.branchId), notDeleted)!;
}

export async function getTranslationKeys(
  projectId: number,
  options?: {
    search?: string;
    limit?: number;
    offset?: number;
    sort?: TranslationKeysSort;
    branchId?: number;
    branchOnly?: boolean;
    fileId?: number;
  },
): Promise<TranslationKeysReturnType> {
  let keys: Array<
    Omit<
      RegularDataRow | SearchDataRow,
      "translatedLocales" | "defaultTranslation"
    >
  >;
  let count: number;

  const defaultLocale = await db.query.projectLanguages.findFirst({
    where: {
      projectId,
      isDefault: true,
    },
  });

  const branchCondition = branchFilter({
    branchId: options?.branchId,
    branchOnly: options?.branchOnly,
  });

  const fileCondition =
    options?.fileId !== undefined
      ? eq(schema.translationKeys.fileId, options.fileId)
      : undefined;

  if (options?.search) {
    const searchQuery = options.search.trim();
    const keysWithSimilarity = await searchTranslationKeys(
      searchQuery,
      [projectId],
      {
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
        sort: options?.sort ?? TranslationKeysSort.RELEVANCE,
        branchId: options?.branchId,
        branchOnly: options?.branchOnly,
        fileId: options?.fileId,
      },
    );
    keys = keysWithSimilarity.map(
      (
        row,
      ): Omit<SearchDataRow, "translatedLocales" | "defaultTranslation"> => ({
        ...row.key,
        matchType: row.matchType,
        translationLocale: row.translationLocale,
        translationValue: row.translationValue,
      }),
    );
    count = keysWithSimilarity.length;
  } else {
    // No search query - use regular query ordered by selected sort
    keys = await db
      .select()
      .from(schema.translationKeys)
      .where(
        and(
          eq(schema.translationKeys.projectId, projectId),
          branchCondition,
          fileCondition,
        ),
      )
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0)
      .orderBy(
        options?.sort === TranslationKeysSort.CREATED_AT
          ? desc(schema.translationKeys.createdAt)
          : schema.translationKeys.keyName,
      );

    count = await db.$count(
      schema.translationKeys,
      and(
        eq(schema.translationKeys.projectId, projectId),
        branchCondition,
        fileCondition,
      ),
    );
  }

  if (keys.length === 0) {
    return { data: [], count };
  }

  // Get translations for these keys
  const keyIds = keys.map((k) => k.id);
  const translations = await db
    .select()
    .from(schema.translations)
    .where(inArray(schema.translations.keyId, keyIds));

  const translationsByKey: Record<
    number,
    Array<typeof schema.translations.$inferSelect>
  > = translations.reduce(
    (acc, translation) => {
      if (!acc[translation.keyId]) {
        acc[translation.keyId] = [];
      }
      acc[translation.keyId].push(translation);
      return acc;
    },
    {} as Record<number, Array<typeof schema.translations.$inferSelect>>,
  );

  // Combine keys with their translated locales
  return {
    count,
    data: keys.map((key) => ({
      ...key,
      translatedLocales: translationsByKey[key.id]
        ? translationsByKey[key.id].map((t) => t.locale)
        : [],
      defaultTranslation:
        translationsByKey[key.id]?.find(
          (t) => t.keyId === key.id && t.locale === defaultLocale?.locale,
        )?.value ?? null,
    })),
  };
}

export async function getTranslationKeyById(keyId: number) {
  return await db.query.translationKeys.findFirst({
    where: { id: keyId },
  });
}

export async function getTranslationKeyByName(
  projectId: number,
  keyName: string,
): Promise<TranslationKey | undefined> {
  return await db.query.translationKeys.findFirst({
    where: { projectId, keyName },
  });
}

type CreateTranslationKeyParams = {
  projectId: number;
  keyName: string;
  description?: string | null;
  branchId?: number | null;
  fileId: number;
};

export async function createTranslationKey({
  projectId,
  keyName,
  description,
  branchId = null,
  fileId,
}: CreateTranslationKeyParams): Promise<number> {
  const [key] = await db
    .insert(schema.translationKeys)
    .values({
      projectId,
      keyName,
      description,
      branchId,
      fileId,
    })
    .returning();

  return key.id;
}

type UpdateTranslationKeyParams = {
  keyId: number;
  keyName?: string;
  description?: string;
};

export async function updateTranslationKey(
  params: UpdateTranslationKeyParams,
): Promise<void> {
  const updates: Partial<typeof schema.translationKeys.$inferInsert> = {};

  if (params.keyName !== undefined) {
    updates.keyName = params.keyName;
  }

  if (params.description !== undefined) {
    updates.description = params.description;
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.translationKeys)
      .set(updates)
      .where(eq(schema.translationKeys.id, params.keyId));
  }
}

export async function deleteTranslation(
  keyId: number,
  locale: string,
): Promise<void> {
  await db
    .delete(schema.translations)
    .where(
      and(
        eq(schema.translations.keyId, keyId),
        eq(schema.translations.locale, locale),
      ),
    );
}

export async function deleteTranslationKey(keyId: number) {
  await db
    .delete(schema.translationKeys)
    .where(eq(schema.translationKeys.id, keyId));
}

export async function duplicateTranslationKey(keyId: number) {
  // Get the original key
  const originalKey = await getTranslationKeyById(keyId);

  if (!originalKey) {
    throw new Error("Translation key not found");
  }

  // Get the original translations
  const originalTranslations = await getTranslationsForKey(keyId);

  // Find a unique name for the duplicated key
  let newKeyName = `${originalKey.keyName} (copy)`;
  let counter = 2;

  // Check if the key name already exists and increment counter if needed
  while (await getTranslationKeyByName(originalKey.projectId, newKeyName)) {
    newKeyName = `${originalKey.keyName} (copy ${counter})`;
    counter++;
  }

  // Create the new key with the unique name
  const newKeyId = await createTranslationKey({
    projectId: originalKey.projectId,
    keyName: newKeyName,
    description: originalKey.description,
  });

  // Copy all translations to the new key in parallel
  await Promise.all(
    originalTranslations.map((translation) =>
      upsertTranslation({
        keyId: newKeyId,
        locale: translation.locale,
        value: translation.value,
      }),
    ),
  );

  return newKeyId;
}

// Translation values management

export async function getTranslationsForKey(keyId: number) {
  return await db.query.translations.findMany({
    where: { keyId },
  });
}

type UpsertTranslationParams = {
  keyId: number;
  locale: string;
  value: string;
  isFuzzy?: boolean;
};

export async function upsertTranslation(params: UpsertTranslationParams) {
  // Check if translation exists
  const existing = await db.query.translations.findFirst({
    where: { keyId: params.keyId, locale: params.locale },
  });

  if (existing) {
    // Update existing
    const updateData: { value: string; isFuzzy?: boolean } = {
      value: params.value,
    };
    if (params.isFuzzy !== undefined) {
      updateData.isFuzzy = params.isFuzzy;
    }
    await db
      .update(schema.translations)
      .set(updateData)
      .where(eq(schema.translations.id, existing.id));

    return existing.id;
  } else {
    // Create new
    const [translation] = await db
      .insert(schema.translations)
      .values({
        keyId: params.keyId,
        locale: params.locale,
        value: params.value,
        isFuzzy: params.isFuzzy ?? false,
      })
      .returning();

    return translation.id;
  }
}

type ProjectTranslation = schema.TranslationKey & {
  translations: Array<typeof schema.translations.$inferSelect>;
};

export type ProjectTranslations = Array<ProjectTranslation>;

export async function getProjectTranslations(
  projectId: number,
  options?: { branchId?: number; allBranches?: boolean; fileId?: number },
): Promise<ProjectTranslations> {
  // Get all keys for this project, sorted alphabetically by keyName
  const conditions: Array<SQL> = [
    eq(schema.translationKeys.projectId, projectId),
    branchFilter({
      branchId: options?.branchId,
      allBranches: options?.allBranches,
    }),
  ];

  // Filter by file if provided
  if (options?.fileId !== undefined) {
    conditions.push(eq(schema.translationKeys.fileId, options.fileId));
  }

  // When exporting with a branch, also exclude main keys marked for deletion in that branch
  if (options?.branchId !== undefined) {
    const deletions = await db
      .select({ translationKeyId: schema.branchKeyDeletions.translationKeyId })
      .from(schema.branchKeyDeletions)
      .where(eq(schema.branchKeyDeletions.branchId, options.branchId));

    if (deletions.length > 0) {
      conditions.push(
        notInArray(
          schema.translationKeys.id,
          deletions.map((d) => d.translationKeyId),
        ),
      );
    }
  }

  const keys = await db
    .select()
    .from(schema.translationKeys)
    .where(and(...conditions))
    .orderBy(schema.translationKeys.keyName);

  if (keys.length === 0) {
    return [];
  }

  const keyIds = keys.map((k) => k.id);

  // Get all translations for these keys
  const translations = await db.query.translations.findMany({
    where: { keyId: { in: keyIds } },
  });

  // Combine in JavaScript
  return keys.map((key) => ({
    ...key,
    translations: translations.filter((t) => t.keyId === key.id),
  }));
}
