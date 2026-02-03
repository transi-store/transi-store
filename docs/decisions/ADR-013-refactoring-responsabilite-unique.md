# ADR-013 : Refactoring des composants selon le principe de responsabilité unique

**Date** : 2026-02-03

**Statut** : Accepté ✅

## Contexte

Plusieurs fichiers de routes et composants du projet sont devenus trop volumineux (400-600+ lignes), gérant plusieurs responsabilités distinctes dans un seul composant. Cela rend le code difficile à maintenir, tester et faire évoluer.

Par exemple, la page de paramètres d'une organisation gère à la fois :

- La liste des clés API
- La configuration des fournisseurs d'IA de traduction

Ces deux responsabilités distinctes devraient être séparées en composants indépendants.

## Décision

Nous avons décidé d'appliquer systématiquement le **principe de responsabilité unique (Single Responsibility Principle)** aux composants React du projet.

### Règles à suivre

1. **Un composant = une responsabilité** : Si un composant fait plus d'une chose, le diviser
2. **Un composant = un fichier** : Chaque composant dans son propre fichier PascalCase
3. **Organisation en dossiers** : Regrouper les composants liés dans des dossiers avec `index.ts`
4. **Limite de taille** : Aucun composant ne doit dépasser ~200 lignes

### Structure recommandée

Pour une route avec plusieurs fonctionnalités :

```
app/routes/orgs.$orgSlug.settings/
├── index.tsx (loader, action, composant principal de la route)
├── ApiKeys/
│   ├── index.tsx (composant principal)
│   ├── ApiKeysList.tsx
│   ├── ApiKeyItem.tsx
│   └── ...
└── AiTranslation/
    ├── index.tsx (composant principal)
    ├── AiTranslationSettings.tsx
    └── ...
```

## Raisons

1. **Maintenabilité** : Code plus facile à comprendre et modifier
2. **Testabilité** : Composants plus petits = tests plus simples et ciblés
3. **Réutilisabilité** : Composants isolés peuvent être réutilisés ailleurs
4. **Collaboration** : Moins de conflits Git, code review plus simple
5. **Performance** : Possibilité d'optimisation granulaire (React.memo, lazy loading)

## Fichiers nécessitant une refactorisation

### 🔴 Priorité haute

#### 1. [app/routes/orgs.$orgSlug.settings.tsx](../../app/routes/orgs.$orgSlug.settings.tsx) (632 lignes)

**Problèmes identifiés :**

- Le composant gère **deux responsabilités distinctes** :
  1. Gestion des clés d'API
  2. Configuration des fournisseurs d'IA de traduction
- Logique complexe de gestion de modales pour chaque section
- Plus de 600 lignes de code dans un seul fichier

**Refactorisation recommandée :**

```
app/routes/orgs.$orgSlug.settings/
├── index.tsx (loader, action, composant principal de la route)
├── ApiKeys/
│   ├── index.tsx (composant principal)
│   ├── ApiKeysList.tsx
│   ├── ApiKeyItem.tsx
│   ├── ApiKeyCreationDialog.tsx
│   └── ApiKeyDocumentation.tsx
└── AiTranslation/
    ├── index.tsx (composant principal)
    ├── AiTranslationProvidersList.tsx
    ├── AiTranslationProviderItem.tsx
    └── AiTranslationConfigDialog.tsx
```

**Composants à créer :**

- `ApiKeysList` : Liste des clés d'API avec état vide
- `ApiKeyItem` : Affichage d'une clé API individuelle avec actions (copier, supprimer)
- `ApiKeyCreationDialog` : Modale de création de clé d'API
- `ApiKeyDocumentation` : Section documentaire avec exemple d'utilisation
- `AiTranslationSettings` : Liste des fournisseurs d'IA
- `AiTranslationProviderItem` : Affichage d'un fournisseur avec badges et actions
- `AiTranslationConfigDialog` : Modale de configuration d'un fournisseur

**Statut** : ✅ **Terminé** - Refactorisé en structure de dossiers modulaire.

---

#### 2. ~~[app/routes/orgs.$orgSlug.members.tsx](../../app/routes/orgs.$orgSlug.members.tsx)~~ (589 lignes) → ✅ TERMINÉ

