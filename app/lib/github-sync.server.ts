/**
 * Logique de synchronisation GitHub ↔ transi-store
 *
 * - syncPRFiles           : importation des fichiers de traduction d'une PR (3-way merge)
 * - pushTranslationsAfterMerge : push des locales traduites après merge d'une PR
 */

import { db, schema } from "./db.server";
import { eq, and } from "drizzle-orm";
import {
  getFileContent,
  commitFile,
  upsertPRComment,
} from "./github-app.server";
import {
  getTranslationKeyByName,
  createTranslationKey,
  getProjectTranslations,
} from "./translation-keys.server";
import { exportToJSON } from "./export/json.server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStats = {
  keysCreated: number;
  translationsCreated: number;
  /** Mise à jour directe (GitHub gagne, transi-store n'avait pas modifié) */
  translationsUpdated: number;
  /** Conflit détecté (les deux côtés ont modifié) */
  conflictsDetected: number;
  /** Aucun changement nécessaire */
  unchanged: number;
};

// ─── Path helper ──────────────────────────────────────────────────────────────

/**
 * Remplace {locale} dans le pattern par la locale concrète.
 * Ex: "public/locales/{locale}.json" + "fr" → "public/locales/fr.json"
 */
function buildLocalePath(pattern: string, locale: string): string {
  return pattern.replace("{locale}", locale);
}

// ─── 3-way merge pour une clé ─────────────────────────────────────────────────

type ThreeWayResult =
  | { action: "none" }
  | { action: "create"; value: string }
  | { action: "github_wins"; newValue: string }
  | { action: "transi_wins" }
  | { action: "conflict"; incomingValue: string };

/**
 * Applique la logique de fusion à 3 sources pour une clé/locale.
 *
 * base     = dernière valeur synchronisée depuis GitHub (github_synced_value)
 *            null si la clé n'existait pas encore dans transi-store
 * ours     = valeur actuelle dans transi-store (peut avoir été modifiée)
 * theirs   = nouvelle valeur dans le fichier JSON de la PR
 */
function threeWayMerge(
  base: string | null,
  ours: string | null,
  theirs: string,
): ThreeWayResult {
  // Nouvelle clé : n'existe pas encore dans transi-store
  if (ours === null) {
    return { action: "create", value: theirs };
  }

  // Aucun changement dans la PR (theirs == base)
  if (theirs === base) {
    return { action: "none" };
  }

  // La PR a changé, transi-store n'a pas changé depuis la dernière sync
  if (ours === base) {
    return { action: "github_wins", newValue: theirs };
  }

  // Les deux ont changé par rapport à la base → conflit
  if (theirs !== ours) {
    return { action: "conflict", incomingValue: theirs };
  }

  // theirs == ours (même modification des deux côtés)
  return { action: "none" };
}

// ─── Sync d'une PR ────────────────────────────────────────────────────────────

type ProjectConfig = {
  projectId: number;
  sourceLocale: string;
  localePathPattern: string;
  installationId: string; // GitHub installation ID (varchar)
  orgSlug: string;
  projectSlug: string;
};

/**
 * Synchronise le fichier de la locale source depuis une branche de PR
 * vers transi-store.
 *
 * Appelé lors de pull_request.opened / pull_request.synchronize.
 */
