# Cas spécifique en cas d'une seule organisation.

## Contexte

Actuellement, on utilise docker-compose + docker pour gérer la base de données PostgreSQL en développement.
On a besoin de nodejs + yarn sur la machine de développement pour lancer l'application.

## Besoin

On va tout migrer dans des conteneurs Docker pour que les développeurs n'aient besoin que de Docker d'installé sur leur machine, et que l'on puisse utiliser le même système pour le déploiement en production.

## Specification

Il faut que l'utilisation soit la plus simple possible et que l'on puisse facilement lancer des commande yarn.
Idéalement, les développeurs n'ont pas besoin de savoir que l'application tourne dans des conteneurs Docker.

## Contraintes

Tu dois toujours lire le fichier README.md et les décisions techniques précédentes.
