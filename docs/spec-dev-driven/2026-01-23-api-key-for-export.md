# Utilisation d'une clé d'API pour l'export des données.

## Contexte

Actuellement, on peut exporter les données d'un projet pour un utilisateur connecté.

## Objectif

Le but de cette amélioration est de permettre l'export des données d'un projet via une clé d'API.

## Détails techniques

La clé d'API sera liée à l'organisation. Un organisation peut avoir plusieurs clés d'API.
Une clé d'API peut avoir un nom (non obligatoire).
la valeur de la clé d'API sera une chaîne alpha-numérique aléatoire de 32 caractères.

Pour pouvoir exporter, l'utilisateur peut ne pas être connecté, si sa clé d'API est valide.
La clé d'API sera passée dans le header "Authorization" en mode "Bearer".

### Interface

Il faut ajouter dans la page de la gestion des organisation une navigation avec trois valeurs :

- projets
- membres
- paramétrage

On mettre dans le paramétrage de l'organisation la gestion des clés d'API.