**Problèmes identifiés :**

- Gère **trois responsabilités** :
  1. Liste des membres actuels
  2. Invitations en attente (par email)
  3. Lien d'invitation permanent pour l'organisation
- Multiple modales avec logique complexe
- Gestion de la copie de liens avec fallback

**Refactorisation effectuée :**

```
app/routes/orgs.$orgSlug.members/
├── index.tsx (loader, action, composant principal de la route)
├── Members/
│   ├── index.tsx (MembersList)
│   └── MemberItem.tsx
└── Invitations/
    ├── index.tsx (composant principal avec états)
    ├── useCopyInvitationLink.ts (hook pour copie clipboard)
    ├── PendingInvitationsList.tsx
    ├── PendingInvitationItem.tsx
    ├── OrganizationInviteLink.tsx
    ├── NewInvitationAlert.tsx
    ├── InviteMemberDialog.tsx
    └── CopyLinkFallbackDialog.tsx
```

**Composants créés :**

- `Members/index.tsx` : Liste des membres avec titre
- `Members/MemberItem.tsx` : Carte d'un membre avec badge "vous" et bouton de suppression
- `Invitations/index.tsx` : Composant principal gérant les états (dialog ouvert, fallback modal)
- `Invitations/useCopyInvitationLink.ts` : Hook personnalisé pour la logique de copie avec fallback
- `Invitations/PendingInvitationsList.tsx` : Section des invitations en attente
- `Invitations/PendingInvitationItem.tsx` : Carte d'une invitation avec actions
- `Invitations/OrganizationInviteLink.tsx` : Section du lien permanent avec alerte info/création
- `Invitations/NewInvitationAlert.tsx` : Alerte affichée après création d'invitation
- `Invitations/InviteMemberDialog.tsx` : Modale d'invitation par email
- `Invitations/CopyLinkFallbackDialog.tsx` : Modale de fallback pour copier le lien

**Statut** : ✅ **Terminé** - Refactorisé en structure de dossiers modulaire.

---

#### 3. ~~[app/routes/orgs.$orgSlug.projects.$projectSlug.import-export.tsx](../../app/routes/orgs.$orgSlug.projects.$projectSlug.import-export.tsx)~~ (428 lignes) → ✅ TERMINÉ

**Problèmes identifiés :**

- Gère **deux fonctionnalités distinctes** :
  1. Import de traductions (avec validation complexe)
  2. Export de traductions
- Logique métier complexe dans l'action (validation multi-étapes)
- Mélange de logique UI et logique de validation

**Refactorisation effectuée :**

```
app/routes/orgs.$orgSlug.projects.$projectSlug.import-export/
├── index.tsx (loader, action, composant principal de la route)
├── Import/
│   ├── index.tsx (ImportSection avec états)
│   ├── ImportForm.tsx
│   └── ImportResults.tsx
└── Export/
    ├── index.tsx (ExportSection)
    ├── ExportJsonSection.tsx
    └── ExportXliffSection.tsx
```

**Composants créés :**

- `Import/index.tsx` : Section d'import avec états (shouldOverwrite, formRef)
- `Import/ImportForm.tsx` : Formulaire d'import avec sélection fichier/locale/stratégie
- `Import/ImportResults.tsx` : Affichage des résultats d'import (succès/erreur/stats)
- `Export/index.tsx` : Section d'export principale
- `Export/ExportJsonSection.tsx` : Grille de boutons d'export JSON par langue
- `Export/ExportXliffSection.tsx` : Export XLIFF (source → target)

**Statut** : ✅ **Terminé** - Refactorisé en structure de dossiers modulaire.

---

#### 4. [app/routes/orgs.$orgSlug.projects.$projectSlug.translations.tsx](../../app/routes/orgs.$orgSlug.projects.$projectSlug.translations.tsx) (405 lignes)

**Problèmes identifiés :**

- Affichage complexe de tableau avec multiples langues
- Logique de recherche et pagination
- Mélange de logique d'affichage et de calcul de progression

**Refactorisation recommandée :**

