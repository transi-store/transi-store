# Proposer des traductions avec une IA générative

## Besoin

Présentement on est obligé de supprimer la clé de trad pour la corriger. Il faudrait pouvoir modifier la clé directement (avec petit icon pen)

## Specification

Sur la page `/orgs/mapado/projects/desk/keys/12`, ajouter un icône "crayon" à côté de la clé de traduction.
Au clic sur l'icône, afficher une modale qui permet de modifier la clé de traduction. La valeur du champ doit être pré-remplie avec la clé actuelle.
On va aussi déplacer la description de la clé dans cette modale pour pouvoir la modifier en même temps et limiter la surcharge visuelle sur la page principale.

La modale doit contenir les éléments suivants :

- Un champ texte pour modifier la clé de traduction
- Un champ "textarea" pour modifier la description de cette clé
- Un bouton "Annuler" pour fermer la modale sans enregistrer les modifications
- Un bouton "Enregistrer" pour valider les modifications