export async function syncPRFiles(
  config: ProjectConfig,
  repoFullName: string,
  prNumber: number,
  prBranch: string,
  existingCommentId?: number,
): Promise<{ stats: SyncStats; commentId: number | undefined }> {
  const stats: SyncStats = {
    keysCreated: 0,
    translationsCreated: 0,
    translationsUpdated: 0,
    conflictsDetected: 0,
    unchanged: 0,
  };

  const filePath = buildLocalePath(config.localePathPattern, config.sourceLocale);
  const file = await getFileContent(config.installationId, repoFullName, filePath, prBranch);

  if (!file) {
    // Fichier absent dans la branche → rien à faire
    return { stats, commentId: existingCommentId };
  }

  let jsonData: Record<string, string>;
  try {
    jsonData = JSON.parse(file.content) as Record<string, string>;
  } catch {
    throw new Error(
      `Impossible de parser le fichier JSON "${filePath}" depuis la branche "${prBranch}"`,
    );
  }

  // Traiter toutes les clés dans une transaction
  await db.transaction(async (tx) => {
    for (const [keyName, incomingValue] of Object.entries(jsonData)) {
      if (typeof incomingValue !== "string") continue;

      // 1. Récupérer la clé existante
      let translationKey = await getTranslationKeyByName(
        config.projectId,
        keyName,
      );

      if (!translationKey) {
        // Nouvelle clé → créer
        const keyId = await createTranslationKey({
          projectId: config.projectId,
          keyName,
          description: undefined,
        });

        translationKey = await tx.query.translationKeys.findFirst({
          where: { id: keyId },
        });

        if (!translationKey) {
          throw new Error(`Échec de la création de la clé "${keyName}"`);
        }

        stats.keysCreated++;
      }

      // 2. Récupérer la traduction existante (locale source)
      const existingTranslation = await tx.query.translations.findFirst({
        where: {
          keyId: translationKey.id,
          locale: config.sourceLocale,
        },
      });

      // 3. 3-way merge
      const base = existingTranslation?.githubSyncedValue ?? null;
      const ours = existingTranslation?.value ?? null;
      const result = threeWayMerge(base, ours, incomingValue);

      switch (result.action) {
        case "none":
          stats.unchanged++;
          break;

        case "create":
          // Créer la traduction de la locale source
          await tx.insert(schema.translations).values({
            keyId: translationKey.id,
            locale: config.sourceLocale,
            value: result.value,
            isFuzzy: false,
            githubSyncedValue: result.value,
            hasConflict: false,
          });
          stats.translationsCreated++;
          break;

        case "github_wins":
          await tx
            .update(schema.translations)
            .set({
              value: result.newValue,
              githubSyncedValue: result.newValue,
              hasConflict: false,
              conflictIncomingValue: null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.translations.keyId, translationKey.id),
                eq(schema.translations.locale, config.sourceLocale),
              ),
            );
          stats.translationsUpdated++;
          break;

        case "transi_wins":
          // Mettre à jour uniquement github_synced_value pour "acquitter" le changement GitHub
          if (existingTranslation) {
            await tx
              .update(schema.translations)
              .set({
                githubSyncedValue: incomingValue,
                updatedAt: new Date(),
              })
              .where(eq(schema.translations.id, existingTranslation.id));
          }
          stats.unchanged++;
          break;

        case "conflict":
          await tx
            .update(schema.translations)
            .set({
              hasConflict: true,
              conflictIncomingValue: result.incomingValue,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.translations.keyId, translationKey.id),
                eq(schema.translations.locale, config.sourceLocale),
              ),
            );
          stats.conflictsDetected++;
          break;
      }
    }
  });

  // Poster un commentaire sur la PR
  const appUrl = process.env.DOMAIN_ROOT ?? "https://transi-store.app";
  const projectUrl = `${appUrl}/orgs/${config.orgSlug}/projects/${config.projectSlug}`;
  const commentBody = buildPRCommentBody(stats, projectUrl, prNumber);

  let commentId: number | undefined;
  try {
    commentId = await upsertPRComment(
      config.installationId,
      repoFullName,
      prNumber,
      commentBody,
      existingCommentId,
    );
  } catch (err) {
    // Ne pas faire échouer la sync si le commentaire échoue
    console.error("Échec du commentaire PR:", err);
  }

  return { stats, commentId };
}

function buildPRCommentBody(
  stats: SyncStats,
  projectUrl: string,
  _prNumber: number,
): string {
  const lines: string[] = [
    "## 🌍 transi-store — Analyse des traductions",
    "",
  ];

  if (stats.keysCreated > 0) {
    lines.push(`- ✅ **${stats.keysCreated}** nouvelle(s) clé(s) importée(s)`);
  }
  if (stats.translationsCreated > 0) {
    lines.push(
      `- ✅ **${stats.translationsCreated}** traduction(s) source créée(s)`,
    );
  }
  if (stats.translationsUpdated > 0) {
    lines.push(
      `- 🔄 **${stats.translationsUpdated}** traduction(s) mise(s) à jour`,
    );
  }
  if (stats.conflictsDetected > 0) {
    lines.push(
      `- ⚠️ **${stats.conflictsDetected}** conflit(s) à résoudre manuellement`,
    );
  }
  if (stats.unchanged > 0) {
    lines.push(`- ✓ **${stats.unchanged}** clé(s) inchangée(s)`);
  }

  if (stats.keysCreated > 0 || stats.conflictsDetected > 0) {
    lines.push("");
    lines.push(`➡️ [Ouvrir transi-store](${projectUrl})`);
  }

  if (stats.conflictsDetected > 0) {
    lines.push("");
    lines.push(
      "> ⚠️ Des conflits ont été détectés. Veuillez les résoudre dans transi-store avant le merge.",
    );
  }

  return lines.join("\n");
}

// ─── Push des traductions après merge ─────────────────────────────────────────

/**
 * Exporte toutes les locales non-source depuis transi-store et les commit
 * dans le repo GitHub sur la branche cible.
 *
 * Appelé lors de pull_request.closed avec merged=true.
 */
