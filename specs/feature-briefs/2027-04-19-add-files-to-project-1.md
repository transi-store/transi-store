# Ajout de fichiers à un projet -

**Etape 1** : Ajouter la possibilité d'ajouter des fichiers à un projet en base, sans changer l'interface utilisateur pour les projets existants (toutes les traductions sont dans un seul fichier par projet).

On va reprendre https://github.com/transi-store/transi-store/pull/141 mais on va faire plusieurs PR pour ajouter les fonctionnalités une par une.

## Contexte

Actuellement, on a une gestion de "projets" dans TransiStore, mais on n'a pas de gestion de fichiers.
Toutes les traductions d'un projet sont regroupées dans un même fichier JSON.

## Besoin

On veut pouvoir ajouter plusieurs fichiers à un projet, pour pouvoir organiser les traductions par thème, par module, etc.
Par exemple, on pourrait avoir un fichier "common.json" pour les traductions communes à toute l'application, un fichier "home.json" pour les traductions spécifiques à la page d'accueil, etc.

La PR https://github.com/transi-store/transi-store/pull/141 adresse ce besoin, mais elle fait trop de chose en même temps :

- c'est dur d'en faire une revue,
- la mise en prod va être plus risquée,
- la mise en prod est "breaking" car elle change la structure des données, et je veux pouvoir avoir une période de transition pour migrer les projets existants vers la nouvelle structure.

## Specification

On va commencer par ajouter la possibilité d'ajouter des fichiers à un projet, en étant presque transparent pour les utilisateurs actuels.

### Schema de données

Ajout d'une table "project_files" pour stocker les fichiers d'un projet, avec les champs suivants :

```
// dans apps/website/drizzle/schema.ts

// translation files per project, ex: common.json, admin.yaml
export const projectFiles = pgTable(
  "project_files",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    format: varchar("format", {
      length: 20,
      enum: ensureOneItem(Object.values(SupportedFormat)),
    }).notNull(),
    // Relative path with <lang> placeholder, ex: "locales/<lang>/common.json"
    // Cannot contain "../" (validated server-side and CLI)
    filePath: varchar("file_path", { length: 500 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_project_file_path").on(table.projectId, table.filePath),
  ],
);
```

Dans la table `translation_keys` on ajoute une colonne `fileId` qui référence la table `project_files`.
Cette colonne est non nullable, et pour les projets existants, on créera un fichier par défaut "<lang>.json" qui contiendra toutes les traductions existantes du projet.

```
    fileId: integer("file_id")
      .notNull()
      .references(() => projectFiles.id, {
        onDelete: "cascade",
      }),
```

On remplace la clé unique `unique_project_key` par une nouvelle clé unique `unique_project_file_key` qui inclut le `fileId` :

```
    uniqueIndex("unique_project_file_key").on(
      table.projectId,
      table.fileId,
      table.key,
    ),
```

Pour l'instant, quand on va ajouter une traduction, on va l'ajouter dans l'unique fichier du projet (le premier fichier de la liste des fichiers du projet). On ajoutera plus tard la possibilité de choisir dans quel fichier ajouter la traduction.
