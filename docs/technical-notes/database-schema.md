# Schéma de base de données

## Vue d'ensemble

transi-store utilise **PostgreSQL 18** avec **Drizzle ORM v1.0.0-beta**.

**Source de vérité** : Le schéma est défini dans `apps/website/drizzle/schema.ts`

**Application** : Via `make db-push` ou `docker compose exec app yarn db:push` (pas de migrations pour l'instant, adapté au développement early-stage)

## Hiérarchie des entités

```
┌─────────────────────┐
│   users             │  (Utilisateurs OAuth)
└─────────────────────┘
          │
          │ lastOrganizationId (FK)
          ▼
┌─────────────────────┐
│  organizations      │  (Workspaces/tenants)
└─────────────────────┘
          │
          ├──┬─────────────────────────────────┬──────────────────────┐
          │  │                                 │                      │
          ▼  ▼                                 ▼                      ▼
┌──────────────────┐  ┌─────────────────────┐ ┌──────────────────┐  ┌────────────┐
│ organization_    │  │ organization_       │ │   api_keys       │  │  projects  │
│ members          │  │ invitations         │ └──────────────────┘  └────────────┘
└──────────────────┘  └─────────────────────┘                              │
                                                       ┌───────────────────┴──────────────────┐
                                                       │                  │                    │
                                                       ▼                  ▼                    ▼
                                              ┌──────────────────┐ ┌──────────────┐ ┌────────────────────┐
                                              │ project_         │ │  branches    │ │  project_files     │
                                              │ languages        │ └──────────────┘ └────────────────────┘
                                              └──────────────────┘        │                    │
                                                                          ▼                    ▼
                                                                ┌──────────────────┐ ┌────────────────────┐
                                                                │ branch_key_      │ │  translation_keys  │
                                                                │ deletions        │ │  (deletedAt: soft) │
                                                                └──────────────────┘ └────────────────────┘
                                                                                              │
                                                                                              ▼
                                                                                    ┌────────────────────┐
                                                                                    │  translations      │
                                                                                    └────────────────────┘
```

## Concepts clés

### Multi-tenant (organisations)

- **Isolation** : Toutes les données sont isolées par organisation
- **Membership** : Table `organization_members` (N-N entre users et organizations)
- **Cascade delete** : Suppression d'une organisation supprime tous ses projets, clés API, etc.

### Contraintes d'unicité importantes

| Table                      | Contrainte                                | Raison                                           |
| -------------------------- | ----------------------------------------- | ------------------------------------------------ |
| `users`                    | `(oauth_provider, oauth_subject)` unique  | Un compte OAuth = un utilisateur                 |
| `organizations`            | `slug` unique global                      | URLs uniques                                     |
| `organization_members`     | `(organization_id, user_id)` unique       | Pas de doublons                                  |
| `organization_invitations` | `(organization_id, invited_email)` unique | Une seule invitation active par email            |
| `projects`                 | `(organization_id, slug)` unique          | Slug unique par org uniquement                   |
| `project_files`            | `(project_id, file_path)` unique          | Pas deux fichiers avec le même chemin            |
| `translation_keys`         | `(project_id, file_id, key_name)` unique  | Une seule clé par nom par fichier dans un projet |
| `translations`             | `(key_id, locale)` unique                 | Une seule traduction par clé-locale              |
| `branch_key_deletions`     | `(branch_id, translation_key_id)` unique  | Une suppression par clé par branche              |

### Relations importantes

- **Users** ↔ **Organizations** : N-N via `organization_members`
- **Organizations** → **Projects** : 1-N (cascade delete)
- **Projects** → **ProjectFiles** : 1-N (cascade delete)
- **ProjectFiles** → **TranslationKeys** : 1-N (cascade delete)
- **Projects** → **TranslationKeys** : 1-N (through file_id, cascade delete)
- **Projects** → **Branches** : 1-N (cascade delete)
- **TranslationKeys** → **Translations** : 1-N (cascade delete)
- **Branches** → **BranchKeyDeletions** : 1-N (cascade delete)

### Fichiers de traduction (`project_files`)

Un projet peut contenir un ou plusieurs fichiers de traduction. Chaque fichier possède :

- **`filePath`** : Chemin relatif avec le placeholder `<lang>` (ex. `locales/<lang>/app.json`). Unique par projet (`UNIQUE(project_id, file_path)`).
- **`format`** : Format de sérialisation (`json`, `yaml`, `po`, `xliff`, `csv`, `ini`, `php`).

L'unicité d'une clé de traduction est désormais `(project_id, file_id, key_name)` — la même clé peut exister dans deux fichiers différents du même projet.

Le CLI résout les chemins en remplaçant `<lang>` par le code de locale lors du téléchargement/envoi.

Voir [ADR-019](../decisions/ADR-019-multi-file-projets.md) pour les détails de conception.

### Branches de traduction

Les branches permettent d'isoler des modifications de traductions (ajouts et suppressions) avant de les fusionner vers main.

- **Ajouts** : Les clés de traduction ont un champ `branchId` nullable. `NULL` = main, valeur = branche.
- **Suppressions** : La table `branch_key_deletions` stocke les clés de main marquées pour suppression dans une branche.
- **Merge** : Déplace les ajouts vers main (`branchId = NULL`) et soft-delete les clés marquées (`deletedAt = now()`).
- **Soft-delete** : Les clés avec `deletedAt` non-null sont exclues des exports, de la recherche, et de la vue main.

Voir [ADR-018](../decisions/ADR-018-suppression-traductions-branches.md) pour les détails de conception.

### Invitations

Workflow :

1. Admin crée invitation avec email → génère code aléatoire unique
2. Lien envoyé avec le code
3. Utilisateur clique, s'authentifie avec cet email
4. Ajout automatique à l'organisation + suppression de l'invitation

### Clés d'API

- Générées avec `base64url(crypto.randomBytes(24))` → 32 caractères
- Scope : une organisation
- Usage : Header `Authorization: Bearer <key>`
- Tracking : `last_used_at` mis à jour à chaque appel

## Recherche floue (pg_trgm)

**Setup** : `make db-setup-search` ou `docker compose exec app yarn db:setup-search` (à exécuter une seule fois)

Ce script :

1. Active l'extension PostgreSQL `pg_trgm`
2. Crée des index GIN trigram sur :
   - `translation_keys.key_name`
   - `translation_keys.description`
   - `translations.value`

**Utilisation** : L'opérateur `%` permet la recherche par similarité (seuil : 0.3)

**Implémentation** : Voir `app/lib/search.server.ts`

---

## Types TypeScript

Drizzle infère automatiquement les types depuis `apps/website/drizzle/schema.ts` :

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Disponibles pour toutes les tables** : User, Organization, Project, TranslationKey, Translation, etc.

---

## Relations Drizzle

Définies dans `apps/website/drizzle/relations.ts` pour charger les données liées en une seule query.

**Exemple** : Charger une organisation avec ses projets

```typescript
const org = await db.query.organizations.findFirst({
  where: eq(schema.organizations.slug, "my-org"),
  with: { projects: true },
});
```

---

## Gestion du schéma

**Appliquer les changements** : `make db-push` ou `docker compose exec app yarn db:push`

- Applique `apps/website/drizzle/schema.ts` directement à la base de données
- Pas de fichiers de migration (adapté pour développement early-stage)

**Visualiser** : `make db-studio` ou `docker compose exec app yarn db:studio`

- Interface web Drizzle Studio pour explorer tables et données

---

## Fichiers sources

- **Schéma** : `apps/website/drizzle/schema.ts`
- **Relations** : `apps/website/drizzle/relations.ts`
- **Configuration** : `apps/website/app/lib/db.server.ts`

## Références

- [Drizzle ORM - PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
