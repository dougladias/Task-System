# Multi-stage build for NestJS API Gateway
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy the entire monorepo for dependency resolution
COPY package*.json ./
COPY turbo.json ./
COPY packages ./packages

# Copy specific service package.json
COPY app/api-gateway/package*.json ./app/api-gateway/

# Install dependencies
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY app/api-gateway ./app/api-gateway

# Build the application
WORKDIR /app/app/api-gateway
RUN npm run build

# Production image, copy all the files and run nest
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/app/api-gateway/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/app/api-gateway/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/app/api-gateway/package*.json ./

USER nestjs

EXPOSE 3001

ENV PORT=3001

# Development stage
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY app/api-gateway ./app/api-gateway

WORKDIR /app/app/api-gateway
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# Production command
FROM runner AS production
CMD ["node", "dist/main"]