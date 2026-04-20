# Ajout de fichiers à un projet -

**Etape 3** : Modifier le "cli" pour ne plus avoir besoin de spécifier "output".

Cette étape est la suite de @2026-04-19-add-files-to-project-1.md et @2026-04-19-add-files-to-project-2.md

On va reprendre https://github.com/transi-store/transi-store/pull/141 mais on va faire plusieurs PR pour ajouter les fonctionnalités une par une.

## Contexte

On a un fichier qui est configuré pour chaque projet, qui contient le chemin du fichier de traduction, avec un placeholder "<lang>" pour la langue.

## Besoin

On n'a donc plus besoin de spécifier "output" dans la config du CLI, car on peut récupérer le chemin des fichiers de traduction à partir de la configuration du projet.
On n'a pas vraiment besoin de spécifier les "languages" non plus car on peut les récupérer à partir du projet.
Le format est aussi inutile à spécifier dans la config du CLI, car il est déjà stocké en base de données pour chaque fichier (et qui plus est il peut être différent d'un fichier à l'autre dans le même projet).

## Specification

Enlever les option "output", "languages" et "format" de la config du CLI, et récupérer le chemin du fichier de traduction, le format et les langues à partir de la configuration du projet en base de données.

Dans les logs du cli, afficher le nom du fichier pour lequel on fait le téléchargement ou l'upload, pour que ce soit plus clair pour les utilisateurs.

Pour pouvoir connaitre le nom des fichiers à traiter, on va ajouter un endpoint GET /api/orgs/:orgSlug/projects/:projectSlug qui retourne la liste des fichiers d'un projet, avec leur format et leur chemin.

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
