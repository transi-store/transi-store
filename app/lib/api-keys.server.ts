import { randomBytes } from "crypto";
import { db, schema } from "./db.server";
import { eq, and } from "drizzle-orm";
import type { ApiKey } from "../../drizzle/schema";

/**
 * Génère une clé d'API aléatoire de 32 caractères alphanumériques
 * 24 bytes = 192 bits d'entropie, encodé en base64url = ~32 caractères
 */
function generateApiKey(): string {
  return randomBytes(24).toString("base64url");
}

type CreateApiKeyParams = {
  organizationId: number;
  name?: string;
  createdBy: number;
};

/**
 * Crée une nouvelle clé d'API pour une organisation
 */
export async function createApiKey(
  params: CreateApiKeyParams,
): Promise<{ id: number; keyValue: string }> {
  const keyValue = generateApiKey();

  const [apiKey] = await db
    .insert(schema.apiKeys)
    .values({
      organizationId: params.organizationId,
      keyValue,
      name: params.name ?? null,
      createdBy: params.createdBy,
    })
    .returning();

  return { id: apiKey.id, keyValue };
}

/**
 * Récupère toutes les clés d'API d'une organisation
 * Note: Ne retourne pas les valeurs des clés (keyValue) pour des raisons de sécurité
 */
export async function getOrganizationApiKeys(
  organizationId: number,
): Promise<Array<ApiKey>> {
  const keys = await db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.organizationId, organizationId))
    .orderBy(schema.apiKeys.createdAt);

  return keys;
}

/**
 * Supprime une clé d'API
 * Vérifie que la clé appartient bien à l'organisation spécifiée
 */
export async function deleteApiKey(
  id: number,
  organizationId: number,
): Promise<void> {
  await db
    .delete(schema.apiKeys)
    .where(
      and(
        eq(schema.apiKeys.id, id),
        eq(schema.apiKeys.organizationId, organizationId),
      ),
    );
}

/**
 * Récupère l'organisation associée à une clé d'API
 * Retourne null si la clé n'existe pas
 */
export async function getOrganizationByApiKey(
  keyValue: string,
): Promise<{ id: number; slug: string; name: string } | null> {
  const result = await db
    .select({
      id: schema.organizations.id,
      slug: schema.organizations.slug,
      name: schema.organizations.name,
    })
    .from(schema.apiKeys)
    .innerJoin(
      schema.organizations,
      eq(schema.apiKeys.organizationId, schema.organizations.id),
    )
    .where(eq(schema.apiKeys.keyValue, keyValue))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Met à jour la date de dernière utilisation d'une clé d'API
 */
export async function updateApiKeyLastUsed(keyValue: string): Promise<void> {
  await db
    .update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.keyValue, keyValue));
}
