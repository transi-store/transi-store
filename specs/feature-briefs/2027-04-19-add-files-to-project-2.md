# Ajout de fichiers à un projet -

**Etape 2** : Léger changement de UI : pouvoir renommer le nom du fichier.

Cette étape est la suite de @2027-04-19-add-files-to-project-1.md

On va reprendre https://github.com/transi-store/transi-store/pull/141 mais on va faire plusieurs PR pour ajouter les fonctionnalités une par une.

## Contexte

On a un fichier qui est configuré pour chaque projet, qui contient le chemin du fichier de traduction, avec un placeholder "<lang>" pour la langue.

## Besoin

On a besoin de pouvoir renommer le filePath du fichier, pour pouvoir préparer la suite.

On va reprendre cette partie de la PR #141 :

https://github.com/transi-store/transi-store/pull/141/changes#diff-a8925fa5c67c6315df60e69fec84f1fde9346f8fcf2441120eb6c8a09937903cR401-R431

Le fait d'avoir une liste de Tab avec le nom du fichier, et un bouton "éditer" qui ouvre un modal pour éditer le nom du fichier ainsi que le type, c'est une bonne base pour la suite, même si on n'implémente pas encore la partie "ajouter un nouveau fichier" et "supprimer un fichier".

Le code de la modale se trouve ici : https://github.com/transi-store/transi-store/pull/141/changes#diff-b89a6802e110f08c67df17e70c0cf4cbcaa4852e3bdc9e84bd5bb6580c3282df
