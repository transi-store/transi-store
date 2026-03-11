# Amélioration de l'UX la page détail projet

## Contexte

On peut importer des fichiers de traduction via l'interface, mais il n'existe pas d'endpoint API pour faire la même chose.

## Objectif

On va ajouter un endpoint API qui permet d'importer des traductions.
Là le but va être de pouvoir importer des traductions via API, et plus tard via le "cli".
On va suivre la même logique que ce que l'on fait pour l'export, mais dans l'autre sens ( fichier
api.orgs.$orgSlug.projects.$projectSlug.export.tsx ).
Actuellement on peut importer des traductions via l'interface, mais avec une "action" react-router.
Il faudra proposer les même options que l'import via l'interface a savoir :

- importer un fichier de traduction ( json, xliff ),
- donner l'information de la langue cible,
- donner l'information si on veut écraser les traductions existantes ou pas.

## Implémentation

On va créer un endpoint API qui va recevoir une requete POST sur la route suivante : "/orgs/:orgSlug/projects/:projectSlug/import".
Ce endpoint va recevoir un fichier de traduction, la langue cible, et une option pour écraser les traductions existantes ou pas.
Il va ensuite traiter le fichier de traduction, et importer les traductions dans le projet en fonction des options reçues.

Il faut mutualiser les méthodes d'importation de traductions entre l'interface et l'API, pour éviter de dupliquer le code.

## Tests

Il faudra tester l'endpoint API pour s'assurer qu'il fonctionne correctement, et qu'il importe les traductions comme prévu.
