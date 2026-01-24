# Cas spécifique en cas d'une seule organisation.

## Contexte

Actuellement, la page d'accueil du site amène sur la liste des organisation

## Besoin

Dans la plupart des cas, on aura une et une seule organisation (c'est le cas le plus courant).
On a donc besoin de limiter l'accès à la liste des organisations dans deux cas spécifique :

- le rare cas ou l'on a plusieurs organisation
- le cas après connexion ou l'on n'a aucune organisation

## Specification

La page d'accueil doit, dans le cas ou l'on a une seule organisation, amener directement au détail de cette organisation.
Dans le menu principal, le lien "organisation" est trop mis en avant : on va créer plutôt un menu déroulant là ou on affiche le nom d'utilisateur dans lequel on va regrouper :

- la deconnexion en bas
- un lien "mes organisation" qui amène sur la page "/orgs"
- on ajoutera plus tard le paramétrage du compte utilisateur dans ce menu

Dans le menu principal, on va ajouter un liens "projets" entre le lien "transi-store" et le lien "recherche" qui doit amener sur la liste des projets de la dernière organisation sélectionnée. Pour garder l'identifiant de cette organisation, on va ajouter son "id" dans la table "user". La valeur peut évidemment être nul dans le cas où l'utilisateur n'a pas encore choisi d'organisation. Si la valeur est nul, alors le lien "projets" est masqué.

## Contraintes

Tu dois toujours lire le fichier README.md et les décisions techniques précédentes.
