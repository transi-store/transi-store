# Traduire toute l'interface du site web

## Contexte

Actuellement, le site est intégralement en français, avec les chaines de caractères codées en dur dans le code source.

## Besoin

Etant donné que notre site est un site permettant de gérer les traductions, il faut que l'interface du site soit elle-même traduite dans plusieurs langues.

## Specification

Il va falloir traduire toute l'interface du site web (boutons, menus, messages, etc.) en utilisant le système de gestion des traductions existant.

### Extracter les chaines de caractères

Il faut extraire toutes les chaines de caractères codées en dur dans le code source et les remplacer par des clés de traduction.
Les chaines extraites doivent être ajoutées dans un fichier JSON de traduction par défaut dans le dossier `app/locales/fr.json`.
Le format de ce fichier doit être en "clé / valeur":

```json
{
  "namespace.context.key1": "Texte en français",
  "namespace.context.key2": "Un autre texte"
}
```

### Intégrer le système de traduction

Il faut intégrer le système de gestion des traductions dans le code source du site web.
Pour cela, il faut utiliser une fonction `t(key: string): string` qui prendra en entrée une clé de traduction et retournera la chaine de caractères traduite dans la langue courante de l'utilisateur.

Pour faire ça, on va utiliser i18next (https://www.i18next.com/) ainsi que les plugins react-i18next (https://react.i18next.com/) et i18next-icu.

### Gérer la sélection de la langue

Il faut permettre à l'utilisateur de sélectionner la langue de l'interface via un menu déroulant dans la barre de navigation.
La langue sélectionnée doit être sauvegardée dans les préférences utilisateur et utilisée pour afficher toutes les pages du site.

### Traduire les fichiers de traduction

On ne va pour l'instant pas traduire dans d'autres langues que le français, le but étant d'utiliser le système de traduction en production, afin de se rendre compte ce que peut être utile dans un projet comme celui-ci.
