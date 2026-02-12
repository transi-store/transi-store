FROM node:24-alpine

WORKDIR /app

# Activer corepack pour yarn
RUN corepack enable

# Copier les fichiers de dépendances et les workspaces
COPY package.json yarn.lock ./
COPY .yarn ./.yarn
COPY .yarnrc.yml* ./

# Copier le reste du code (seulement en production)
# En dev, le code est monté via volume
COPY . .

# Installer les dépendances
RUN yarn install --immutable

# Garder le conteneur actif en arrière-plan
CMD ["tail", "-f", "/dev/null"]