# Schéma de base de données

## Vue d'ensemble

transi-store utilise **PostgreSQL 18** avec **Drizzle ORM v1.0.0-beta**.

**Source de vérité** : Le schéma est défini dans `drizzle/schema.ts`

**Application** : Via `yarn db:push` (pas de migrations pour l'instant, adapté au développement early-stage)

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
                                                                            │
                                                       ┌────────────────────┴────────────┐
                                                       │                                 │
                                                       ▼                                 ▼
                                              ┌──────────────────┐         ┌────────────────────┐
                                              │ project_         │         │ translation_keys   │
                                              │ languages        │         └────────────────────┘
                                              └──────────────────┘                    │
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

| Table                      | Contrainte                                | Raison                                |
| -------------------------- | ----------------------------------------- | ------------------------------------- |
| `users`                    | `(oauth_provider, oauth_subject)` unique  | Un compte OAuth = un utilisateur      |
| `organizations`            | `slug` unique global                      | URLs uniques                          |
| `organization_members`     | `(organization_id, user_id)` unique       | Pas de doublons                       |
| `organization_invitations` | `(organization_id, invited_email)` unique | Une seule invitation active par email |
| `projects`                 | `(organization_id, slug)` unique          | Slug unique par org uniquement        |
| `translation_keys`         | `(project_id, key_name)` unique           | Une seule clé par nom dans un projet  |
| `translations`             | `(key_id, locale)` unique                 | Une seule traduction par clé-locale   |

### Relations importantes

- **Users** ↔ **Organizations** : N-N via `organization_members`
- **Organizations** → **Projects** : 1-N (cascade delete)
- **Projects** → **TranslationKeys** : 1-N (cascade delete)
- **TranslationKeys** → **Translations** : 1-N (cascade delete)

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

**Setup** : `yarn db:setup-search` (à exécuter une seule fois)

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

Drizzle infère automatiquement les types depuis `drizzle/schema.ts` :

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Disponibles pour toutes les tables** : User, Organization, Project, TranslationKey, Translation, etc.

---

## Relations Drizzle

Définies dans `drizzle/relations.ts` pour charger les données liées en une seule query.

**Exemple** : Charger une organisation avec ses projets

```typescript
const org = await db.query.organizations.findFirst({
  where: eq(schema.organizations.slug, "my-org"),
  with: { projects: true },
});
```

---

## Gestion du schéma

**Appliquer les changements** : `yarn db:push`

- Applique `drizzle/schema.ts` directement à la base de données
- Pas de fichiers de migration (adapté pour développement early-stage)

**Visualiser** : `yarn db:studio`

- Interface web Drizzle Studio pour explorer tables et données

---

## Fichiers sources

- **Schéma** : `drizzle/schema.ts`
- **Relations** : `drizzle/relations.ts`
- **Configuration** : `app/lib/db.server.ts`

## Références

- [Drizzle ORM - PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
