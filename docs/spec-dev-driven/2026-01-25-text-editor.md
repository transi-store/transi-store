# Cas spécifique en cas d'une seule organisation.

## Contexte

Actuellement, l'éditeur de traduction est très basique. On a besoin d'un éditeur de texte plus avancé pour éditer les traductions.

## Besoin

On a besoin d'un éditeur de texte riche pour éditer les traductions, avec les fonctionnalités suivantes :

- Support du ICU message format (Voir https://messageformat.github.io/messageformat/guide/)
- Coloration syntaxique des éléments variables de traduction (ex: {username}, {count, plural, one {...} other {...}}, etc.)
- Validation en temps réel de la syntaxe ICU
- Aperçu du rendu final de la traduction avec des exemples de données

## Specification

On utilisera un editeur connu du marché comme Monaco Editor (utilisé dans VSCode) ou CodeMirror.
Si jamais on arrive a trouver un package qui traite le ICU et les variables comme un langage a part entière, on l'utilisera pour avoir la coloration syntaxique et la validation. Sinon il faudra surement créer un parser pour générer les "tokens" pour l'éditeur.

## Contraintes

Tu dois toujours lire le fichier README.md et les décisions techniques précédentes.
