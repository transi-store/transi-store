# Ajout de fichiers à un projet -

**Etape 3** : Modifier le "cli" pour ne plus avoir besoin de spécifier "output".

Cette étape est la suite de :

- @2026-04-19-add-files-to-project-1.md
- @2026-04-19-add-files-to-project-2.md
- @2026-04-19-add-files-to-project-3.md
- @2026-04-19-add-files-to-project-4.md

On va reprendre https://github.com/transi-store/transi-store/pull/141 mais on va faire plusieurs PR pour ajouter les fonctionnalités une par une.

## Contexte

On va maintenant supprimer les endpoints suivants:

- GET /api/orgs/{orgSlug}/projects/{projectSlug}/translations
- POST /api/orgs/{orgSlug}/projects/{projectSlug}/translations

Le fileId devient donc obligatoire dans pas mal d'endroits (Il y a pas mal d'endroits dans le code qui ont un commentaire "TODO [PROJECT_FILE]:" sur le sujet).

Dans l'interface du site, il faut bien vérifier que quand on ajoute une traduction on envoit bien le "fileId" du fichier en cours, que ce soit dans les traductions générales ou bien dans les branches.
On ne devrait du coup jamais récupérer le fileId par défaut, et on devrait avoir une erreur claire si jamais on ne fournit pas de fileId.
