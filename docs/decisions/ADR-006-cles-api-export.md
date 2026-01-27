# ADR-006 : Clés d'API pour l'export de données

**Date** : 2026-01-23

**Statut** : Accepté ✅

## Contexte

Actuellement, l'export des traductions d'un projet nécessite qu'un utilisateur soit authentifié via OAuth2 et membre de l'organisation. Cette approche fonctionne bien pour les utilisateurs humains utilisant l'interface web.

Cependant, pour les cas d'automatisation (CI/CD, scripts de déploiement, intégrations tierces), ce modèle d'authentification n'est pas adapté car :

1. OAuth2 nécessite un navigateur pour le flux d'authentification
2. Les sessions utilisateur ont une durée de vie limitée
3. Les tokens OAuth ne sont pas conçus pour être stockés dans des pipelines CI/CD
4. Il n'y a pas de moyen simple d'exporter des traductions via API sans interaction humaine

## Décision

Nous implémentons un système de clés d'API (API keys) permettant l'export automatisé des traductions sans authentification OAuth.

### Caractéristiques principales

1. **Scope organisation** : Les clés d'API sont liées à une organisation, donnant accès à tous les projets de cette organisation
2. **Clés multiples** : Une organisation peut créer plusieurs clés d'API (ex: une par environnement, par outil, etc.)
3. **Nommage optionnel** : Chaque clé peut avoir un nom pour l'identifier facilement
4. **Format de clé** : Chaîne alphanumérique aléatoire de 32 caractères (256 bits d'entropie)
5. **Authentification Bearer** : Les clés sont passées dans le header HTTP `Authorization: Bearer <api-key>`
6. **Gestion dans l'UI** : Interface de création/suppression dans les paramètres de l'organisation

### Architecture technique

#### 1. Schéma de base de données

Nouvelle table `apiKeys` :

```typescript
{
  id: uuid (PK)
  organizationId: uuid (FK vers organizations, cascade delete)
  keyValue: string(32) (unique, index) // La clé API elle-même
  name: string(255) (nullable)         // Nom optionnel pour identifier la clé
  createdBy: uuid (FK vers users)      // Utilisateur ayant créé la clé
  createdAt: timestamp
  lastUsedAt: timestamp (nullable)     // Dernière utilisation de la clé
}
```

**Sécurité** :

- Les clés sont générées avec `crypto.randomBytes()` pour une entropie maximale
- Les clés sont stockées en clair dans la DB (hashing non nécessaire car déjà aléatoires et UUID-like)
- Index sur `keyValue` pour des lookups rapides
- Cascade delete : si l'organisation est supprimée, les clés le sont aussi

#### 2. Module de gestion (`app/lib/api-keys.server.ts`)

**Fonctions principales** :

```typescript
generateApiKey(): string                           // Génère une clé aléatoire de 32 caractères
createApiKey(organizationId, name, createdBy)     // Crée une nouvelle clé
getOrganizationApiKeys(organizationId)            // Liste les clés d'une org
deleteApiKey(id, organizationId)                  // Supprime une clé
getOrganizationByApiKey(keyValue)                 // Trouve l'org associée à une clé
updateApiKeyLastUsed(id)                          // Met à jour lastUsedAt
```

**Génération de clé** :

```typescript
// 24 bytes = 192 bits, en base64url = ~32 caractères alphanumériques
crypto.randomBytes(24).toString("base64url");
```

#### 3. Modification de l'endpoint d'export

**Fichier** : `app/routes/api.orgs.$orgSlug.projects.$projectSlug.export.tsx`

**Nouvelle logique d'authentification** :

```typescript
// 1. Vérifier le header Authorization
const authHeader = request.headers.get("Authorization");

if (authHeader?.startsWith("Bearer ")) {
  // Mode API Key
  const apiKey = authHeader.slice(7); // Retire "Bearer "

  // Vérifier la clé et récupérer l'organisation
  const org = await getOrganizationByApiKey(apiKey);

  if (!org) {
    throw json({ error: "Invalid API key" }, { status: 401 });
  }

  // Vérifier que l'org correspond au slug
  if (org.slug !== params.orgSlug) {
    throw json(
      { error: "API key does not match organization" },
      { status: 403 },
    );
  }

  // Mettre à jour la date de dernière utilisation
  await updateApiKeyLastUsed(apiKey);

  // Autoriser l'export
} else {
  // Mode session utilisateur (comportement actuel)
  const user = await requireUser(request);
  await requireOrganizationMembership(user, params.orgSlug);
}

// Le reste de la logique d'export reste identique
```

**Comportement** :

- Si header `Authorization: Bearer xxx` présent → authentification par clé d'API
- Sinon → authentification par session utilisateur (comportement actuel)
- Compatibilité totale avec l'existant : aucun changement pour les utilisateurs web

#### 4. Interface de gestion

**Nouvelle navigation dans la page organisation** :

Actuellement, la page `/orgs/{orgSlug}` affiche les projets et membres en une seule page.

**Nouvelle structure** :

```
/orgs/{orgSlug}
  /projects   (défaut) - Liste des projets
  /members             - Liste des membres
  /settings            - Paramètres (dont les clés d'API)
```

**Page `/orgs/{orgSlug}/settings`** :

- **Section "Clés d'API"** :
  - Liste des clés existantes avec nom, date de création, dernière utilisation
  - Bouton "Créer une clé d'API"
  - Action de suppression pour chaque clé
  - Warning de sécurité : "Cette clé ne sera affichée qu'une seule fois"

- **Formulaire de création** :
  - Input pour le nom (optionnel)
  - Action : génère la clé et l'affiche une seule fois
  - Bouton de copie pour faciliter la sauvegarde

## Raisons

1. **Automatisation** : Permet l'intégration dans des pipelines CI/CD sans interaction humaine
2. **Sécurité** : Les clés d'API sont plus adaptées que les tokens OAuth pour un stockage dans des variables d'environnement
3. **Isolation** : Une clé compromise peut être révoquée sans impacter les autres clés ou les utilisateurs
4. **Traçabilité** : Le champ `lastUsedAt` permet de voir quelles clés sont actives
5. **Simplicité** : Pas besoin de renouvellement automatique, les clés sont permanentes jusqu'à révocation
6. **Compatibilité** : L'authentification par session continue de fonctionner normalement

## Alternatives considérées

### 1. OAuth2 Client Credentials Flow

**Description** : Utiliser le flow OAuth2 standard pour les applications (client_id + client_secret).

**Rejeté** :

- Plus complexe à implémenter (besoin d'un serveur d'autorisation complet)
- Nécessite une gestion de tokens avec expiration et renouvellement
- Overkill pour notre cas d'usage simple

### 2. Tokens JWT signés

**Description** : Générer des JWT signés avec une clé secrète, incluant l'organization ID dans le payload.

**Rejeté** :

- Plus complexe : nécessite signature/vérification JWT
- Pas de révocation simple (sauf avec une blacklist)
- Les clés aléatoires longues sont aussi sécurisées et plus simples

### 3. Clés d'API scoped par projet

**Description** : Lier les clés à un projet spécifique plutôt qu'à l'organisation.

**Rejeté** :

- Moins flexible : nécessite plusieurs clés pour accéder à plusieurs projets
- Complexité de gestion accrue
- Le scope organisation est plus naturel (correspond au modèle d'accès utilisateur)

### 4. Hashing des clés dans la DB

**Description** : Stocker un hash de la clé au lieu de la clé en clair (comme pour les mots de passe).

**Rejeté pour v1** :

- Nos clés sont déjà hautement aléatoires (256 bits) comme des UUIDs
- Hashing ajouterait de la complexité sans gain de sécurité significatif
- Si la DB est compromise, l'attaquant a déjà accès aux données à exporter
- Peut être ajouté ultérieurement si nécessaire

### 5. Permissions granulaires par clé

**Description** : Définir des permissions spécifiques (read-only, langues spécifiques, etc.) pour chaque clé.

**Rejeté pour v1** :

- Complexité d'implémentation élevée
- Cas d'usage principal (export) ne nécessite que read-only
- Peut être ajouté plus tard si le besoin émerge

## Conséquences

### Positives

- Automatisation possible des exports de traductions
- Meilleure expérience développeur pour les intégrations CI/CD
- Sécurité : révocation individuelle des clés sans impact sur les autres
- Traçabilité : visibilité sur l'utilisation des clés
- Simplicité : pas de gestion de refresh tokens ou d'expiration
- Rétrocompatibilité : l'authentification par session continue de fonctionner

### Négatives

- Surface d'attaque légèrement augmentée (nouveau vecteur d'authentification)
- Les clés ne peuvent pas être récupérées si perdues (par design)
- Pas de permissions granulaires (toute l'organisation est accessible)
- Pas d'expiration automatique des clés

### Risques et mitigations

| Risque                                | Mitigation                                                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clé exposée dans un repository public | - Documentation claire sur le stockage sécurisé<br>- Recommandation d'utiliser des secrets manager<br>- Possibilité de révoquer rapidement         |
| Clé compromise                        | - Révocation instantanée dans l'UI<br>- Notification de dernière utilisation<br>- Une clé compromise n'affecte qu'une organisation                 |
| Abus de clé                           | - Tracking de `lastUsedAt`<br>- Logs d'accès (peut être ajouté ultérieurement)<br>- Limitation aux opérations d'export (read-only)                 |
| Perte de clé                          | - Affichage unique lors de la création<br>- Possibilité de créer une nouvelle clé facilement<br>- Documentation claire sur la sauvegarde sécurisée |

## Cas d'usage

### CI/CD : Export pour build front-end

```bash
# Dans un pipeline GitLab CI / GitHub Actions
curl -H "Authorization: Bearer <api-key>" \
  "https://transi-store.example.com/api/orgs/myorg/projects/myapp/export?format=json&locale=fr" \
  > src/translations/fr.json
```

### Script de sauvegarde

```bash
#!/bin/bash
# backup-translations.sh
API_KEY="your-api-key-here"
ORG="myorg"
PROJECT="myapp"

for locale in fr en de es; do
  curl -H "Authorization: Bearer $API_KEY" \
    "https://transi-store.example.com/api/orgs/$ORG/projects/$PROJECT/export?format=json&locale=$locale" \
    > "backups/$PROJECT-$locale-$(date +%Y%m%d).json"
done
```

### Intégration avec un outil tiers

```javascript
// Exemple : synchronisation avec un système de documentation
const API_KEY = process.env.TRANSI_STORE_API_KEY;
const BASE_URL = "https://transi-store.example.com";

async function fetchTranslations(org, project, locale) {
  const response = await fetch(
    `${BASE_URL}/api/orgs/${org}/projects/${project}/export?format=json&locale=${locale}`,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    },
  );

  return response.json();
}
```

## Validation

### Tests manuels à effectuer

- [x] Créer une clé d'API avec un nom
- [x] Créer une clé d'API sans nom
- [ ] Vérifier que la clé n'est affichée qu'une fois
- [x] Copier la clé et l'utiliser pour un export JSON
- [ ] Copier la clé et l'utiliser pour un export XLIFF
- [ ] Vérifier que `lastUsedAt` est mis à jour après utilisation
- [x] Tester avec une clé invalide → 401 Unauthorized
- [ ] Tester avec une clé d'une autre organisation → 403 Forbidden
- [x] Supprimer une clé et vérifier qu'elle ne fonctionne plus
- [x] Vérifier que l'export avec session utilisateur fonctionne toujours
- [x} Créer plusieurs clés pour la même organisation
- [ ] Vérifier que la suppression d'une organisation supprime ses clés

### Tests de sécurité

- [ ] Vérifier que les clés générées sont bien aléatoires (pas de pattern)
- [ ] Tenter d'utiliser une clé d'une org A pour accéder aux projets d'une org B
- [x] Vérifier que le header Authorization sans "Bearer " est rejeté
- [ ] Vérifier que les clés ne sont pas loggées en clair dans les logs serveur

## Maintenance

### Ajouter un système d'expiration

Si nécessaire plus tard, ajouter un champ `expiresAt` :

```typescript
// Dans le schéma
expiresAt: timestamp(nullable);

// Vérification lors de l'authentification
if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
  throw new Error("API key expired");
}
```

### Ajouter des permissions granulaires

Créer une table `apiKeyPermissions` :

```typescript
{
  id: uuid
  apiKeyId: uuid (FK)
  resource: string // "project", "organization"
  resourceId: uuid
  permissions: string[] // ["read", "write", "delete"]
}
```

### Ajouter un système de rate limiting

Implémenter un rate limiter basé sur la clé d'API :

```typescript
// Exemple avec upstash/ratelimit
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  limiter: Ratelimit.slidingWindow(100, "1 h"),
  prefix: "api-key-ratelimit",
});

// Dans l'endpoint
const { success } = await ratelimit.limit(apiKey);
if (!success) {
  throw new Error("Rate limit exceeded");
}
```

### Ajouter l'audit logging

Logger chaque utilisation de clé d'API :

```typescript
// Nouvelle table audit_logs
await db.insert(auditLogs).values({
  apiKeyId: apiKey.id,
  action: "export",
  resource: "project",
  resourceId: project.id,
  timestamp: new Date(),
  ipAddress: request.headers.get("x-forwarded-for"),
  userAgent: request.headers.get("user-agent"),
});
```

## Fichiers créés/modifiés

### Créés

- `/docs/decisions/ADR-006-cles-api-export.md` - Ce document
- `/app/lib/api-keys.server.ts` - Module de gestion des clés d'API
- `/app/routes/orgs.$orgSlug.settings.tsx` - Page de paramètres de l'organisation
- `/app/routes/orgs.$orgSlug.projects._index.tsx` - Migration de la liste des projets
- `/app/routes/orgs.$orgSlug.members._index.tsx` - Migration de la liste des membres

### Modifiés

- `/drizzle/schema.ts` - Ajout de la table `apiKeys`
- `/app/routes/api.orgs.$orgSlug.projects.$projectSlug.export.tsx` - Support authentification par clé d'API
- `/app/routes/orgs.$orgSlug._index.tsx` - Ajout de la navigation tabs
- `/README.md` - Ajout de la référence à l'ADR-006

### Migrations

```bash
# Après modification du schéma
make db-generate  # Génère la migration
make db-push      # Applique la migration

# Ou sans Make:
docker compose exec app yarn db:generate
docker compose exec app yarn db:push
```

## Métriques et monitoring

**À surveiller** :

- Nombre de clés d'API actives par organisation
- Fréquence d'utilisation des clés (via `lastUsedAt`)
- Nombre de tentatives d'authentification échouées
- Temps de réponse des endpoints d'export avec clés d'API

**Limites suggérées** :

- Max 10 clés d'API par organisation (limite soft, ajustable)
- Rate limit : 100 requêtes par heure par clé (à implémenter si nécessaire)

## Documentation utilisateur

### Guide de création d'une clé d'API

1. Aller dans "Paramètres" de votre organisation
2. Section "Clés d'API"
3. Cliquer sur "Créer une clé d'API"
4. (Optionnel) Donner un nom à votre clé
5. Copier la clé générée (elle ne sera plus affichée)
6. Stocker la clé de manière sécurisée

### Guide d'utilisation

```bash
curl -H "Authorization: Bearer VOTRE_CLE_API" \
  "https://transi-store.example.com/api/orgs/VOTRE_ORG/projects/VOTRE_PROJET/export?format=json&locale=fr"
```

**Bonnes pratiques** :

- ✅ Stocker les clés dans des variables d'environnement ou secrets manager
- ✅ Utiliser des noms descriptifs pour identifier les clés
- ✅ Révoquer les clés non utilisées
- ✅ Créer une clé par environnement/outil
- ❌ Ne jamais commiter les clés dans Git
- ❌ Ne jamais partager les clés par email/chat

## Références

- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [HTTP Authorization Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization)

## Améliorations futures (hors scope)

1. **Expiration automatique** : Clés avec durée de vie limitée
2. **Permissions granulaires** : Scope read/write, par projet, par langue
3. **Rate limiting** : Limiter le nombre de requêtes par clé
4. **Audit logs complet** : Traçabilité détaillée de toutes les opérations
5. **Webhooks** : Notifications sur événements (clé utilisée, clé compromise)
6. **Rotation de clés** : Renouvellement automatique des clés
7. **IP whitelisting** : Restreindre l'utilisation des clés à certaines IPs
8. **Statistiques d'utilisation** : Dashboard avec métriques par clé
9. **Clés temporaires** : Générer des clés à usage unique ou temporaire
10. **Scopes OAuth-like** : Permissions fines (read:translations, write:keys, etc.)
