# ADR-010 : Recherche floue avec PostgreSQL pg_trgm

**Date** : 2026-01-25

**Statut** : Accepté ✅

## Contexte

La recherche actuelle dans transi-store utilise un simple pattern matching SQL (`LIKE '%pattern%'`) qui présente plusieurs limitations :

- Pas de tolérance aux fautes de frappe
- Pas de classement par pertinence des résultats
- Nécessite une correspondance exacte de la sous-chaîne
- Mauvaise performance sur de grandes tables

Les utilisateurs doivent connaître exactement le texte recherché pour trouver des traductions, ce qui réduit l'utilisabilité de la recherche globale.

## Décision

Utilisation de l'extension PostgreSQL **pg_trgm** (trigram) pour implémenter une recherche floue avec classement par pertinence.

### Détails d'implémentation

1. **Extension PostgreSQL** : Activation de `pg_trgm` qui fournit :
   - `similarity(text, text)` : calcule la similarité entre deux textes (0-1)
   - `word_similarity(text, text)` : similarité au niveau des mots
   - Support des index GIN pour des performances optimales

2. **Index GIN** : Création d'index trigram sur :
   - `translation_keys.key_name`
   - `translation_keys.description`
   - `translations.value`

   **Note** : Les index GIN ne sont pas gérés par Drizzle ORM directement (limitation de l'outil).
   Un script `scripts/enable-fuzzy-search.sh` permet de créer l'extension et les index.
   Commande : `yarn db:setup-search`

3. **Algorithme de recherche** :
   - Calcul du score de similarité pour chaque résultat
   - Seuil minimum de similarité : 0.1 (configurable)
   - Tri des résultats par score décroissant
   - Utilisation de `GREATEST(similarity(), word_similarity())` pour le meilleur score

4. **API** : Ajout d'un champ `similarity` dans `SearchResult` pour permettre l'affichage du score de pertinence

## Raisons

1. **Natif PostgreSQL** : Pas de dépendance externe (Elasticsearch, Algolia, etc.)
2. **Performance** : Les index GIN offrent d'excellentes performances
3. **Tolérance aux fautes** : Trouve "tranlation" même si l'utilisateur cherche "translation"
4. **Simplicité** : Pas besoin d'infrastructure supplémentaire
5. **Coût** : Gratuit, inclus dans PostgreSQL
6. **Maintenance** : Moins de complexité opérationnelle

## Alternatives considérées

1. **Elasticsearch / OpenSearch** :
   - ❌ Complexité d'infrastructure (serveur supplémentaire)
   - ❌ Synchronisation des données nécessaire
   - ❌ Coût opérationnel plus élevé
   - ✅ Meilleure performance sur très gros volumes

2. **Algolia / Meilisearch** :
   - ❌ Service externe ou serveur supplémentaire
   - ❌ Coût potentiel
   - ✅ Interface de recherche très avancée

3. **Tokenisation custom** :
   - ❌ Beaucoup de code à maintenir
   - ❌ Moins performant que pg_trgm
   - ❌ Réinventer la roue

4. **PostgreSQL Full-Text Search (tsvector)** :
   - ❌ Moins flexible pour la recherche floue
   - ❌ Nécessite une configuration de langue
   - ✅ Bon pour la recherche par mots-clés exacts

## Conséquences

### Positives

- ✅ Recherche beaucoup plus intuitive et tolérante aux erreurs
- ✅ Résultats classés par pertinence
- ✅ Aucune infrastructure supplémentaire
- ✅ Performances excellentes grâce aux index GIN
- ✅ Code simple et maintenable
- ✅ Fonctionne dans toutes les langues sans configuration

### Négatives

- ⚠️ Nécessite PostgreSQL (déjà utilisé, donc pas un problème)
- ⚠️ Extension pg_trgm doit être disponible (standard dans la plupart des installations)
- ⚠️ Peut être moins performant qu'Elasticsearch sur des millions de résultats (pas notre cas d'usage actuel)

## Fichiers créés/modifiés

- `scripts/enable-fuzzy-search.sh` : Script pour activer pg_trgm et créer les index GIN
- `app/lib/search.server.ts` : Remplacement du LIKE par similarity() et ajout du scoring
- `drizzle/schema.ts` : Commentaires documentant les index GIN (créés via script)
- `package.json` : Ajout du script `db:setup-search`
- `README.md` : Documentation du processus d'installation
- `docs/decisions/ADR-010-fuzzy-search.md` : Ce document

## Références

- [PostgreSQL pg_trgm documentation](https://www.postgresql.org/docs/current/pgtrgm.html)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Trigram matching explained](https://www.postgresql.org/docs/current/pgtrgm.html#PGTRGM-FUNCS-OPS)
