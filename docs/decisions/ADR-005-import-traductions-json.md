# ADR-005 : Import de traductions depuis fichiers JSON

**Date** : 2026-01-23

**Statut** : Accepté ✅

## Contexte

Les utilisateurs ont besoin d'importer des traductions provenant de services tiers ou d'autres systèmes. Le processus manuel de création de chaque clé et traduction est fastidieux et source d'erreurs pour de gros volumes de données.

Le format d'export le plus courant pour les traductions est JSON avec une structure simple clé/valeur :

```json
{
  "key.name": "translated value",
  "another.key": "another value"
}
```

## Décision

Nous avons implémenté une fonctionnalité d'import de fichiers JSON permettant :

1. **Upload de fichier JSON** : Format clé/valeur simple
2. **Sélection de la langue cible** : Choix parmi les langues configurées du projet
3. **Choix de la stratégie d'import** :
   - `skip` (par défaut) : Conserve les traductions existantes, ajoute uniquement les nouvelles
   - `overwrite` : Remplace toutes les traductions existantes par les nouvelles valeurs

### Emplacement

**Page** : Liste des clés (`/orgs/:orgSlug/projects/:projectSlug/keys`)

**Raison** : Les utilisateurs voient immédiatement les clés importées dans le tableau, et les langues du projet sont déjà chargées.

### Architecture technique

#### 1. Module d'import (`app/lib/import/json.server.ts`)

**Fonctions principales** :

```typescript
parseImportJSON(fileContent: string): ParseResult
validateImportData(data: Record<string, string>): string[]
importTranslations(params: ImportParams): Promise<ImportResult>
```

**Logique d'import** :
- Transaction base de données (all-or-nothing)
- Pour chaque paire clé/valeur :
  1. Vérifier si la clé existe (`getTranslationKeyByName`)
  2. Créer la clé si nécessaire (`createTranslationKey`)
  3. Vérifier si la traduction existe pour la langue cible
  4. Appliquer la stratégie (skip ou overwrite)
- Retourner des statistiques détaillées

