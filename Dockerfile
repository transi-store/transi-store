FROM node:24-alpine

WORKDIR /app

# Activer corepack pour yarn
RUN corepack enable

# Copier les fichiers de dépendances
COPY package.json yarn.lock ./
COPY .yarn ./.yarn
COPY .yarnrc.yml* ./

# Installer les dépendances
RUN yarn install --immutable

# Copier le reste du code (seulement en production)
# En dev, le code est monté via volume
COPY . .
