# Specs

`specs/` contient des briefs d'execution pour une demande ou une feature. Ce dossier remplace l'ancien `docs/spec-dev-driven/`.

## Ce que ce dossier contient

- `feature-briefs/` : briefs dates ou demandes de fonctionnalites
- `TEMPLATE.md` : point de depart pour les nouveaux briefs

## Ce que ce dossier ne remplace pas

`specs/` n'est pas la source de verite technique du projet.

Les regles stables d'architecture, d'authentification, de routage, de schema de base, de patterns de code, d'OpenAPI, et de documentation restent dans `docs/technical-notes/`.

## Regles

1. Commencer par lire `docs/technical-notes/README.md`.
2. Citer explicitement les notes techniques pertinentes dans chaque brief.
3. Garder les briefs orientes execution : contexte, but, fichiers touches, contraintes, criteres d'acceptation, validation.
4. Ne pas recopier toute la documentation technique dans le brief.
5. Mettre a jour un brief existant quand il couvre deja la meme demande au lieu de creer un doublon flou.

## Heritage

Les fichiers provenant de `docs/spec-dev-driven/` ont ete deplaces dans `specs/feature-briefs/` tels quels. Ils restent utiles comme historique de demandes ou point de depart, meme si leur structure n'est pas encore normalisee.
