# ======================================
# Stage 1: Base - Install dependencies
# ======================================
FROM node:24-alpine AS base

# Enable Corepack for Yarn Berry
RUN corepack enable

WORKDIR /app

# Copy package files and Yarn configuration
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies (immutable for reproducibility)
RUN yarn install --immutable

# ======================================
# Stage 2: Development
# ======================================
FROM base AS development

# Install additional tools if needed
RUN apk add --no-cache git

# Expose Vite dev server port
EXPOSE 5176

# Development command (will be overridden by docker-compose)
CMD ["yarn", "dev", "--host", "0.0.0.0", "--port", "5176"]

# ======================================
# Stage 3: Build
# ======================================
FROM base AS build

# Copy entire source code
COPY . .

# Build the application
RUN yarn build

# ======================================
# Stage 4: Production
# ======================================
FROM base AS production

# Copy built application from build stage
COPY --from=build /app/build ./build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose production server port
EXPOSE 3000

# Production command
CMD ["yarn", "start"]
