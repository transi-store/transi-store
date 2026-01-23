# Améliorations en cours

## Page de liste des clés de traduction

**Route** : `/orgs/:orgSlug/projects/:projectSlug/keys`

### Objectifs

Améliorer la visualisation de l'état des traductions pour chaque clé.

### Changements demandés

1. **Barre de progression des traductions**
   - Ajouter une colonne affichant une barre de progression
   - Calculer le pourcentage : (nombre de langues traduites / nombre total de langues du projet) × 100
   - Afficher visuellement la progression (ex: 2/3 langues traduites = 66%)

2. **Liste des locales traduites**
   - Afficher les badges des locales pour lesquelles la clé est traduite
   - Permet de voir d'un coup d'œil quelles langues sont complètes

3. **Réorganisation de la description**
   - Déplacer la description sous le nom de la clé (au lieu d'une colonne séparée)
   - Réduire l'importance visuelle (taille de police plus petite, couleur grise)

### Structure de la table mise à jour

```
┌─────────────────────────────────┬──────────────────────────┬──────────┐
│ Nom de la clé                   │ Traductions              │ Actions  │
│ Description (style secondaire)  │ [Barre] 2/3 (66%)       │          │
│                                 │ [FR] [EN]                │          │
├─────────────────────────────────┼──────────────────────────┼──────────┤
│ app.welcome.title               │ ████████░░ 2/3 (66%)    │ [Éditer] │
│ Titre de bienvenue              │ FR EN                    │          │
└─────────────────────────────────┴──────────────────────────┴──────────┘
```

### Modifications techniques

1. **Backend** (`app/lib/translation-keys.server.ts`)
   - Modifier `getTranslationKeys` pour joindre les traductions
   - Retourner pour chaque clé : `translatedLocales: string[]`

2. **Frontend** (`app/routes/orgs.$orgSlug.projects.$projectSlug.keys._index.tsx`)
   - Récupérer aussi les langues du projet pour calculer le total
   - Afficher la barre de progression (Progress de Chakra UI)
   - Afficher les badges des locales traduites
   - Réorganiser le layout de la table

### Date

2026-01-23

### Statut

✅ Terminé

---

## Ajout d'icônes sur tous les boutons d'action

**Date** : 2026-01-23

### Objectif

Améliorer l'UX en ajoutant des repères visuels sur tous les boutons pour faciliter l'identification rapide des actions.

### Implémentation

**Bibliothèque** : react-icons (Lucide Icons)

**Icônes ajoutées** :
- 📝 `LuPencil` : Boutons "Modifier" / "Éditer"
- ➕ `LuPlus` : Boutons "Ajouter" / "Créer" / "Nouveau"
- 💾 `LuSave` : Boutons "Enregistrer"
- 🗑️ `LuTrash2` : Boutons "Supprimer"

**Fichiers modifiés** : 7 fichiers de routes + Header

### Résultat

- Interface plus intuitive et moderne
- Meilleure accessibilité visuelle
- Reconnaissance immédiate des actions

**Voir** : [ADR-003](./decisions/ADR-003-icones-react-icons.md)

### Statut

✅ Terminé

---

## Thème personnalisé avec les couleurs Mapado

**Date** : 2026-01-23

### Objectif

Remplacer le thème noir et blanc par défaut par un thème coloré utilisant la charte graphique officielle de Mapado.

### Implémentation

**Fichier créé** : `app/theme.ts`

**Couleurs principales intégrées** :
- 🔵 **Blue (brand)** : #00859c - Couleur principale
- 🟠 **Orange (accent)** : #ff4024 - Actions secondaires
- 🟢 **Green** : #30bf97 - Succès
- 🟡 **Yellow** : #ec8d00 - Avertissements
- 🔴 **Red** : #cf1b01 - Erreurs et suppressions

**Couleurs supplémentaires** : Purple, Gold, Cyan, Iris, Gray, Black, White

**Migration** : `colorScheme` → `colorPalette` (Chakra UI v3)

**Composants mis à jour** :
- Header : Fond `brand.50`, bordure `brand.200`
- Tous les boutons principaux : `colorPalette="brand"`
- Progress bar : `colorPalette="brand"`
- Badges : `colorPalette="brand"`
- Liens : Couleurs brand avec hover

### Résultat

- Interface visuellement cohérente avec l'identité Mapado
- Meilleure distinction des types d'actions grâce aux couleurs
- Système de tokens maintenable et extensible
- Support préparé pour un futur mode sombre

**Voir** : [ADR-004](./decisions/ADR-004-theme-couleurs-mapado.md)

### Statut

✅ Terminé

---

## Import de traductions depuis fichiers JSON

**Date** : 2026-01-23

### Objectif

Permettre l'import de traductions depuis des fichiers JSON pour faciliter la migration depuis d'autres outils ou l'ajout de grandes quantités de traductions.

### Fonctionnalités

**Format supporté** : JSON clé/valeur simple
```json
{
  "key.name": "traduction"
}
```

**Options d'import** :
- Sélection de la langue cible parmi les langues du projet
- Choix de la stratégie :
  - **Skip** (par défaut) : Conserve les traductions existantes
  - **Overwrite** : Remplace les traductions existantes

**Validation** :
- Vérification du format JSON
- Validation de la structure (objet clé/valeur)
- Vérification que la langue existe dans le projet
- Limite de taille : 5 MB

**Feedback** :
- Statistiques détaillées après import
- Nombre de clés créées
- Nombre de traductions créées/mises à jour/ignorées
- Messages d'erreur clairs en cas de problème

### Implémentation

**Fichiers créés** :
- `app/lib/import/json.server.ts` - Logique d'import avec transactions
- `test-import.json` - Fichier de test

**Fichiers modifiés** :
- `app/routes/orgs.$orgSlug.projects.$projectSlug.keys._index.tsx` - UI et action handler

**Composants UI** :
- Card avec formulaire d'upload
- Input file avec validation
- Select de langue
- Radio group pour la stratégie
- Alertes de succès/erreur avec statistiques

**Sécurité** :
- Transaction base de données (all-or-nothing)
- Validation multi-niveaux (client, serveur, données, DB)
- Stratégie "skip" par défaut évite l'écrasement accidentel

### Cas d'usage

1. **Migration** : Import depuis Phrase, Crowdin, POEditor
2. **Ajout en masse** : Import de nouvelles clés développées offline
3. **Correction** : Export → Correction → Ré-import

### Résultat

- Import rapide de centaines/milliers de traductions
- Compatible avec les exports standards JSON
- Feedback immédiat et détaillé
- Sécurisé contre les pertes de données

**Voir** : [ADR-005](./decisions/ADR-005-import-traductions-json.md)

### Statut

✅ Terminé
