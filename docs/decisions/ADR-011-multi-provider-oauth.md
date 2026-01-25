# ADR-011 : Multi-provider OAuth (Google + Mapado)

**Date** : 25 janvier 2026  
**Statut** : Accepté  
**Contexte** : Ajout de Google OAuth en complément du système OAuth Mapado existant

## Contexte

Le système utilisait précédemment un seul provider OAuth Mapado basé sur JWT. Pour améliorer l'expérience utilisateur et faciliter l'authentification, nous avons ajouté le support de Google OAuth comme provider additionnel.

## Décision

### Architecture multi-provider

Nous avons refactorisé le système d'authentification pour supporter plusieurs providers OAuth :

1. **Module `auth-providers.server.ts`** : centralise la logique des différents providers
   - Google OAuth (via la bibliothèque `arctic`)
   - OAuth Mapado (système existant basé sur JWT)

2. **Détection automatique des providers** :
   - Chaque provider est activé/désactivé selon les variables d'environnement
   - La page de login affiche uniquement les providers configurés

3. **Routes dédiées par provider** :
   - Google : `/auth/google/login` et `/auth/google/callback`
   - Mapado : `/auth/mapado/login` et `/auth/mapado/callback`

### Implémentation technique

#### Bibliothèques

- **arctic** : bibliothèque légère et moderne pour l'authentification OAuth avec Google
  - Support natif de PKCE
  - Gestion automatique des tokens
  - API simple et typée

#### Flux d'authentification Google

1. L'utilisateur clique sur "Se connecter avec Google"
2. Redirection vers `/auth/google/login`
3. Génération d'un `state` et `codeVerifier` (PKCE)
4. Stockage dans un cookie session
5. Redirection vers Google OAuth
6. Callback sur `/auth/google/callback`
7. Validation du `state`
8. Échange du code contre un access token
9. Récupération des informations utilisateur depuis l'API Google
10. Création/mise à jour de l'utilisateur en base
11. Création de la session utilisateur

#### Extraction des données utilisateur

**Google OAuth** :

- `sub` : identifiant unique Google
- `email` : email de l'utilisateur
- `name` : nom complet (ou `given_name` en fallback)
- `picture` : URL de l'avatar (non utilisé pour l'instant)

**OAuth Mapado (JWT)** :

- `sub` : identifiant unique depuis le JWT
- `email` : email optionnel dans le JWT
- `name` : non fourni, l'utilisateur doit compléter son profil

### Variables d'environnement

```bash
# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# Mapado OAuth (optionnel)
OAUTH_AUTHORIZATION_URL=https://...
OAUTH_TOKEN_URL=https://...
OAUTH_CLIENT_ID=xxx
OAUTH_CLIENT_SECRET=xxx
OAUTH_REDIRECT_URI=http://localhost:5173/auth/mapado/callback
OAUTH_SCOPES=
```

Au moins un des deux providers doit être configuré pour que l'application fonctionne.

### Schéma de base de données

Le schéma existant supporte déjà plusieurs providers grâce aux champs :

- `oauthProvider` : "google" ou "mapado"
- `oauthSubject` : identifiant unique fourni par le provider
- Index unique sur `(oauthProvider, oauthSubject)`

Un utilisateur peut avoir un seul compte par provider (un compte Google et un compte Mapado peuvent coexister pour le même email).

## Conséquences

### Avantages

- ✅ **Meilleure UX** : connexion en un clic avec Google
- ✅ **Extensibilité** : architecture prête pour ajouter d'autres providers (GitHub, Microsoft, etc.)
- ✅ **Sécurité** : utilisation de PKCE pour tous les providers
- ✅ **Maintenabilité** : code centralisé et modulaire

### Inconvénients

- ⚠️ **Complexité accrue** : plus de routes et de logique à maintenir
- ⚠️ **Dépendance externe** : bibliothèque `arctic` (mais très légère et active)

### Points d'attention

- Si un utilisateur se connecte avec Google puis avec Mapado (ou inversement) avec le même email, deux comptes distincts seront créés
- La logique de merge de comptes n'est pas implémentée pour l'instant
- Chaque provider a sa propre paire de routes (login/callback)

## Alternatives considérées

1. **Utiliser Passport.js** : trop lourd et design pattern obsolète pour React Router
2. **Implémenter Google OAuth manuellement** : plus de code à maintenir et risque d'erreurs
3. **Utiliser Auth.js (NextAuth)** : pas optimisé pour React Router, overhead inutile

## Configuration Google Cloud

Pour configurer Google OAuth :

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet ou sélectionner un projet existant
3. Activer l'API "Google+ API"
4. Créer des identifiants OAuth 2.0 :
   - Type : Application web
   - Origines autorisées : `http://localhost:5173` (dev), `https://votre-domaine.com` (prod)
   - URI de redirection : `http://localhost:5173/auth/google/callback` (dev)
5. Copier le Client ID et Client Secret dans le `.env`

## Prochaines étapes possibles

- Ajouter GitHub OAuth
- Ajouter Microsoft OAuth
- Implémenter un système de liaison de comptes (merge)
- Permettre à un utilisateur de lier plusieurs providers à son compte
- Stocker et afficher l'avatar utilisateur depuis Google
