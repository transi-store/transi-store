# Système d'import

## Vue d'ensemble

Le système d'import permet de charger en masse des traductions depuis des fichiers JSON. Il supporte deux stratégies : écraser les traductions existantes ou les conserver.

## Format supporté

### JSON plat (clé-valeur)

```json
{
  "home.title": "Accueil",
  "home.subtitle": "Bienvenue sur notre site",
  "navbar.about": "À propos",
  "navbar.contact": "Contact"
}
```

**Contraintes** :

- Objet plat (pas de nesting)
- Clés : chaînes de caractères (max 500 chars)
- Valeurs : chaînes de caractères
- Taille max du fichier : **5 MB**

## Interface utilisateur

Route : `/orgs/:orgSlug/projects/:projectSlug/import-export`

```tsx
<Form method="post" encType="multipart/form-data">
  {/* Sélection de la langue */}
  <SelectRoot name="locale" required>
    <SelectTrigger>
      <SelectValueText placeholder="Choisir une langue" />
    </SelectTrigger>
    <SelectContent>
      {languages.map((lang) => (
        <SelectItem value={lang.locale}>{lang.locale}</SelectItem>
      ))}
    </SelectContent>
  </SelectRoot>

  {/* Stratégie d'import */}
  <RadioGroup name="strategy" defaultValue="overwrite">
    <Radio value="overwrite">Écraser les traductions existantes</Radio>
    <Radio value="skip">Conserver les traductions existantes</Radio>
  </RadioGroup>

  {/* Upload du fichier */}
  <FileUploadRoot name="file" required accept=".json">
    <FileUploadTrigger>Choisir un fichier JSON</FileUploadTrigger>
  </FileUploadRoot>

  <Button type="submit">Importer</Button>
</Form>
```

## Stratégies d'import

### 1. Overwrite (Écraser)

- Crée les nouvelles clés
- Met à jour les traductions existantes
- Conserve les traductions non présentes dans le fichier

**Exemple** :

```
Base de données avant :
  home.title (fr) = "Accueil"
  home.title (en) = "Home"
  navbar.about (fr) = "À propos"

Fichier importé (fr) :
  home.title = "Page d'accueil"
  contact.email = "Email"

Résultat :
  home.title (fr) = "Page d'accueil" ← Écrasé
  home.title (en) = "Home"           ← Conservé (autre langue)
  navbar.about (fr) = "À propos"     ← Conservé (absent du fichier)
  contact.email (fr) = "Email"       ← Créé
```

### 2. Skip (Conserver)

- Crée les nouvelles clés
- **Ignore** les traductions existantes (ne met pas à jour)

**Exemple** :

```
Base de données avant :
  home.title (fr) = "Accueil"
  navbar.about (fr) = "À propos"

Fichier importé (fr) :
  home.title = "Page d'accueil"
  contact.email = "Email"

Résultat :
  home.title (fr) = "Accueil"        ← Conservé (skip)
  navbar.about (fr) = "À propos"     ← Conservé
  contact.email (fr) = "Email"       ← Créé
```

## Flow d'import

### 1. Validation

- Taille du fichier : max 5 MB
- Parse JSON
- Structure : objet plat uniquement (pas de nesting)
- Clés : strings non vides, max 500 chars
- Valeurs : strings uniquement

### 2. Transaction PostgreSQL

Toutes les opérations dans une transaction pour garantir l'atomicité :

1. Pour chaque paire clé-valeur :
   - Upsert `translation_keys` (crée ou met à jour `updatedAt`)
   - Insert ou update `translations` selon la stratégie :
     - **overwrite** : `onConflictDoUpdate` (écrase)
     - **skip** : `onConflictDoNothing` (ignore)

**Avantage** : En cas d'erreur, tout est annulé (pas de données partielles)

### 3. Statistiques

Retour :

```json
{
  "success": true,
  "imported": 42, // Nouvelles traductions
  "updated": 15, // Traductions écrasées
  "skipped": 0 // Traductions ignorées
}
```

## Implémentation

### Fichiers sources

- **Route** : `app/routes/orgs.$orgSlug.projects.$projectSlug.import-export.tsx`
- **Logique** : `app/lib/import/json.server.ts`

## Gestion des erreurs

### Erreurs de validation

```json
{
  "error": "Validation Error",
  "message": "File too large (max 5 MB)"
}
```

**Causes** :

- Fichier > 5 MB
- JSON invalide
- Structure non plate
- Clés ou valeurs invalides

### Erreurs de base de données

```json
{
  "error": "Database Error",
  "message": "Transaction failed"
}
```

**Causes** :

- Erreur lors de l'insertion
- Violation de contrainte
- Timeout de transaction

## Limitations

1. **Taille du fichier** : 5 MB maximum
2. **Format** : JSON plat uniquement (pas de nesting)
3. **Types** : Clés et valeurs doivent être des chaînes
4. **Longueur des clés** : 500 caractères maximum
5. **Locale unique** : Import d'une seule langue à la fois

## Extensions futures possibles

- Support XLIFF pour l'import
- Import multi-langues (un fichier avec toutes les langues)
- Import incrémental avec diff
- Validation ICU MessageFormat avant import
- Preview des changements avant confirmation
- Support CSV

## Exemple d'utilisation (cURL)

```bash
curl -X POST \
  -F "locale=fr" \
  -F "strategy=overwrite" \
  -F "file=@translations.json" \
  -b "session=<cookie>" \
  "http://localhost:5173/orgs/my-org/projects/app/import-export"
```
