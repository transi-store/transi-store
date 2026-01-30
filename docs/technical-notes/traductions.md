# Gestion des traductions

Cette note technique décrit comment les traductions sont gérées dans transi-store en utilisant i18next et i18n.

## Structure des fichiers de traduction

Les fichiers de traduction sont stockés dans le répertoire `app/locales/{lang}/{namespace}.json`, où `{lang}` est le code de langue (par exemple, `en`, `fr`) et `{namespace}` est le nom de l'espace de noms (par exemple, `common`, `dashboard`).

Chaque fichier JSON contient des paires clé-valeur représentant les chaînes traduites. Par exemple :

```json
{
  "home.welcome_message": "Bienvenue sur transi-store",
  "auth.logout": "Se déconnecter"
}
```

## Configuration d'i18next

Nous utilisons i18next et react-i18next pour la gestion des traductions.

Aucun nouveau texte ne doit être écrit directement dans les composants React. Toutes les chaînes doivent être ajoutées aux fichiers de traduction appropriés, et utilisées via le hook `useTranslation` + une clé de traduction.
La clé de traduction doit suivre la convention `{namespace}.{key}` ou `{namespace}.{context}.{key}` pour une organisation claire.
