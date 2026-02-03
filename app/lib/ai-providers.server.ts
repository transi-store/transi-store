import { db, schema } from "./db.server";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "./crypto.server";
import type { OrganizationAiProvider } from "../../drizzle/schema";
import { AiProviderEnum } from "./ai-providers";

type SaveAiProviderParams = {
  organizationId: number;
  provider: AiProviderEnum;
  apiKey: string;
  isActive?: boolean;
};

/**
 * Sauvegarde ou met à jour un provider IA pour une organisation.
 * La clé API est chiffrée avant stockage.
 */
export async function saveAiProvider(
  params: SaveAiProviderParams,
): Promise<OrganizationAiProvider> {
  const encryptedApiKey = encrypt(params.apiKey);

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
        encryptedApiKey,
        isActive: params.isActive ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(schema.organizationAiProviders.id, existing.id))
      .returning();

    return updated;
  } else {
    // Création
    const [created] = await db
      .insert(schema.organizationAiProviders)
      .values({
        organizationId: params.organizationId,
        provider: params.provider,
        encryptedApiKey,
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
): Promise<Array<Pick<OrganizationAiProvider, "provider" | "isActive">>> {
  const providers = await db
    .select({
      provider: schema.organizationAiProviders.provider,
      isActive: schema.organizationAiProviders.isActive,
    })
    .from(schema.organizationAiProviders)
    .where(eq(schema.organizationAiProviders.organizationId, organizationId));

  return providers;
}

/**
 * Récupère le provider actif pour une organisation.
 */
export async function getActiveAiProvider(
  organizationId: number,
): Promise<{ provider: AiProviderEnum; apiKey: string } | null> {
  const [result] = await db
    .select({
      provider: schema.organizationAiProviders.provider,
      encryptedApiKey: schema.organizationAiProviders.encryptedApiKey,
    })
    .from(schema.organizationAiProviders)
    .where(
      and(
        eq(schema.organizationAiProviders.organizationId, organizationId),
        eq(schema.organizationAiProviders.isActive, true),
      ),
    )
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    provider: result.provider,
    apiKey: decrypt(result.encryptedApiKey),
  };
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
