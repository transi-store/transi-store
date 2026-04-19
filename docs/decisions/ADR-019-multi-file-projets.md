# ADR-019 : Support multi-fichiers par projet

**Date** : 2026-04-19

**Statut** : Accepté ✅

## Contexte

Initialement, un projet transi-store correspondait à un seul fichier de traduction (généralement JSON). La configuration du CLI (`transi-store.config.json`) embarquait les informations de format, les locales cibles et le chemin de sortie pour chaque projet.

Ce modèle devenait insuffisant pour deux cas d'usage courants :

1. **Projets avec plusieurs formats** : certaines applications utilisent un fichier JSON pour les clés d'interface et des fichiers Markdown ou PO pour la documentation, les CGU, etc.
2. **Projets avec plusieurs fichiers du même format** : découpage par domaine fonctionnel (`auth.json`, `checkout.json`…).

De plus, stocker la configuration des fichiers dans le dépôt client créait une duplication entre le serveur et chaque dépôt consommateur : modifier les locales ou ajouter un fichier nécessitait de toucher tous les dépôts.

## Décision

### 1. Table `project_files`

Chaque projet peut posséder plusieurs fichiers de traduction, stockés en base de données :

```
project_files
├── id (PK)
├── project_id (FK → projects, ON DELETE CASCADE)
├── file_path (template avec placeholder <lang>, ex: "locales/<lang>/app.json")
├── format (json | yaml | xliff | csv | po | ini | php)
├── created_at
└── UNIQUE(project_id, file_path)
```

Le `file_path` est un template : le placeholder `<lang>` est remplacé par le code de locale lors du téléchargement. La gestion des fichiers (ajout, renommage, suppression) se fait depuis l'interface, dans la barre d'onglets des traductions.

### 2. `fileId` NOT NULL sur `translation_keys`

Chaque clé de traduction appartient obligatoirement à exactement un fichier. La contrainte d'unicité passe de `(project_id, key_name)` à `(project_id, file_id, key_name)` : le même nom de clé peut exister dans deux fichiers distincts.

### 3. Routing `/translations/:fileId`

La vue des traductions est recentrée sur un fichier unique :

- Un seul fichier → redirection directe vers `/translations/:fileId`
- Plusieurs fichiers → liste des fichiers avec navigation par onglets
- Le bouton `+` dans la barre d'onglets ouvre la modale de création de fichier
- Chaque onglet dispose d'un bouton d'édition pour renommer, changer le format ou supprimer le fichier

### 4. CLI sans configuration locale des fichiers

La configuration `transi-store.config.json` est simplifiée : elle n'embarque plus `langs`, `format`, ni `output`. Ces informations sont désormais stockées côté serveur et récupérées via un appel API lors de chaque exécution du CLI.

**Avant :**

```jsonc
{
  "org": "my-org",
  "projects": [
    {
      "project": "my-app",
      "langs": ["en", "fr"],
      "format": "json",
      "output": "./locales/<lang>/translations.json",
    },
  ],
}
```

**Après :**

```jsonc
{
  "org": "my-org",
  "projects": [{ "slug": "my-app" }],
}
```

Le CLI appelle `GET /api/orgs/:org/projects/:slug` qui retourne `{ files, languages }`, puis résout les chemins de sortie/entrée à partir du `filePath` de chaque fichier et des locales du projet.

## Raisons

1. **Source de vérité unique** : La configuration des fichiers (format, chemins, locales) vit en base de données, gérée via l'UI. Elle n'est pas dupliquée dans chaque dépôt consommateur.
2. **Extensibilité** : Ajouter un fichier ou une locale à un projet ne nécessite aucune modification dans les dépôts consommateurs — le CLI le découvre automatiquement au prochain `download:config`.
3. **Isolation des clés** : La nouvelle contrainte `(project_id, file_id, key_name)` permet des espaces de noms distincts par fichier, évitant les collisions entre formats différents.
4. **Cohérence avec Git** : Le CLI compare déjà les fichiers modifiés vs la branche par défaut (`getModifiedFiles`). La liste des fichiers provenant du serveur s'intègre naturellement dans ce workflow.