**Limites** :
- Taille maximale de fichier : 5 MB
- Longueur maximale de clé : 500 caractères (contrainte DB)
- Format : Objet JSON uniquement (pas d'arrays)

#### 2. Interface utilisateur

**Composants** :
- Card Chakra UI contenant le formulaire
- Input file avec `accept="application/json,.json"`
- Select natif pour la langue
- Radio group pour la stratégie
- Feedback visuel (succès/erreur) avec statistiques

**États** :
- Loading pendant le traitement
- Success : Affiche les stats (clés créées, traductions créées/mises à jour/ignorées)
- Error : Message d'erreur détaillé

## Raisons

1. **Productivité** : Importer des centaines de traductions en quelques secondes vs création manuelle
2. **Migration facilitée** : Facilite la migration depuis d'autres outils (Phrase, Crowdin, etc.)
3. **Sécurité** : Stratégie "skip" par défaut évite l'écrasement accidentel
4. **Feedback clair** : Statistiques détaillées pour comprendre ce qui a été fait
5. **Transactionnel** : Tout ou rien, pas d'état intermédiaire en cas d'erreur
6. **Validation robuste** : 4 niveaux de validation (client, serveur, données, DB)

## Alternatives considérées

### 1. Import multi-fichiers (une langue = un fichier)
**Rejeté** : Plus complexe UX, moins flexible. La sélection de langue dans l'UI est plus claire.

### 2. Format nested JSON
```json
{
  "app": {
    "welcome": {
      "title": "Welcome"
    }
  }
}
```
**Rejeté** : Complexifie le parsing et la validation. Le format plat clé/valeur est plus universel.

### 3. Bibliothèque de parsing (Zod, Yup)
**Rejeté** : Validation manuelle suffisante pour la structure simple. Évite une dépendance supplémentaire.

### 4. Preview avant import (dry-run)
**Rejeté pour v1** : Complexifie l'UX. Peut être ajouté plus tard si besoin.

### 5. Import asynchrone (background job)
**Rejeté pour v1** : Les fichiers restent petits (< 5 MB). Le traitement synchrone est suffisant.

## Conséquences

### Positives
- Import rapide de grandes quantités de traductions
- Compatibilité avec exports de services tiers
- Stratégie "skip" sécurisée par défaut
- Feedback détaillé sur le résultat
- Transaction garantit la cohérence des données
- Validation multi-niveaux prévient les erreurs

### Négatives
- Limitation à 5 MB (suffisant pour ~100k traductions)
- Un seul format supporté (JSON clé/valeur)
- Import d'une seule langue à la fois
- Pas de preview avant import
- Pas d'historique d'import

### Risques mitigés
- **Fichiers malveillants** : Validation du type MIME, parsing sécurisé
- **Données invalides** : Validation stricte à chaque niveau
- **Écrasement accidentel** : Stratégie "skip" par défaut
- **Imports concurrents** : Transactions DB gèrent les conflits

## Cas d'usage

### Migration depuis Phrase
```bash
# Export depuis Phrase (format JSON)
# → Upload dans mapadinternational
# → Sélection langue "fr"
# → Stratégie "overwrite" si c'est une ré-import
```

### Import de nouvelles clés
```bash
# Développeur crée fichier JSON avec nouvelles clés
# → Upload avec stratégie "skip"
# → Seules les nouvelles clés sont ajoutées
```

### Correction en masse
```bash
# Export depuis mapadinternational
# → Correction dans éditeur de texte
# → Ré-import avec "overwrite"
```

## Format de fichier

**Valide** :
```json
{
  "simple.key": "Simple value",
  "key.with.dots": "Value with dots",
  "key_with_underscores": "Value with underscores",
  "unicode.key": "Valeur avec émojis 🎉",
  "long.key": "Very long value...",
  "key.with.variables": "Hello {name}!",
  "icu.format": "{count, plural, =0 {no items} one {1 item} other {# items}}"
}
```

**Invalide** :
```json
// Array
["key1", "key2"]

// Nested object
{
  "parent": {
    "child": "value"
  }
}

// Non-string values
{
  "key1": 123,
  "key2": null,
  "key3": true
}
```

## Validation

### Tests manuels réalisés ✅

- [x] Import de fichier JSON valide avec nouvelles clés
- [x] Import avec stratégie "skip" (clés existantes non écrasées)
- [x] Import avec stratégie "overwrite" (clés existantes écrasées)
- [x] Validation erreurs : fichier non-JSON
- [x] Validation erreurs : structure JSON invalide (array)
- [x] Validation erreurs : langue inexistante
- [x] Validation erreurs : valeurs non-string
- [x] Vérification statistiques d'import
- [x] Vérification transaction (rollback en cas d'erreur)
- [x] Test avec fichier Unicode (émojis, accents)
- [x] Test avec variables ICU MessageFormat

### Tests à effectuer par l'utilisateur

1. Importer `test-import.json` avec langue "fr"
2. Vérifier que les 10 clés apparaissent dans le tableau
3. Ré-importer le même fichier avec "skip" → 10 ignorées
4. Modifier une valeur et ré-importer avec "overwrite" → 1 mise à jour
5. Tester import avec fichier invalide → message d'erreur clair

## Maintenance

### Ajouter un nouveau format d'import

1. Créer `app/lib/import/<format>.server.ts`
2. Implémenter parsing et validation
3. Ajouter option dans le formulaire (select format)
4. Ajouter validation dans l'action handler

### Augmenter la limite de taille

Modifier `MAX_FILE_SIZE` dans `app/lib/import/json.server.ts` :

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
```

### Ajouter l'historique d'import

1. Créer table `import_history` dans le schéma
2. Enregistrer lors de chaque import réussi
3. Afficher dans l'UI du projet

## Fichiers modifiés/créés

### Créés
- `/app/lib/import/json.server.ts` - Module d'import avec parsing, validation et logique transactionnelle
- `/test-import.json` - Fichier de test pour validation manuelle

### Modifiés
- `/app/routes/orgs.$orgSlug.projects.$projectSlug.keys._index.tsx` - Ajout action handler et UI d'import

## Métriques

**Performances attendues** :
- 1000 clés : ~2-3 secondes
- 5000 clés : ~10-15 secondes
- 10000 clés : ~30 secondes

**Limite recommandée** : 5000 clés par import pour une expérience utilisateur optimale.

## Références

- [Format JSON clé/valeur](https://www.json.org/)
- [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [Phrase Export Format](https://help.phrase.com/help/supported-platforms-and-formats)
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions)

## Améliorations futures (hors scope)

1. **Preview/Dry-run** : Afficher ce qui sera importé avant validation finale
2. **Import XLIFF** : Support du format XLIFF pour compatibilité CAT tools
3. **Import CSV** : Format tableur pour non-développeurs
4. **Import multi-langues** : Un fichier avec toutes les langues
5. **Import asynchrone** : Background job pour très gros fichiers
6. **Historique** : Traçabilité des imports
7. **Undo** : Annuler le dernier import
8. **Merge strategy** : Plus de contrôle sur la fusion
9. **Import par API** : Endpoint REST pour automatisation
