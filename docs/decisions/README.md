# Architecture Decision Records (ADR)

## Qu'est-ce qu'un ADR ?

Un ADR (Architecture Decision Record) est un document qui capture une décision architecturale importante, ainsi que son contexte et ses conséquences.

## Quand créer un ADR ?

Créez un ADR pour **toute décision technique importante** :

- ✅ Choix d'une bibliothèque ou framework
- ✅ Modifications du système de design ou thème
- ✅ Changements d'architecture
- ✅ Décisions impactant la structure de la base de code
- ✅ Choix de patterns ou conventions
- ✅ Migration vers une nouvelle version majeure

**Ne créez PAS d'ADR pour** :
- ❌ Corrections de bugs simples
- ❌ Refactorings mineurs
- ❌ Changements de configuration évidents

## Format d'un ADR

Utilisez le template suivant :

```markdown
# ADR-XXX : [Titre court et descriptif]

**Date** : YYYY-MM-DD

**Statut** : [Proposé | Accepté | Rejeté | Déprécié | Remplacé par ADR-YYY]

## Contexte

[Décrivez le problème ou la situation qui nécessite une décision]

## Décision

[Décrivez la décision prise de manière claire et concise]

### Détails d'implémentation (optionnel)

[Si nécessaire, ajoutez des détails techniques sur l'implémentation]

## Raisons

[Listez les raisons principales qui justifient cette décision]

1. Raison 1
2. Raison 2
3. ...

## Alternatives considérées

[Listez les autres options envisagées et pourquoi elles n'ont pas été retenues]

1. **Alternative 1** : Pourquoi rejetée
2. **Alternative 2** : Pourquoi rejetée

## Conséquences

### Positives
- Conséquence positive 1
- Conséquence positive 2

### Négatives
- Conséquence négative 1
- Conséquence négative 2

## Fichiers créés/modifiés

[Listez les principaux fichiers affectés par cette décision]

## Références

[Liens vers la documentation, articles, discussions qui ont influencé la décision]
```

## Processus

1. **Créer** : Créez un nouveau fichier `ADR-XXX-nom-descriptif.md` dans ce dossier
   - XXX = numéro séquentiel (regardez le dernier ADR existant)
   - nom-descriptif = slug décrivant la décision

2. **Documenter** : Remplissez le template avec toutes les informations pertinentes

3. **Référencer** : Ajoutez un résumé dans le `README.md` principal du projet

4. **Commit** : Commitez l'ADR en même temps que le code implémentant la décision

## Liste des ADR

| Numéro | Titre | Date | Statut |
|--------|-------|------|--------|
| [ADR-001](../../README.md#adr-001--stack-technique) | Stack technique | - | Accepté ✅ |
| [ADR-002](../../README.md#adr-002--multi-tenant-avec-organisations) | Multi-tenant avec organisations | - | Accepté ✅ |
| [ADR-003](./ADR-003-icones-react-icons.md) | Ajout d'icônes avec react-icons | 2026-01-23 | Accepté ✅ |
| [ADR-004](./ADR-004-theme-couleurs-mapado.md) | Thème personnalisé avec les couleurs Mapado | 2026-01-23 | Accepté ✅ |
| [ADR-005](./ADR-005-import-traductions-json.md) | Import de traductions depuis fichiers JSON | 2026-01-23 | Accepté ✅ |
| [ADR-006](./ADR-006-cles-api-export.md) | Clés d'API pour l'export de données | 2026-01-23 | Accepté ✅ |

## Références

- [Architecture Decision Records](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