```
app/routes/orgs.$orgSlug.projects.$projectSlug.translations/
├── index.tsx (loader, action, composant principal de la route)
├── TranslationsSearchBar.tsx
├── TranslationsTable.tsx
├── TranslationKeyRow.tsx
├── TranslationProgress.tsx
└── TranslationsPagination.tsx
```

**Composants à créer :**

- `TranslationsSearchBar` : Barre de recherche avec boutons
- `TranslationsTable` : Tableau avec en-têtes et corps
- `TranslationKeyRow` : Ligne du tableau pour une clé de traduction
- `TranslationProgress` : Barre de progression de traduction
- `TranslationsPagination` : Composant de pagination réutilisable

---

### 🟡 Priorité moyenne

#### 5. ~~[app/components/Header.tsx](../../app/components/Header.tsx)~~ (163 lignes) → ✅ TERMINÉ

**Problèmes identifiés :**

- Gère navigation, menu utilisateur et sélecteur de langue
- Logique de construction d'URL pour changement de langue
- Pourrait être divisé pour meilleure réutilisabilité

**Refactorisation effectuée :**

```
app/components/Header/
├── index.tsx (composant principal)
├── Navigation.tsx
├── LanguageSelector.tsx
└── UserMenu.tsx
```

**Composants créés :**

- `Navigation.tsx` : Liens de navigation (projets, recherche)
- `LanguageSelector.tsx` : Menu déroulant de sélection de langue avec logique URL
- `UserMenu.tsx` : Menu utilisateur avec dropdown organisations/logout

**Statut** : ✅ **Terminé** - Refactorisé en structure de dossiers modulaire.

---

## Bénéfices attendus de la refactorisation

### ✅ Maintenabilité

- Code plus facile à comprendre et à modifier
- Chaque composant a une responsabilité claire
- Réduction de la complexité cognitive

### ✅ Réutilisabilité

- Composants plus petits = plus faciles à réutiliser
- Moins de duplication de code
- Composants testables individuellement

### ✅ Testabilité

- Tests unitaires plus simples et ciblés
- Meilleure couverture de tests
- Isolation des dépendances

### ✅ Collaboration

- Plusieurs développeurs peuvent travailler sur le même fichier sans conflit
- Code review plus simple (changements plus petits)
- Onboarding facilité pour nouveaux développeurs

---

## Plan d'action recommandé

1. **Phase 1** : Refactoriser `orgs.$orgSlug.settings.tsx` (impact élevé, 2 sections distinctes)
2. **Phase 2** : Refactoriser `orgs.$orgSlug.members.tsx` (3 sections distinctes)
3. **Phase 3** : Refactoriser `import-export.tsx` (logique complexe à isoler)
4. **Phase 4** : Refactoriser `translations.tsx` (tableau complexe)
5. **Phase 5** : Refactoriser `Header.tsx` (amélioration UX)

### Estimation

- Chaque fichier priorité haute : **2-3 heures** de refactorisation
- Fichier priorité moyenne : **1-2 heures**
- **Total estimé : 10-14 heures**

### Critères de succès

- ✅ Aucun fichier de composant ne dépasse 200 lignes
- ✅ Chaque composant a une seule responsabilité claire
- ✅ Les composants sont organisés en dossiers cohérents
- ✅ Les fichiers `index.ts` exportent correctement les composants publics
- ✅ Tous les tests existants passent
- ✅ Pas de régression fonctionnelle

---

## Règles à respecter durant la refactorisation

1. **Nommage** : PascalCase pour les fichiers composants
2. **Organisation** : Grouper les composants liés dans des dossiers
3. **Export** : Utiliser `index.ts` pour les exports publics
4. **Isolation** : Un composant = un fichier
5. **Props** : Typer toutes les props avec TypeScript
6. **Tests** : Ajouter des tests pour les nouveaux composants

---

## Références

- [Guide de style TypeScript/React](../technical-notes/ts-react-style-guide.md)
- [Best Practices Mapado - ReactJS](https://mapado.github.io/best-practices/docs/js/react)
- [Principe de responsabilité unique (SRP)](https://en.wikipedia.org/wiki/Single-responsibility_principle)
