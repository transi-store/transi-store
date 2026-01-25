import { randomBytes, randomUUID } from "crypto";
import { db, schema } from "./db.server";
import { eq, and } from "drizzle-orm";
import type { ApiKey } from "../../drizzle/schema";

/**
 * Génère une clé d'API aléatoire de 32 caractères alphanumériques
 * 24 bytes = 192 bits d'entropie, encodé en base64url = ~32 caractères
 */
export function generateApiKey(): string {
  return randomBytes(24).toString("base64url");
}

interface CreateApiKeyParams {
  organizationId: string;
  name?: string;
  createdBy: string;
}

/**
 * Crée une nouvelle clé d'API pour une organisation
 */
export async function createApiKey(
  params: CreateApiKeyParams,
): Promise<{ id: string; keyValue: string }> {
  const id = randomUUID();
  const keyValue = generateApiKey();

  await db.insert(schema.apiKeys).values({
    id,
    organizationId: params.organizationId,
    keyValue,
    name: params.name || null,
    createdBy: params.createdBy,
  });

  return { id, keyValue };
}

/**
 * Récupère toutes les clés d'API d'une organisation
 * Note: Ne retourne pas les valeurs des clés (keyValue) pour des raisons de sécurité
 */
export async function getOrganizationApiKeys(
  organizationId: string,
): Promise<Omit<ApiKey, "keyValue">[]> {
  const keys = await db
    .select({
      id: schema.apiKeys.id,
      organizationId: schema.apiKeys.organizationId,
      name: schema.apiKeys.name,
      createdBy: schema.apiKeys.createdBy,
      createdAt: schema.apiKeys.createdAt,
      lastUsedAt: schema.apiKeys.lastUsedAt,
    })
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
  id: string,
  organizationId: string,
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
): Promise<{ id: string; slug: string; name: string } | null> {
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

  return result[0] || null;
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

/**
 * Vérifie si une clé d'API est valide et appartient à l'organisation spécifiée
 */
export async function validateApiKey(
  keyValue: string,
  organizationSlug: string,
): Promise<boolean> {
  const org = await getOrganizationByApiKey(keyValue);
  return org !== null && org.slug === organizationSlug;
}
