# Proposer des traductions avec une IA générative

## Besoin

On a besoin de pouvoir traduire automatiquement des clés de traduction en utilisant une IA générative (ex: Gemini, GPT, etc.).

## Specification

On va créer une nouvelle action sur la page de gestion des clés de traduction qui permettra de générer une traduction automatique pour une clé donnée dans une langue cible.

L'action fera appel à un service d'IA générative via une API (ex: OpenAI, Google Gemini, etc.) en lui fournissant le contexte nécessaire :

- Le texte source à traduire
- La langue source
- La langue cible
- Le format ICU attendu

L'IA générative retournera la traduction proposée, qui sera affichée à l'utilisateur pour qu'il puisse l'accepter ou la modifier avant de l'enregistrer.
L'IA peut proposer plusieurs solutions de traduction que l'utilisateur pourra choisir.

Si on dispose déjà de plusieurs langues (ex: anglais et français), alors on donnera en entrée les deux langues afin d'éviter les erreurs de contexte.

On doit pouvoir activer différents services IA.
Les services seront configurables au niveau de l'organisation via des clés API que l'utilisateur devra génerer lui-même et fournir dans l'interface.
