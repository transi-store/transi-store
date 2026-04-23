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
