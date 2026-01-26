# API d'export

## Vue d'ensemble

L'API d'export permet de télécharger les traductions d'un projet en JSON ou XLIFF 2.0. Elle supporte deux méthodes d'authentification : session utilisateur ou clé d'API.

## Endpoint

```
GET /api/orgs/:orgSlug/projects/:projectSlug/export
```

**Exemple** :

```
GET /api/orgs/mapado/projects/website/export?format=json&locale=fr
```

## Authentification

### 1. Session utilisateur (cookie)

Authentification standard via le cookie de session :

```bash
curl -b cookies.txt \
  "http://localhost:5173/api/orgs/my-org/projects/app/export?format=json&locale=fr"
```

Le cookie `session` doit être présent et valide.

### 2. Clé d'API (Bearer token)

Authentification programmatique via header `Authorization` :

```bash
curl -H "Authorization: Bearer <api-key>" \
  "http://localhost:5173/api/orgs/my-org/projects/app/export?format=json&locale=fr"
```

**Avantages** :

- Idéal pour CI/CD
- Pas besoin de maintenir une session
- Traçabilité via `last_used_at`

**Création d'une clé** :

- Via l'interface web : `/orgs/:orgSlug/settings` (section API Keys)
- Génération : `base64url(crypto.randomBytes(24))` → 32 caractères

## Paramètres de requête

### Format

| Paramètre | Valeurs     | Requis | Description      |
| --------- | ----------- | ------ | ---------------- |
| `format`  | json, xliff | Oui    | Format de sortie |

### JSON - Locale unique

| Paramètre | Type   | Requis | Description                   |
| --------- | ------ | ------ | ----------------------------- |
| `locale`  | string | Oui    | Code de langue (fr, en, etc.) |

**Exemple** :

```bash
GET /api/orgs/my-org/projects/app/export?format=json&locale=fr
```

**Réponse** :

```json
{
  "home.title": "Accueil",
  "home.subtitle": "Bienvenue sur notre site",
  "navbar.about": "À propos",
  "navbar.contact": "Contact"
}
```

### JSON - Toutes les locales

| Paramètre | Type | Requis | Description                 |
| --------- | ---- | ------ | --------------------------- |
| `all`     | flag | Oui    | Exporter toutes les langues |

**Exemple** :

```bash
GET /api/orgs/my-org/projects/app/export?format=json&all
```

**Réponse** :

```json
{
  "fr": {
    "home.title": "Accueil",
    "navbar.about": "À propos"
  },
  "en": {
    "home.title": "Home",
    "navbar.about": "About"
  },
  "de": {
    "home.title": "Startseite",
    "navbar.about": "Über uns"
  }
}
```

### XLIFF 2.0

| Paramètre | Type   | Requis | Description   |
| --------- | ------ | ------ | ------------- |
| `source`  | string | Oui    | Langue source |
| `target`  | string | Oui    | Langue cible  |

**Exemple** :

```bash
GET /api/orgs/my-org/projects/app/export?format=xliff&source=en&target=fr
```

**Réponse** :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="fr">
  <file id="f1">
    <unit id="home.title">
      <notes>
        <note>Welcome message on homepage</note>
      </notes>
      <segment>
        <source>Home</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="navbar.about">
      <segment>
        <source>About</source>
        <target>À propos</target>
      </segment>
    </unit>
  </file>
</xliff>
```

**Notes** :

- Les descriptions des clés sont exportées dans `<notes>`
- Escaping XML automatique pour les caractères spéciaux

## Headers de réponse

### JSON

```http
Content-Type: application/json; charset=utf-8
Content-Disposition: attachment; filename="project-slug-fr.json"
```

### XLIFF

```http
Content-Type: application/xml; charset=utf-8
Content-Disposition: attachment; filename="project-slug-en-fr.xliff"
```

## Gestion des erreurs

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "No valid session or API key provided"
}
```

**Causes** :

- Aucune session ni clé d'API
- Session expirée
- Clé d'API invalide

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "You are not a member of this organization"
}
```

**Causes** :

- L'utilisateur n'est pas membre de l'organisation
- La clé d'API n'appartient pas à l'organisation

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Project not found"
}
```

**Causes** :

- Organisation inexistante
- Projet inexistant dans l'organisation

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Missing required parameter: locale"
}
```

**Causes** :

- Paramètres manquants ou invalides
- Format non supporté
- Langue inexistante dans le projet

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An error occurred while exporting translations"
}
```

## Implémentation

### Fichiers sources

- **Route** : `app/routes/api.orgs.$orgSlug.projects.$projectSlug.export.tsx`
- **Formateurs** :
  - `app/lib/export/json.server.ts`
  - `app/lib/export/xliff.server.ts`

### Flow d'authentification

1. Vérifie le header `Authorization: Bearer <key>`
   - Si valide : continue + met à jour `last_used_at` (async)
2. Sinon, vérifie la session utilisateur
   - `requireUser()` + `requireOrganizationMembership()`
3. Charge les traductions du projet
4. Formate selon le paramètre `format`
5. Retourne avec headers `Content-Type` et `Content-Disposition`

### Tracking des clés d'API

- Le champ `last_used_at` est mis à jour à chaque appel (opération asynchrone, non-bloquante)
- Permet de suivre l'utilisation des clés

## Exemples d'intégration

### CI/CD (GitHub Actions)

```yaml
- name: Download translations
  run: |
    curl -H "Authorization: Bearer ${{ secrets.TRANSI_STORE_API_KEY }}" \
      -o translations.json \
      "https://transi-store.com/api/orgs/my-org/projects/app/export?format=json&locale=fr"
```

### Script Node.js

```javascript
const fetch = require("node-fetch");

async function downloadTranslations(locale) {
  const response = await fetch(
    `https://transi-store.com/api/orgs/my-org/projects/app/export?format=json&locale=${locale}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}
```

## Références

- [XLIFF 2.0 Specification](http://docs.oasis-open.org/xliff/xliff-core/v2.0/xliff-core-v2.0.html)
- [RFC 6750 - Bearer Token](https://datatracker.ietf.org/doc/html/rfc6750)
