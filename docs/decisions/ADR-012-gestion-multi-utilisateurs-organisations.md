# ADR-012 : Gestion multi-utilisateurs des organisations

**Date** : 2026-01-25

**Statut** : Accepté

## Contexte

Initialement, le système ne permettait qu'un seul utilisateur par organisation. Cette limitation empêchait la collaboration au sein d'une même organisation, qui est un besoin essentiel pour permettre à plusieurs personnes de travailler ensemble sur les traductions.

Il était nécessaire de permettre à une organisation d'avoir plusieurs membres, tout en maintenant la simplicité du système existant.

## Décision

### 1. Système d'invitation par lien

Mise en place d'un système d'invitation permettant aux membres existants d'inviter de nouveaux utilisateurs dans une organisation via un lien unique.

### 2. Gestion des membres

Ajout d'une interface de gestion des membres dans l'onglet "Membres" de chaque organisation permettant de :

- Lister les membres actuels
- Inviter de nouveaux membres
- Voir les invitations en attente
- Retirer des membres (avec protection contre la suppression du dernier membre)
- Annuler des invitations en attente

### 3. Processus d'invitation

Le processus d'invitation fonctionne comme suit :

1. Un membre crée une invitation en saisissant l'email du destinataire
2. Un lien d'invitation unique est généré (`/orgs/invite/{code}`)
3. Le lien peut être partagé avec la personne invitée
4. L'invité peut accepter l'invitation, qu'il ait déjà un compte ou non
5. Si non connecté, il est redirigé vers la page de connexion puis revient accepter l'invitation
6. Une fois acceptée, l'utilisateur devient membre de l'organisation

### Détails d'implémentation

#### Base de données

Ajout de la table `organization_invitations` :

```typescript
{
  id: varchar(36) PRIMARY KEY,
  organizationId: varchar(36) REFERENCES organizations(id) ON DELETE CASCADE,
  invitationCode: varchar(32) UNIQUE NOT NULL,
  invitedEmail: varchar(255) NOT NULL,
  invitedBy: varchar(36) REFERENCES users(id),
  status: varchar(20) DEFAULT 'pending', // 'pending', 'accepted', 'cancelled'
  createdAt: timestamp,
  acceptedAt: timestamp
}
```

Contraintes :

- Index unique sur `(organizationId, invitedEmail, status)` pour éviter les doublons d'invitations actives
- Index sur `invitationCode` pour des recherches rapides

#### Relations Drizzle

Ajout des relations dans `drizzle/relations.ts` :

- `organizations.invitations` → many `organizationInvitations`
- `organizationInvitations.organization` → one `organizations`
- `organizationInvitations.inviter` → one `users`

#### Bibliothèque serveur

Création de `app/lib/invitations.server.ts` avec les fonctions :

- `createInvitation()` : Crée une invitation avec validation de doublons
- `getPendingInvitations()` : Liste les invitations en attente pour une organisation
- `getInvitationByCode()` : Récupère une invitation par son code
- `acceptInvitation()` : Accepte une invitation et ajoute l'utilisateur (transaction)
- `cancelInvitation()` : Annule une invitation
- `removeMemberFromOrganization()` : Supprime un membre avec protection

#### Routes

**`app/routes/orgs.$orgSlug.members.tsx`** :

- Action `invite-user` : Création d'invitation
- Action `cancel-invitation` : Annulation d'invitation
- Action `remove-member` : Suppression de membre
- Affichage d'un Alert avec le lien d'invitation après création
- Modale pour inviter un nouveau membre
- Modale de secours pour affichage du lien en cas d'erreur de copie

**`app/routes/orgs.invite.$code.tsx`** :

- Page d'acceptation d'invitation
- Redirection vers login si nécessaire
- Acceptation automatique après connexion
- Redirection vers l'organisation après acceptation réussie

#### Interface utilisateur

- Utilisation de composants Chakra UI v3 avec `Portal`, `DialogBackdrop` et `DialogPositioner` pour les modales
- Affichage d'un `Alert` (cohérent avec la gestion des clés API) pour montrer le lien d'invitation
- Gestion des erreurs de copie dans le presse-papiers (contexte HTTP non sécurisé)
- Badges pour identifier l'utilisateur actuel
- Icônes `react-icons/lu` cohérentes avec le reste de l'application

## Raisons

1. **Collaboration** : Permettre à plusieurs personnes de travailler ensemble sur les traductions
2. **Flexibilité** : Support des comptes existants et nouveaux comptes
3. **Sécurité** : Codes d'invitation uniques et à usage unique, statuts pour éviter les réutilisations
4. **Simplicité** : Pas de système de rôles/permissions complexe dans un premier temps
5. **Protection** : Empêcher la suppression du dernier membre d'une organisation
6. **Cohérence** : Réutilisation des patterns existants (Alert pour affichage, modales avec Portal)

## Alternatives considérées

1. **Envoi d'emails automatiques** : Rejeté pour simplifier la première version, peut être ajouté plus tard
2. **Système de rôles (admin, membre, lecteur)** : Rejeté pour garder la simplicité, tous les membres ont les mêmes droits
3. **Invitations par token dans l'URL de l'app** : Rejeté, un lien dédié `/orgs/invite/{code}` est plus clair
4. **Stockage du code d'invitation dans les cookies** : Rejeté, l'URL est plus simple et partageable
5. **Validation de l'email invité** : Rejeté pour ne pas bloquer le partage, la validation se fait à la connexion

## Conséquences

### Positives

- Plusieurs personnes peuvent collaborer sur une organisation
- Processus d'invitation simple et intuitif
- Fonctionne avec des comptes existants et nouveaux
- Protection contre les erreurs (dernier membre, doublons d'invitations)
- Bonne gestion des erreurs (copie du lien, contexte HTTP)
- Interface cohérente avec le reste de l'application

### Négatives

- Pas de gestion de rôles/permissions (tous les membres ont les mêmes droits)
- Pas d'envoi automatique d'emails (partage manuel du lien)
- Les invitations restent en base même après acceptation (pour l'historique)
- Nécessite une connexion pour accepter une invitation

### Points d'amélioration futurs

- Ajout d'un système de rôles (admin, membre, lecteur)
- Envoi automatique d'emails d'invitation
- Expiration des invitations après X jours
- Notification lors de l'ajout/retrait de membres
- Logs d'audit pour les actions sur les membres
