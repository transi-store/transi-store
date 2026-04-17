# Cas spécifique en cas d'une seule organisation.

## Contexte

Actuellement, la rechercher est basique (like "%%" en SQL). On a besoin d'une recherche plus avancée pour retrouver des traductions.

## Besoin

On a besoin d'avoir une recherche floue (fuzzy search) qui permet de retrouver des traductions même si l'on ne connait pas exactement le texte recherché.
Les résultats de la recherche doivent être classés par pertinence.

## Specification

Si postgresql supporte la recherche floue, alors on l'utilisera. Sinon, il faudra probablement implémenter un petit alogrithme de tokenisation pour stocker les tokens dans une table et faire des recherches dessus.

## Contraintes

Tu dois toujours lire le fichier README.md et les décisions techniques précédentes.
