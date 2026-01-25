# ADR-008 : Migration vers PostgreSQL et Drizzle ORM v1

**Date** : 2026-01-25

**Statut** : Accepté

## Contexte

Le projet utilisait initialement MariaDB 11.8.5 avec Drizzle ORM v0.38.3 et drizzle-kit v0.31.8. Lors d'une tentative de synchronisation du schéma avec `yarn db:push`, une erreur critique est apparue :

```
Multiple primary key defined
ALTER TABLE `api_keys` ADD PRIMARY KEY (`id`);
```

Cette erreur empêchait toute modification du schéma de base de données via drizzle-kit.

## Investigation

### Problème identifié

Drizzle-kit ne détecte pas correctement les clés primaires existantes dans MariaDB 11.8.5, causant une tentative de création de clés primaires en double lors du push. Ce problème a été confirmé comme un bug connu dans drizzle-kit avec MariaDB.

### Solutions tentées

1. **Ajout manuel des contraintes manquantes** : Les foreign keys manquantes sur la table `api_keys` ont été ajoutées, mais le problème de détection des clés primaires persistait.

2. **Migration vers Drizzle ORM v1 beta** :
   - Upgrade vers `drizzle-orm@1.0.0-beta.12` et `drizzle-kit@1.0.0-beta.12`
   - Migration complète de RQB v1 vers RQB v2 (nouvelle syntaxe des relations et requêtes)
   - Le bug de détection des clés primaires persistait même avec la version beta

## Décision

**Migration complète vers PostgreSQL 16** plutôt que de continuer avec MariaDB.

### Raisons

1. **Support supérieur** : PostgreSQL est mieux supporté par drizzle-kit avec moins de bugs connus
2. **Standard de l'industrie** : PostgreSQL est largement utilisé et testé dans l'écosystème Node.js/TypeScript
3. **Compatibilité drizzle** : Les outils de migration et génération de schéma fonctionnent mieux avec PostgreSQL
4. **Évolutivité** : PostgreSQL offre des fonctionnalités avancées qui pourraient être utiles à l'avenir (JSONB, full-text search, etc.)

### Changements implémentés

#### 1. Migration du driver de base de données

**Avant** (MySQL/MariaDB) :

```typescript
import { drizzle } from "drizzle-orm/mysql2";
export const db = drizzle(getDatabaseUrl(), { schema, mode: "default" });
```

**Après** (PostgreSQL) :

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
export const db = drizzle(getDatabaseUrl(), { relations });
```

#### 2. Migration du schéma

**Changements dans `drizzle/schema.ts`** :

- `mysqlTable` → `pgTable`
- `timestamp().defaultNow().onUpdateNow()` → `timestamp().defaultNow()` (PostgreSQL ne supporte pas `onUpdateNow` natif)
- Ajout de triggers si nécessaire pour les `updated_at` automatiques

**Exemple** :

```typescript
// Avant (MySQL)
import { mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";

export const organizations = mysqlTable("organizations", {
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Après (PostgreSQL)
import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### 3. Configuration Docker

**docker-compose.yml** :

```yaml
services:
  postgres:
    image: postgres:16
    container_name: transi-store-db
    environment:
      POSTGRES_DB: transistore
      POSTGRES_USER: transistore
      POSTGRES_PASSWORD: transistore
    ports:
      - "5432:5432"
```

#### 4. Variables d'environnement

**.env** :

```bash
DB_PORT=5432  # Au lieu de 3306
DATABASE_URL=postgresql://transi-store:transi-store@localhost:5432/transi-store
# Au lieu de mysql://...
```

#### 5. Migration RQB v1 vers RQB v2

Profitant de la migration, nous avons également migré de Relational Query Builder v1 vers v2 :

**Changements de syntaxe** :

```typescript
// Avant (RQB v1)
const user = await db._query.users.findFirst({
  where: eq(schema.users.id, userId),
  orderBy: (users, { asc }) => [asc(users.name)],
});

// Après (RQB v2)
const user = await db.query.users.findFirst({
  where: { id: userId },
  orderBy: { name: "asc" },
});
```

**Relations** :

```typescript
// drizzle/relations.ts (nouveau fichier)
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  users: {
    organizationMemberships: r.many.organizationMembers(),
  },
  // ...
}));
```

#### 6. Dépendances

**package.json** :

```json
{
  "dependencies": {
    "drizzle-orm": "1.0.0-beta.12",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "1.0.0-beta.12"
  }
}
```

Suppression de `mysql2` qui n'est plus nécessaire.

## Conséquences

### Positives

- ✅ Résolution du bug de détection des clés primaires
- ✅ Meilleure compatibilité avec l'écosystème drizzle
- ✅ Syntaxe de requêtes simplifiée avec RQB v2 (objets au lieu de fonctions)
- ✅ API plus moderne et plus maintenable
- ✅ Possibilité d'utiliser des fonctionnalités PostgreSQL avancées à l'avenir

### Négatives

- ⚠️ Migration de données nécessaire lors du déploiement
- ⚠️ Changement de dialecte SQL (bien que drizzle-orm abstrait la plupart des différences)
- ⚠️ Version beta de drizzle-orm (1.0.0-beta.12), bien que stable

### Risques atténués

- Les tests doivent être exécutés avec PostgreSQL
- La migration de données doit être planifiée (export/import ou réplication)
- Documentation mise à jour pour refléter l'utilisation de PostgreSQL

## Alternatives considérées

1. **Rester sur MariaDB et utiliser des migrations SQL manuelles** : Rejeté car cela perd l'avantage de drizzle-kit pour la gestion du schéma.

2. **Downgrade vers drizzle-orm v0.x stable** : Rejeté car le bug existe aussi dans les versions stables.

3. **Passer à un autre ORM (Prisma, TypeORM)** : Rejeté car drizzle offre de meilleures performances et un meilleur contrôle.

## Migration des données

Pour les environnements existants :

1. **Backup** : Exporter les données de MariaDB
2. **Schema** : Lancer `yarn db:push` pour créer les tables PostgreSQL
3. **Import** : Importer les données dans PostgreSQL
4. **Validation** : Vérifier l'intégrité des données

## Références

- [Drizzle ORM v1 Migration Guide](https://orm.drizzle.team/docs/upgrade-v1)
- [RQB v1 to v2 Migration](https://orm.drizzle.team/docs/relations-v1-v2)
- [PostgreSQL vs MySQL with Drizzle](https://orm.drizzle.team/docs/get-started-postgresql)
