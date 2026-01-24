# ADR-007 : Redirection automatique vers organisation unique et menu utilisateur

**Date** : 2026-01-24

**Statut** : Accepté

## Contexte

Dans la plupart des cas d'usage, un utilisateur n'appartient qu'à une seule organisation. L'affichage systématique de la liste des organisations ajoutait une étape inutile dans la navigation pour ces utilisateurs.

De plus, le lien "Organisations" dans le menu principal était trop mis en avant pour une action peu fréquente (changer d'organisation).

## Décision

### 1. Redirection automatique vers l'organisation unique

Lorsqu'un utilisateur connecté n'appartient qu'à une seule organisation :

- La page d'accueil (`/`) redirige directement vers `/orgs/{slug}`
- La page `/orgs` redirige également vers `/orgs/{slug}`

### 2. Menu utilisateur déroulant

Remplacement du lien "Organisations" par un menu déroulant sur le nom d'utilisateur contenant :

- "Mes organisations" → lien vers `/orgs`
- "Déconnexion" → action de logout
- (Prévu) Paramètres du compte

### 3. Lien "Projets" dans la navigation principale

Ajout d'un lien "Projets" entre "transi-store" et "Recherche" qui :

- Pointe vers la dernière organisation visitée
- Est masqué si l'utilisateur n'a pas encore visité d'organisation
- Facilite l'accès rapide aux projets de l'organisation active

### Détails d'implémentation

#### Base de données

- Ajout du champ `last_organization_id` (VARCHAR 36, nullable) dans la table `users`
- Ce champ est mis à jour automatiquement lors de la visite d'une page d'organisation

#### Session

- Ajout de `lastOrganizationId` et `lastOrganizationSlug` dans l'interface `SessionData`
- Fonction `updateSessionLastOrganization()` pour mettre à jour ces informations en session
- La session est mise à jour via un header `Set-Cookie` dans le loader de `/orgs/$orgSlug`

#### Routes modifiées

- **`app/routes/_index.tsx`** : Vérification du nombre d'organisations et redirection si une seule
- **`app/routes/orgs._index.tsx`** : Même logique de redirection
- **`app/routes/orgs.$orgSlug.tsx`** : Sauvegarde automatique de l'organisation visitée (DB + session)
- **`app/components/Header.tsx`** : Nouveau menu utilisateur + lien Projets conditionnel

#### Fonctions ajoutées

- `updateUserLastOrganization()` dans `organizations.server.ts` : Met à jour le champ en base
- `updateSessionLastOrganization()` dans `session.server.ts` : Met à jour la session
- `getOrganizationById()` dans `organizations.server.ts` : Récupération d'une organisation par ID

## Raisons

1. **Simplification de l'expérience utilisateur** : La majorité des utilisateurs n'ont qu'une organisation, l'étape de sélection était superflue
2. **Navigation plus intuitive** : Le lien "Projets" permet un accès direct au contenu principal
3. **Cohérence** : Le menu utilisateur regroupe les actions liées au compte (organisations, déconnexion, futur paramétrage)
4. **Performance** : Moins de clics nécessaires pour accéder aux projets
5. **Flexibilité** : Le système reste fonctionnel pour les utilisateurs multi-organisations

## Alternatives considérées

1. **Garder le lien "Organisations" visible** : Rejeté car trop présent pour une action rare
2. **Ne pas sauvegarder la dernière organisation visitée** : Rejeté car le lien "Projets" perdrait son utilité
3. **Sauvegarder uniquement en session sans base de données** : Rejeté car l'information serait perdue entre les sessions
4. **Utiliser localStorage côté client** : Rejeté car moins fiable et non accessible côté serveur

## Conséquences

### Positives

- Navigation plus fluide pour les utilisateurs mono-organisation
- Accès rapide aux projets via le lien dédié
- Menu principal moins encombré
- Meilleure organisation des actions utilisateur

### Négatives

- Ajout d'une colonne en base de données
- Légère complexité ajoutée dans les loaders
- Les utilisateurs multi-organisations doivent utiliser le menu déroulant pour changer d'organisation
