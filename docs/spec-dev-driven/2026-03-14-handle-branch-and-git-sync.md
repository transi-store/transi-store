# Plan : Systeme de branches pour les traductions

## Contexte

transi-store gere les traductions de maniere "a plat" : un projet a des cles (`translation_keys`) avec des traductions par locale (`translations`). Il n'y a aucun concept de branche.

**Objectif** : Permettre de creer des branches dans un projet pour y regrouper les nouvelles cles de traduction liees a une feature/branche Git. Puis de merger ces cles dans main quand la branche Git est mergee.

**Cas d'usage** : Projets dev avec usage de Git. Un dev cree une feature branch dans Git, cree la branche correspondante dans Transistor, y ajoute ses nouvelles cles de traduction, puis merge quand la feature est terminee.

---

## Modele choisi : branchId sur translation_keys

### Principes

1. **`branchId` (nullable)** ajoute a `translation_keys`
   - `NULL` = la cle est sur main
   - `= X` = la cle a ete creee sur la branche X
2. **Une branche ne contient que les nouvelles cles** creees sur cette branche
3. **Pas d'isolation** pour les traductions de cles existantes : modifier une traduction d'une cle main modifie directement main, meme quand on est "sur" une branche
4. **Une cle ne peut etre que sur une seule branche** (contrainte unique `(projectId, keyName)` inchangee)
5. **Merge = deplacer les cles** de la branche vers main (`SET branchId = NULL`)
6. **Fermer sans merger = supprimer les cles** de la branche (et leurs traductions par cascade)

### Avantages

- Zero copie de donnees a la creation de branche
- Code existant (main) quasiment inchange (ajouter `WHERE branchId IS NULL` pour les vues "main only")
- Merge trivial : un UPDATE + verif de collision
- Pas de three-way merge, pas de resolution de conflits complexe
- Modele mental clair pour l'utilisateur

---

## Modele de donnees

### Nouvelle table : `branches`

```
branches:
  id SERIAL PK
  project_id INT NOT NULL FK(projects) ON DELETE CASCADE
  name VARCHAR(255) NOT NULL        -- ex: "feature/new-onboarding"
  slug VARCHAR(255) NOT NULL
  description TEXT
  status VARCHAR(20) DEFAULT 'open' -- open | merged | closed
  created_by INT FK(users)
  merged_by INT FK(users)
  created_at TIMESTAMP
  updated_at TIMESTAMP
  merged_at TIMESTAMP
  UNIQUE(project_id, slug)
```

### Table modifiee : `translation_keys`

Ajouter une colonne :
```
branch_id INT FK(branches) ON DELETE CASCADE  -- nullable, NULL = main
```

- `ON DELETE CASCADE` : si une branche est supprimee, ses cles sont supprimees aussi
- La contrainte unique existante `(project_id, key_name)` reste inchangee
  → Empeche naturellement d'avoir la meme cle sur deux branches

### Tables inchangees

- `translations` : reste tel quel, liee a `translation_keys` par `key_id`
- `projects`, `project_languages`, etc. : inchanges

---

## Algorithmes

### Creer une branche

1. Inserer une ligne dans `branches` (project_id, name, slug, created_by)
2. C'est tout. Pas de copie de donnees.

### Creer une branche depuis une autre branche

1. Inserer la nouvelle branche dans `branches`
2. Copier les `translation_keys` de la branche source dans la nouvelle branche (avec le nouveau `branchId`)
3. Copier les `translations` associees a ces cles
4. Les deux branches sont ensuite independantes

### Voir les traductions d'une branche

```sql
SELECT * FROM translation_keys
WHERE project_id = ?
AND (branch_id IS NULL OR branch_id = ?)
ORDER BY key_name
```

→ Affiche les cles main + les cles de la branche. L'UI peut distinguer visuellement les cles de la branche (badge, couleur, etc.).

### Voir uniquement main

```sql
SELECT * FROM translation_keys
WHERE project_id = ? AND branch_id IS NULL
```

→ C'est le comportement actuel, juste ajouter `AND branch_id IS NULL`.

### Creer une cle sur une branche

```typescript
createTranslationKey({
  projectId,
  keyName,
  description,
  branchId, // NEW: si defini, la cle est creee sur cette branche
})
```

Si `keyName` existe deja (sur main ou une autre branche) → erreur (contrainte unique).

### Modifier une traduction (cle existante)

Pas de changement. `upsertTranslation` fonctionne tel quel. Que l'utilisateur soit "sur" une branche ou non, la modification va directement en base sur la traduction de la cle (qui est sur main).

### Merger une branche

```
1. Recuperer les cles de la branche : WHERE branch_id = ?
2. Pour chaque cle :
   a. Verifier qu'aucune cle avec le meme nom n'existe sur main
      (normalement impossible grace a la contrainte unique,
       sauf si la cle a ete creee sur main APRES la creation de la branche
       par renommage ou import)
   b. Si collision → avertir l'utilisateur (conflit create_vs_create)
3. Si pas de conflit :
   BEGIN TRANSACTION
   UPDATE translation_keys SET branch_id = NULL WHERE branch_id = ?
   UPDATE branches SET status = 'merged', merged_by = ?, merged_at = NOW() WHERE id = ?
   COMMIT
```

