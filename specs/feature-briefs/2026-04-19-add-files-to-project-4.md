# Ajout de fichiers à un projet -

**Etape 3** : Modifier le "cli" pour ne plus avoir besoin de spécifier "output".

Cette étape est la suite de :

- @2026-04-19-add-files-to-project-1.md
- @2026-04-19-add-files-to-project-2.md
- @2026-04-19-add-files-to-project-3.md

On va reprendre https://github.com/transi-store/transi-store/pull/141 mais on va faire plusieurs PR pour ajouter les fonctionnalités une par une.

## Contexte

On a modifié les endpoints "POST" et "GET" `/api/orgs/{orgSlug}/projects/{projectSlug}/translations` pour ajouter le `fileId` dans l'URL, mais on a gardé temporairement deux endpoints GET et POST vers `/api/orgs/{orgSlug}/projects/{projectSlug}/translations` pour garder la compatibilité.
On supprime ces endpoints qui ne sont plus nécessaires car tous les clients ont été mis à jour pour utiliser les endpoints avec le `fileId` dans l'URL.

## Specification

Enlever les option "output", "languages" et "format" de la config du CLI, et récupérer le chemin du fichier de traduction, le format et les langues à partir de la configuration du projet en base de données.

Dans les logs du cli, afficher le nom du fichier pour lequel on fait le téléchargement ou l'upload, pour que ce soit plus clair pour les utilisateurs.

Pour pouvoir connaitre le nom des fichiers à traiter, on va ajouter un endpoint GET /api/projects/:projectSlug qui retourne la liste des fichiers d'un projet, avec leur format et leur chemin.

Format de retour:

```ts
{
  files: files.map((f) => ({
    id: f.id,
    format: f.format,
    filePath: f.filePath,
  })),
  languages: languages.map((l) => ({
    locale: l.locale,
    isDefault: l.isDefault,
  })),
}
```

Pense à ajouter la documentation openapi pour ce nouvel endpoint.
