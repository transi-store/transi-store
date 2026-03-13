# ADR-014 : Endpoint API d'import de traductions et commande CLI upload

**Date** : 2026-03-13

**Statut** : Accepté ✅

## Contexte

L'import de traductions n'était possible que via l'interface web (action React Router sur la page import-export). Il n'existait pas d'endpoint API permettant d'importer des traductions de manière programmatique, contrairement à l'export qui disposait déjà d'un endpoint API (cf. ADR-006).

Ce manque empêchait :

- L'automatisation de l'import dans des pipelines CI/CD
- L'utilisation du CLI (`@transi-store/cli`) pour pousser des traductions
- L'intégration avec des outils tiers

De plus, la logique d'import (validation, parsing, écriture en base) était entièrement couplée à l'action React Router, rendant sa réutilisation impossible sans duplication.

Enfin, seul le format JSON était supporté à l'import, alors que l'export supportait déjà le XLIFF.

## Décision

### 1. Mutualisation de la logique d'import

Extraction de toute la logique de validation et d'import dans une fonction partagée `processImport()` dans `app/lib/import/process-import.server.ts`.

Cette fonction prend un `FormData` et gère :

- Validation du fichier (présence, format)
- Validation de la locale et de la stratégie
- Détection du format (JSON/XLIFF) par paramètre explicite ou extension de fichier
- Lecture du contenu du fichier
- Résolution du projet et vérification de la locale
- Parsing selon le format
- Validation des données
- Import transactionnel en base

L'action React Router et le nouvel endpoint API appellent tous deux cette fonction.

### 2. Support du format XLIFF à l'import

Nouveau module `app/lib/import/xliff.server.ts` avec la fonction `parseImportXLIFF()` qui :

- Parse les fichiers XLIFF 2.0
- Extrait les traductions cibles (`<target>`) depuis les éléments `<unit>`
- Utilise l'attribut `id` des `<unit>` comme nom de clé
- Gère l'unescaping des entités XML

### 3. Endpoint API POST `/api/orgs/:orgSlug/projects/:projectSlug/import`

Nouveau endpoint suivant le même pattern d'authentification que l'export (ADR-006) :

- Authentification par clé API (`Authorization: Bearer <key>`) ou session utilisateur
- Accepte un `multipart/form-data` avec :
  - `file` : fichier JSON ou XLIFF
  - `locale` : langue cible
  - `strategy` : `overwrite` ou `skip`
  - `format` (optionnel) : `json` ou `xliff` (auto-détecté depuis l'extension sinon)
- Retourne les statistiques d'import en JSON

### 4. Commande CLI `upload`

Nouvelle commande `transi-store upload` dans le package `@transi-store/cli` :

```bash
transi-store upload \
  -k <api-key> \
  -o <org-slug> \
  -p <project-slug> \
  -l <locale> \
  -I <input-file> \
  -s <strategy>  # overwrite (défaut) ou skip
```

Suit le même pattern que la commande `download` existante.

## Raisons

1. **Symétrie export/import** : L'export avait déjà un endpoint API et une commande CLI `download`, il manquait l'équivalent pour l'import
2. **Mutualisation** : Évite la duplication de la logique de validation entre l'UI et l'API
3. **Automatisation** : Permet l'intégration dans des pipelines CI/CD (push de traductions)
4. **Support XLIFF** : Format standard pour les outils de traduction professionnels (CAT tools)

## Alternatives considérées

### 1. Import XLIFF via bibliothèque de parsing XML

**Rejeté** : Le format XLIFF 2.0 utilisé est suffisamment simple pour être parsé avec des expressions régulières. Ajouter une dépendance XML complète (comme `fast-xml-parser`) serait disproportionné pour notre cas d'usage.

## Conséquences

### Positives

- Import automatisé via API et CLI
- Logique d'import centralisée dans `processImport()`
- Support XLIFF en plus du JSON (import et export)
- Le CLI couvre maintenant les deux sens : `download` et `upload`
- L'UI bénéficie aussi du support XLIFF à l'import

### Négatives

- Le parsing XLIFF par regex est moins robuste qu'un vrai parser XML (suffisant pour le XLIFF 2.0 standard que nous générons)
- L'endpoint d'import n'a pas de rate limiting (comme l'export, cf. ADR-006)

## Fichiers créés/modifiés

### Créés

- `app/lib/import/xliff.server.ts` — Parser XLIFF 2.0
- `app/lib/import/xliff.server.test.ts` — Tests unitaires du parser XLIFF
- `app/lib/import/process-import.server.ts` — Logique d'import mutualisée
- `app/routes/api.orgs.$orgSlug.projects.$projectSlug.import.tsx` — Endpoint API d'import
- `packages/cli/src/uploadTranslations.ts` — Logique d'upload pour le CLI

### Modifiés

- `app/routes.ts` — Ajout de la route API import
- `app/routes/orgs.$orgSlug.projects.$projectSlug.import-export/index.tsx` — Refactoring pour utiliser `processImport()`
- `packages/cli/src/cli.ts` — Ajout de la commande `upload`

## Références

- [ADR-005](./ADR-005-import-traductions-json.md) — Import de traductions depuis fichiers JSON
- [ADR-006](./ADR-006-cles-api-export.md) — Clés d'API pour l'export de données
- [XLIFF 2.0 Specification](https://docs.oasis-open.org/xliff/xliff-core/v2.0/xliff-core-v2.0.html)