## Alternatives considérées

### 1. Garder `langs`/`format`/`output` dans le config client et ajouter un type de fichier

**Rejeté** : Maintiendrait la duplication. Changer de format ou ajouter une locale imposerait des modifications dans tous les dépôts consommateurs.

### 2. Plusieurs projets transi-store pour un même dépôt

**Rejeté** : Contournement sans structure claire. Les projets sont des entités distinctes ; les fichiers sont des aspects d'un même projet applicatif.

### 3. Stocker le contenu Markdown comme des clés ICU longues

**Rejeté** : L'interface ICU est inadaptée pour des blocs de plusieurs kilo-octets. La notion de fichier permet de différencier le type de contenu et l'interface d'édition associée.

## Conséquences

### Positives

- Configuration CLI minimale et pérenne
- Ajout/suppression de fichiers ou de locales sans toucher les dépôts clients
- Support natif de plusieurs formats dans un même projet
- Isolation des espaces de noms de clés par fichier

### Négatives

- **Breaking change CLI** : la config doit être migrée (supprimer `langs`/`format`/`output`, remplacer `project` par `slug`)
- **Breaking change API import** : le paramètre `fileId` est désormais requis ; les scripts d'import directs doivent être mis à jour
- **Migration DB** : les installations existantes doivent exécuter `make db-push` pour créer la table `project_files` et mettre à jour la contrainte unique
- Les clés sans `fileId` (data existante avant migration) ne peuvent être affichées qu'après rattachement à un fichier

## Fichiers créés/modifiés

### Créés

- `drizzle/schema.ts` — table `projectFiles`, `fileId` NOT NULL sur `translationKeys`, contrainte unique `(projectId, fileId, keyName)`
- `app/lib/project-files.server.ts` — CRUD fichiers, `DuplicateFilePathError`
- `app/routes/orgs.$orgSlug.projects.$projectSlug.translations/FileManagementModal.tsx` — modale ajout/édition/suppression
- `app/routes/orgs.$orgSlug.projects.$projectSlug.translations/index.tsx` — liste de fichiers, redirection si fichier unique
- `app/routes/orgs.$orgSlug.projects.$projectSlug.translations.$fileId.tsx` — vue clés par fichier
- `packages/cli/src/fetchProjectFiles.ts` — `fetchProjectInfo()`, `assertSafePath()`
- `docs/decisions/ADR-019-multi-file-projets.md` — ce document

### Modifiés

- `drizzle/relations.ts` — relations `translationKeys ↔ projectFiles`
- `app/lib/import/import-translations.server.ts` — scope `onConflict` et requêtes par `fileId`
- `app/lib/import/process-import.server.ts` — `fileId` obligatoire
- `app/routes/orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.tsx` — sélecteur de fichier pour la création de clé
- `app/routes/orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.merge.tsx` — badge fichier dans le récap de merge
- `packages/cli/src/fetchForConfig.ts` — utilise `fetchProjectInfo` au lieu des champs du config client
- `packages/cli/src/uploadTranslations.ts` — passe `fileId` à l'API
- `packages/common/src/config-schema.ts` — schéma simplifié (`{ org, projects: [{ slug }] }`)
- `apps/website/app/docs/usage.mdx` — mise à jour documentation utilisateur
- `apps/website/app/docs/developer.mdx` — mise à jour section CLI
- `packages/cli/README.md` — mise à jour de la configuration
- `README.md` — mise à jour de l'exemple CLI

## Références

- [ADR-005](./ADR-005-import-traductions-json.md) — Import de traductions depuis fichiers JSON
- [ADR-014](./ADR-014-import-api-endpoint.md) — Endpoint API d'import et commande CLI upload
- [ADR-018](./ADR-018-suppression-traductions-branches.md) — Suppression de traductions dans les branches
