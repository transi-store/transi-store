import { db, schema } from "./db.server";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "./crypto.server";
import type { OrganizationAiProvider } from "../../drizzle/schema";
import type { AiProvider } from "./ai-providers";

interface SaveAiProviderParams {
  organizationId: number;
  provider: AiProvider;
  apiKey: string;
  isActive?: boolean;
}

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
): Promise<{ provider: AiProvider; isActive: boolean; hasKey: boolean }[]> {
  const providers = await db
    .select({
      provider: schema.organizationAiProviders.provider,
      isActive: schema.organizationAiProviders.isActive,
    })
    .from(schema.organizationAiProviders)
    .where(eq(schema.organizationAiProviders.organizationId, organizationId));

  return providers.map((p) => ({
    provider: p.provider as AiProvider,
    isActive: p.isActive ?? false,
    hasKey: true,
  }));
}

/**
 * Récupère la clé API déchiffrée pour un provider donné.
 * À utiliser uniquement côté serveur pour les appels API.
 */
export async function getDecryptedApiKey(
  organizationId: number,
  provider: AiProvider,
): Promise<string | null> {
  const [result] = await db
    .select({ encryptedApiKey: schema.organizationAiProviders.encryptedApiKey })
    .from(schema.organizationAiProviders)
    .where(
      and(
        eq(schema.organizationAiProviders.organizationId, organizationId),
        eq(schema.organizationAiProviders.provider, provider),
      ),
    )
    .limit(1);

  if (!result) {
    return null;
  }

  return decrypt(result.encryptedApiKey);
}

/**
 * Récupère le provider actif pour une organisation.
 */
export async function getActiveAiProvider(
  organizationId: number,
): Promise<{ provider: AiProvider; apiKey: string } | null> {
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
    provider: result.provider as AiProvider,
    apiKey: decrypt(result.encryptedApiKey),
  };
}

/**
 * Active un provider IA et désactive les autres pour une organisation.
 */
export async function setActiveAiProvider(
  organizationId: number,
  provider: AiProvider,
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
  provider: AiProvider,
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
