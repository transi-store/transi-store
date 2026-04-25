# Ajout de fichiers à un projet -

**Etape 3** : Modifier le "cli" pour ne plus avoir besoin de spécifier "output".

Cette étape est la suite de :

- @2026-04-19-add-files-to-project-1.md
- @2026-04-19-add-files-to-project-2.md
- @2026-04-19-add-files-to-project-3.md
- @2026-04-19-add-files-to-project-4.md
- @2026-04-19-add-files-to-project-5.md

On va reprendre https://github.com/transi-store/transi-store/pull/141 mais on va faire plusieurs PR pour ajouter les fonctionnalités une par une.

## Contexte

On va maintenant ajouter la liste des fichiers dans les tabs de traduction (main + branches) et faire en sorte que quand on ajoute une traduction on envoit bien le "fileId" du fichier en cours, que ce soit dans les traductions générales ou bien dans les branches.

### traductions générales

La liste des traductions qui doit s'afficher correspondra au fichier sélectionné. Par défaut, on sélectionnera le premier fichier de la liste (si il existe) et on enverra son fileId pour récupérer les traductions. Si jamais il n'y a pas de fichier, on affichera un message "Aucun fichier trouvé pour ce projet" et on n'affichera pas les traductions.

On va dépacer le bouton "éditer" au niveau de chaque fichier pour pouvoir modifier le fichier en cours (actuellement le bouton est en fin de ligne).
Juste après le dernier fichier, on ajoutera un bouton "+" qui ouvrira une modale pour ajouter un nouveau fichier dans le projet en cours.

Un fichier ne peut pas avoir le même "filePath" qu'un autre fichier déjà existant dans le projet. On affichera une erreur claire si jamais on essaye d'ajouter un fichier avec un "filePath" déjà existant. (mais on peut avoir des fichiers avec le même "filePath" dans des projets différents).

### recherche

Dans les résultats de recherche globale, on affichera aussi le nom du fichier concerné par la traduction trouvée.
Dans la recherche sur un projet, étant donné que l'input de recherche est en dessous du fichier, on ne recherchera que dans le fichier en cours (celui qui est sélectionné).

### Gestions des fichiers dans les branches

Dans la liste des branches, on va ajouter la liste des fichiers au dessus de "ajouts" et "suppressions". Les ajouts et suppressions seront lié au fichier actuellement sélectionné. Par défaut, on sélectionnera le premier fichier de la liste (si il existe) et on enverra son fileId pour récupérer les traductions. Si jamais il n'y a pas de fichier, on affichera un message "Aucun fichier trouvé pour ce projet" et on n'affichera pas les traductions.

Au moment du "merge" dans main, dans le récapitulatif des changements, on affichera aussi le nom du fichier concerné par les changements.