export async function pushTranslationsAfterMerge(
  config: ProjectConfig,
  repoFullName: string,
  targetBranch: string,
): Promise<void> {
  // Récupérer toutes les langues du projet (sauf la locale source)
  const languages = await db.query.projectLanguages.findMany({
    where: { projectId: config.projectId },
  });

  const nonSourceLocales = languages
    .map((l) => l.locale)
    .filter((locale) => locale !== config.sourceLocale);

  if (nonSourceLocales.length === 0) {
    return;
  }

  // Charger toutes les traductions du projet une seule fois
  const projectTranslations = await getProjectTranslations(config.projectId);

  for (const locale of nonSourceLocales) {
    const jsonContent = exportToJSON(projectTranslations, locale);
    const filePath = buildLocalePath(config.localePathPattern, locale);

    // Récupérer le sha existant si le fichier existe déjà (requis pour la mise à jour)
    const existing = await getFileContent(
      config.installationId,
      repoFullName,
      filePath,
      targetBranch,
    );

    await commitFile(
      config.installationId,
      repoFullName,
      filePath,
      jsonContent,
      `chore(i18n): update ${locale} translations from transi-store`,
      targetBranch,
      existing?.sha,
    );
  }
}

// ─── Résolution de conflits ────────────────────────────────────────────────────

export type ConflictResolution = "accept_github" | "keep_transi_store";

/**
 * Résout un conflit sur une traduction.
 *
 * - accept_github     : remplace la valeur transi-store par la valeur GitHub entrante
 * - keep_transi_store : conserve la valeur transi-store, acquitte le conflit
 */
export async function resolveConflict(
  translationId: number,
  resolution: ConflictResolution,
): Promise<void> {
  const translation = await db.query.translations.findFirst({
    where: { id: translationId },
  });

  if (!translation) {
    throw new Error(`Traduction #${translationId} non trouvée`);
  }

  if (!translation.hasConflict || !translation.conflictIncomingValue) {
    throw new Error(
      `Aucun conflit en attente sur la traduction #${translationId}`,
    );
  }

  if (resolution === "accept_github") {
    await db
      .update(schema.translations)
      .set({
        value: translation.conflictIncomingValue,
        githubSyncedValue: translation.conflictIncomingValue,
        conflictIncomingValue: null,
        hasConflict: false,
        updatedAt: new Date(),
      })
      .where(eq(schema.translations.id, translationId));
  } else {
    // keep_transi_store : acquitter le conflit, garder la valeur actuelle
    await db
      .update(schema.translations)
      .set({
        githubSyncedValue: translation.conflictIncomingValue,
        conflictIncomingValue: null,
        hasConflict: false,
        updatedAt: new Date(),
      })
      .where(eq(schema.translations.id, translationId));
  }
}

// ─── Récupération de la config GitHub d'un projet ─────────────────────────────

/**
 * Retourne la config GitHub d'un projet avec les infos de l'installation.
 * Retourne null si le projet n'est pas lié à un repo GitHub.
 */
async function getProjectGithubConfig(
  projectId: number,
): Promise<ProjectConfig | null> {
  const config = await db.query.projectGithubConfigs.findFirst({
    where: { projectId },
    with: { installation: true },
  });

  if (!config) return null;

  // Récupérer org slug et project slug pour les liens
  const project = await db.query.projects.findFirst({
    where: { id: projectId },
    with: { organization: true },
  });

  if (!project) return null;
  if (!config.installation) return null;
  if (!project.organization) return null;

  return {
    projectId,
    sourceLocale: config.sourceLocale,
    localePathPattern: config.localePathPattern,
    installationId: config.installation.installationId,
    orgSlug: project.organization.slug,
    projectSlug: project.slug,
  };
}

/**
 * Retourne la config GitHub d'un projet en cherchant par repo+installationId.
 * Utilisé dans le webhook pour retrouver quel projet transi-store correspond.
 */
export async function getProjectConfigByRepo(
  repoFullName: string,
  githubInstallationId: string,
): Promise<ProjectConfig | null> {
  const installation = await db.query.githubAppInstallations.findFirst({
    where: { installationId: githubInstallationId },
  });

  if (!installation) return null;

  const config = await db.query.projectGithubConfigs.findFirst({
    where: {
      installationId: installation.id,
      repoFullName,
    },
  });

  if (!config) return null;

  const project = await db.query.projects.findFirst({
    where: { id: config.projectId },
    with: { organization: true },
  });

  if (!project) return null;
  if (!project.organization) return null;

  return {
    projectId: config.projectId,
    sourceLocale: config.sourceLocale,
    localePathPattern: config.localePathPattern,
    installationId: githubInstallationId,
    orgSlug: project.organization.slug,
    projectSlug: project.slug,
  };
}
