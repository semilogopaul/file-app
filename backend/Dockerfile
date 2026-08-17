# syntax=docker/dockerfile:1

# =============================================================================
# NestJS backend - production image
#
# Five stages, each with one job, so Docker's layer cache only invalidates
# what actually changed (editing src/ never re-triggers an npm install):
#
#   base                     shared foundation - pinned Node LTS on Alpine
#   dependencies             full `npm ci` (dev+prod), needed to compile
#   build                    TypeScript -> dist/
#   production-dependencies  a *separate*, clean `npm ci --omit=dev`
#   runner                   final image: dist/ + prod deps only, non-root
#
# `production-dependencies` is deliberately a fresh install rather than
# `npm prune` on the `dependencies` stage - it guarantees the shipped
# node_modules is exactly what a clean production install produces, with no
# leftover dev-only artifacts prune might miss.
#
# Bump the Node major here on a deliberate schedule (track the Node.js
# release schedule) rather than floating `:latest` or `:alpine` - a moving
# base image tag makes builds non-reproducible and CVE triage harder.
# =============================================================================

FROM node:24-alpine AS base
WORKDIR /app

# -----------------------------------------------------------------------------
FROM base AS dependencies

COPY package.json package-lock.json ./
# --ignore-scripts: none of our deps need postinstall build steps, and
# skipping them shrinks the trusted-code surface during install.
RUN npm ci --ignore-scripts

# -----------------------------------------------------------------------------
FROM base AS build

COPY package.json package-lock.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# The Prisma client is generated code (git-ignored, into src/generated), so
# it must be produced here before tsc runs. `generate` only reads the schema
# - it never contacts the database - so this stays valid at build time.
RUN npx prisma generate
RUN npm run build

# -----------------------------------------------------------------------------
# One-shot migration runner, invoked as its own short-lived Compose service
# before the API starts (see docker-compose.yml). Kept separate so the
# Prisma CLI - a devDependency worth tens of megabytes - never ships inside
# the runtime image, and so migrations are an explicit, observable step
# rather than something hidden in the API's startup path (which would race
# when more than one replica boots at once).
FROM base AS migrator

COPY package.json package-lock.json prisma.config.ts ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY prisma ./prisma

# `node` (uid 1000) ships with the official image - no need to create one.
USER node

CMD ["npx", "prisma", "migrate", "deploy"]

# -----------------------------------------------------------------------------
FROM base AS production-dependencies

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# -----------------------------------------------------------------------------
FROM node:24-alpine AS runner

ENV NODE_ENV=production \
    PORT=4000

# Fixed, explicit UID/GID rather than the next free system ID, so file
# ownership is stable and predictable across rebuilds and hosts.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

WORKDIR /app

COPY --from=production-dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --chown=nestjs:nodejs package.json ./package.json
COPY --chown=nestjs:nodejs healthcheck.js ./healthcheck.js

USER nestjs

EXPOSE 4000

# Framework-agnostic probe (plain Node http request, see healthcheck.js) -
# works the same under plain `docker run` and under Compose/Kubernetes.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "healthcheck.js"]

# Signal handling / zombie reaping is delegated to Docker Compose's `init:
# true` (see docker-compose.yml) rather than baking tini/dumb-init into the
# image - one less thing to install and patch.
CMD ["node", "dist/main.js"]
