import { db, schema } from "./db.server";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "./crypto.server";
import type { OrganizationAiProvider } from "../../drizzle/schema";
import { AiProviderEnum } from "./ai-providers";

type SaveAiProviderParams = {
  organizationId: number;
  provider: AiProviderEnum;
  apiKey?: string | null; // Optional for updates: if omitted, existing key is preserved
  model?: string | null;
  isActive?: boolean;
};

/**
 * Sauvegarde ou met à jour un provider IA pour une organisation.
 * La clé API est chiffrée avant stockage.
 */
export async function saveAiProvider(
  params: SaveAiProviderParams,
): Promise<OrganizationAiProvider> {
  const [existing] = await db
    .select()
    .from(schema.organizationAiProviders)
    .where(
      and(
        eq(
          schema.organizationAiProviders.organizationId,
          params.organizationId,
        ),
        eq(schema.organizationAiProviders.provider, params.provider),
      ),
    )
    .limit(1);

  if (existing) {
    // Mise à jour
    const [updated] = await db
      .update(schema.organizationAiProviders)
      .set({
        ...(params.apiKey ? { encryptedApiKey: encrypt(params.apiKey) } : {}),
        model: params.model !== undefined ? params.model : existing.model,
        isActive: params.isActive ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(schema.organizationAiProviders.id, existing.id))
      .returning();

    return updated;
  } else {
    // Création : apiKey obligatoire (validé par l'appelant)
    if (!params.apiKey) {
      throw new Error("apiKey is required when creating a new AI provider");
    }
    const [created] = await db
      .insert(schema.organizationAiProviders)
      .values({
        organizationId: params.organizationId,
        provider: params.provider,
        encryptedApiKey: encrypt(params.apiKey),
        model: params.model ?? null,
        isActive: params.isActive ?? false,
      })
      .returning();

    return created;
  }
}

/**
 * Récupère tous les providers IA configurés pour une organisation.
 * Les clés API ne sont PAS déchiffrées (retourne juste l'existence).
 */
export async function getOrganizationAiProviders(
  organizationId: number,
): Promise<
  Array<Pick<OrganizationAiProvider, "provider" | "isActive" | "model">>
> {
  const providers = await db
    .select({
      provider: schema.organizationAiProviders.provider,
      isActive: schema.organizationAiProviders.isActive,
      model: schema.organizationAiProviders.model,
    })
    .from(schema.organizationAiProviders)
    .where(eq(schema.organizationAiProviders.organizationId, organizationId));

  return providers;
}

export async function isAiProviderConfiguredForOrganization(
  organizationId: number,
  providerName: AiProviderEnum,
): Promise<boolean> {
  const providers = await db
    .select({
      provider: schema.organizationAiProviders.provider,
    })
    .from(schema.organizationAiProviders)
    .where(
      and(
        eq(schema.organizationAiProviders.organizationId, organizationId),
        eq(schema.organizationAiProviders.provider, providerName),
      ),
    )
    .limit(1);

  return providers.length > 0;
}

async function fetchActiveAiProviderRow(
  organizationId: number,
): Promise<Pick<
  OrganizationAiProvider,
  "provider" | "encryptedApiKey" | "model"
> | null> {
  const [row] = await db
    .select({
      provider: schema.organizationAiProviders.provider,
      encryptedApiKey: schema.organizationAiProviders.encryptedApiKey,
      model: schema.organizationAiProviders.model,
    })
    .from(schema.organizationAiProviders)
    .where(
      and(
        eq(schema.organizationAiProviders.organizationId, organizationId),
        eq(schema.organizationAiProviders.isActive, true),
      ),
    )
    .limit(1);

  return row;
}

/**
 * Récupère le provider actif pour une organisation.
 */
export async function getActiveAiProvider(organizationId: number): Promise<{
  provider: AiProviderEnum;
  apiKey: string;
  model: string | null;
} | null> {
  const row = await fetchActiveAiProviderRow(organizationId);

  if (!row) {
    return null;
  }

  return {
    provider: row.provider,
    apiKey: decrypt(row.encryptedApiKey),
    model: row.model,
  };
}

/**
 * Returns whether the organization has an active AI provider row.
 * Does not decrypt the API key — safe for loaders and UI gating.
 */
export async function hasActiveAiProvider(
  organizationId: number,
): Promise<boolean> {
  const row = await fetchActiveAiProviderRow(organizationId);

  return row !== undefined;
}

/**
 * Active un provider IA et désactive les autres pour une organisation.
 */
export async function setActiveAiProvider(
  organizationId: number,
  provider: AiProviderEnum,
): Promise<void> {
  // Désactiver tous les providers
  await db
    .update(schema.organizationAiProviders)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(schema.organizationAiProviders.organizationId, organizationId));

  // Activer le provider sélectionné
  await db
    .update(schema.organizationAiProviders)
    .set({ isActive: true, updatedAt: new Date() })
    .where(
      and(
        eq(schema.organizationAiProviders.organizationId, organizationId),
        eq(schema.organizationAiProviders.provider, provider),
      ),
    );
}

/**
 * Supprime un provider IA pour une organisation.
 */
export async function deleteAiProvider(
  organizationId: number,
  provider: AiProviderEnum,
): Promise<void> {
  await db
    .delete(schema.organizationAiProviders)
    .where(
      and(
        eq(schema.organizationAiProviders.organizationId, organizationId),
        eq(schema.organizationAiProviders.provider, provider),
      ),
    );
}
