# Notes techniques

Documentation technique détaillée de l'implémentation de transi-store.

## Vue d'ensemble

| Fichier                                                | Description                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| [architecture.md](./architecture.md)                   | Architecture générale du projet, stack technique, hiérarchie des entités |
| [routing.md](./routing.md)                             | Configuration des routes React Router v7 (manuel, pas file-based)        |
| [authentication.md](./authentication.md)               | Système OAuth2/OIDC avec PKCE, multi-provider, gestion des sessions      |
| [database-schema.md](./database-schema.md)             | Schéma PostgreSQL complet, contraintes, relations, types TypeScript      |
| [export-api.md](./export-api.md)                       | API d'export JSON/XLIFF, authentification par clé ou session             |
| [import-system.md](./import-system.md)                 | Import JSON en masse, stratégies overwrite/skip, validation              |
| [code-patterns.md](./code-patterns.md)                 | Patterns courants (routes, queries Drizzle, formulaires, auth)           |
| [code-formatting.md](./code-formatting.md)             | Règles de formatage Prettier                                             |
| [traductions.md](./traductions.md)                     | Gestion des traductions du site (i18next, i18n)                          |
| [dev-setup-and-testing.md](./dev-setup-and-testing.md) | Setup développement local et tests                                       |

## Ordre de lecture recommandé

### Pour comprendre le projet

1. **architecture.md** - Vue d'ensemble de la structure
2. **database-schema.md** - Comprendre le modèle de données
3. **authentication.md** - Flow d'authentification OAuth

### Pour développer une feature

1. **routing.md** - Comment ajouter une nouvelle route
2. **code-patterns.md** - Patterns à suivre
3. **database-schema.md** - Structures de données disponibles
4. **traductions.md** - Gestion des traductions

### Pour intégrer avec l'API

1. **export-api.md** - Documentation complète de l'endpoint d'export
2. **import-system.md** - Comment importer des traductions

## Voir aussi

- **[Architecture Decision Records](../decisions/)** - Historique des décisions architecturales
- **[README principal](../../README.md)** - Guide de démarrage rapide