**Conflit possible** : theoriquement aucun grace a la contrainte unique `(project_id, key_name)`. Un conflit ne pourrait survenir que si on renomme une cle main pour lui donner le meme nom qu'une cle de branche. Dans ce cas, le merge echouerait sur la contrainte unique et on avertirait l'utilisateur.

### Fermer une branche (sans merge)

```sql
-- Les cles sont supprimees par CASCADE quand la branche est supprimee
-- (les translations associees sont aussi supprimees par CASCADE)
DELETE FROM branches WHERE id = ?
-- OU : UPDATE branches SET status = 'closed' WHERE id = ?
-- puis supprimer les cles separement
```

Option retenue : `DELETE` de la branche → cascade supprime les cles et traductions.

---

## Impact sur l'import/export

### Import

L'import ne touche que la branche specifiee. Si aucune branche n'est specifiee, on travaille sur main.

- Ajouter parametre optionnel `branchId` a `processImport`
- **Avec `branchId`** :
  - Seules les cles de cette branche sont concernees
  - Cle existante sur la branche → appliquer la strategie (OVERWRITE/SKIP)
  - Nouvelle cle → creer avec `branchId`
  - Cles sur main ou sur d'autres branches → **ignorees**
- **Sans `branchId`** (= main) :
  - Comportement actuel inchange
  - Seules les cles main (`branch_id IS NULL`) sont concernees

### Export depuis une branche

- Ajouter parametre optionnel `branch` a l'API d'export
- `GET /api/.../export?format=json&locale=fr&branch=feature-x`
- Requete : `WHERE branch_id IS NULL OR branch_id = ?`
- Si pas de parametre `branch` → export main uniquement (comportement actuel)

---

## Routes a ajouter

```
/orgs/:org/projects/:proj/branches                     -- Liste des branches
/orgs/:org/projects/:proj/branches/new                  -- Creer une branche
/orgs/:org/projects/:proj/branches/:branchSlug          -- Detail branche (liste cles)
/orgs/:org/projects/:proj/branches/:branchSlug/merge    -- Preview + merge
```

Les routes existantes de traduction restent inchangees (affichent main).
Quand on est sur une branche, on reutilise les composants existants avec le filtre branche.

---

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `drizzle/schema.ts` | Ajouter table `branches` + colonne `branchId` sur `translation_keys` |
| `drizzle/relations.ts` | Ajouter relations pour `branches` |
| `app/routes.ts` | Ajouter les routes branches |
| `app/lib/branches.server.ts` | **NOUVEAU** - CRUD branches + merge |
| `app/lib/translation-keys.server.ts` | Ajouter `branchId` aux fonctions `create` et `getTranslationKeys` |
| `app/lib/import/process-import.server.ts` | Ajouter support `branchId` |
| `app/lib/import/json.server.ts` | Passer `branchId` a `importTranslations` |
| `app/routes/api.*.export.tsx` | Ajouter parametre `branch` |
| Routes de traduction existantes | Ajouter filtre `branch_id IS NULL` pour les vues main-only |

---

## Phasage

### Phase 1 : Modele de donnees + CRUD branches
- Table `branches` dans schema.ts + colonne `branchId` sur `translation_keys`
- Relations dans relations.ts
- `branches.server.ts` : create, list, get, delete
- Routes : liste + creation de branches
- `db:push` pour appliquer le schema

### Phase 2 : Vue branche + creation de cles
- Modifier `getTranslationKeys` pour accepter un `branchId` optionnel
- Route de vue branche (reutilise composants existants)
- Creation de cle avec `branchId`
- Distinction visuelle cles main vs cles branche

### Phase 3 : Merge
- Logique de merge dans `branches.server.ts`
- Route de preview merge (liste des cles qui seront deplacees)
- Execution du merge
- Suppression de branche (fermeture)

### Phase 4 : Import/Export sur branches
- `processImport` avec `branchId`
- Export avec parametre `branch`
- UI : selecteur de branche dans import/export

### Phase 5 : Branch depuis une branche
- Copie des cles + traductions de la branche source
- UI : selecteur de branche source a la creation

---

## Verification

- Creer une branche, ajouter des cles, verifier qu'elles apparaissent dans la vue branche
- Verifier que la vue "main" ne montre pas les cles de branche
- Modifier une traduction d'une cle main depuis une branche → verifier que main est modifie
- Merger une branche → verifier que les cles passent sur main
- Fermer une branche → verifier que les cles sont supprimees
- Tenter de creer une cle avec un nom deja pris → verifier l'erreur
- Import sur une branche → nouvelles cles sur la branche, cles main ignorees
- Export depuis une branche → contient main + branche
