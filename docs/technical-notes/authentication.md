# Système d'authentification

## Vue d'ensemble

transi-store utilise OAuth2/OIDC pour l'authentification des utilisateurs avec support multi-provider. L'implémentation utilise la bibliothèque **Arctic** et le flow **PKCE** (Proof Key for Code Exchange) pour sécuriser les échanges.

## Providers supportés

### Google OAuth2

- Provider standard via Arctic
- Récupération des infos utilisateur depuis l'API Google
- Scopes : `openid`, `email`, `profile`

### Mapado OAuth2

- Provider custom via `OAuth2Client` d'Arctic
- Utilise JWT pour les access tokens
- Décodage du JWT pour extraire l'ID utilisateur

## Flow d'authentification complet

### 1. Initiation (`/auth/{provider}/login`)

1. Génère `code_verifier` + `state` (PKCE)
2. Stocke dans cookie `oauth_state` chiffré (TTL: 10 min)
3. Redirige vers le provider avec challenge PKCE

**Fichier** : `app/routes/auth.{provider}.login.tsx`

### 2. Callback (`/auth/{provider}/callback`)

1. Vérifie que le `state` correspond au cookie
2. Échange le code + code_verifier contre un access token
3. Récupère les infos utilisateur :
   - **Google** : Appel API `openidconnect.googleapis.com/v1/userinfo`
   - **Mapado** : Décodage du JWT access token
4. Upsert utilisateur par `(oauthProvider, oauthSubject)` unique
5. Crée la session (cookie signé)
6. Redirige vers `/auth/complete-profile` si pas de nom, sinon `/`

**Fichiers** :

- `app/routes/auth.{provider}.callback.tsx`
- `app/lib/auth-providers.server.ts`
- `app/lib/auth.server.ts`

### 3. Upsert utilisateur

**Logique** :

- Recherche par `(oauthProvider, oauthSubject)` (constraint unique)
- Si existe : met à jour email uniquement (préserve le nom)
- Si nouveau : crée l'utilisateur (name peut être null)

**Fichier** : `app/lib/auth.server.ts` → `upsertUser()`

### 4. Complétion du profil

Si l'utilisateur n'a pas de `name` après l'upsert :

- Redirige vers `/auth/complete-profile`
- Formulaire pour saisir le nom
- Mise à jour en base + création session

**Fichier** : `app/routes/auth.complete-profile.tsx`

### 5. Gestion de session

**Cookie de session** :

- Contenu : `{ userId, email, name, lastOrganizationId, lastOrganizationSlug }`
- Signé avec `SESSION_SECRET`
- `httpOnly`, `sameSite: 'lax'`, `secure` en production
- TTL : 30 jours

**Fonctions** :

- `getUser(request)` : Récupère l'utilisateur depuis le cookie
- `requireUser(request)` : Lance une 401 redirect si pas connecté

**Fichier** : `app/lib/session.server.ts`

## Sécurité

### PKCE (Proof Key for Code Exchange)

- **code_verifier** : Chaîne aléatoire (43-128 chars)
- **code_challenge** : `BASE64URL(SHA256(code_verifier))`
- Empêche les attaques par interception du code d'autorisation

### Cookies sécurisés

```typescript
{
  httpOnly: true,        // Inaccessible depuis JS
  secure: true,          // HTTPS uniquement (production)
  sameSite: 'lax',       // Protection CSRF
  signed: true           // Signature avec SESSION_SECRET
}
```

### State parameter

- Valeur aléatoire stockée dans le cookie `oauth_state`
- Vérifiée au callback pour prévenir les attaques CSRF
- TTL court (10 minutes)

### Constraint unique

```sql
CREATE UNIQUE INDEX unique_oauth
ON users (oauth_provider, oauth_subject);
```

Empêche les doublons d'utilisateurs pour un même compte OAuth.

## Vérification de l'appartenance organisation

Toutes les routes sous `/orgs/:orgSlug` vérifient l'appartenance via `requireOrganizationMembership()` :

**Logique** :

1. Récupère l'organisation par slug
2. Vérifie que l'utilisateur est membre (table `organization_members`)
3. Lance 404 si org inexistante, 403 si pas membre
4. Retourne l'organisation si OK

**Fichier** : `app/lib/organizations.server.ts`

## Déconnexion

Route `/auth/logout` : Détruit la session (cookie `maxAge: 0`) et redirige vers `/`

**Fichier** : `app/routes/auth.logout.tsx`

## Variables d'environnement requises

```bash
# Provider OIDC (Google ou autre)
OIDC_ISSUER="https://accounts.google.com"
OIDC_CLIENT_ID="your-client-id"
OIDC_CLIENT_SECRET="your-client-secret"

# Secret pour signer les cookies de session
SESSION_SECRET="random-secret-min-32-chars"
```

## Références

- [Arctic Documentation](https://arctic.js.org/)
- [OAuth 2.0 PKCE](https://oauth.net/2/pkce/)
- [OIDC Specification](https://openid.net/specs/openid-connect-core-1_0.html)
