# syntax=docker/dockerfile:1

# =============================================================================
# Next.js frontend - production image
#
# Stages:
#   base       shared foundation - pinned Node LTS on Alpine
#   deps       full `npm ci`, needed to compile
#   builder    `next build` with output: "standalone" (next.config.ts)
#   runner     final image: only the traced standalone server + static
#              assets - no source, no full node_modules, no package manager
#
# "standalone" output makes the runner stage self-contained: Next traces
# exactly which files/deps each route needs and copies just those into
# .next/standalone, so the runner never has to `npm install` at all.
#
# Bump the Node major here on a deliberate schedule (track the Node.js
# release schedule) rather than floating `:latest` or `:alpine` - a moving
# base image tag makes builds non-reproducible and CVE triage harder.
# =============================================================================

FROM node:24-alpine AS base
WORKDIR /app

# -----------------------------------------------------------------------------
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# -----------------------------------------------------------------------------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# -----------------------------------------------------------------------------
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Fixed, explicit UID/GID rather than the next free system ID, so file
# ownership is stable and predictable across rebuilds and hosts.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Public assets and static chunks are not part of the traced standalone
# output by design (Next expects a CDN to serve them) - copy them in
# manually, as documented in the Next.js "output: standalone" guide.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs healthcheck.js ./healthcheck.js

USER nextjs

EXPOSE 3000

# Framework-agnostic probe (plain Node http request, see healthcheck.js) -
# works the same under plain `docker run` and under Compose/Kubernetes.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "healthcheck.js"]

# Signal handling / zombie reaping is delegated to Docker Compose's `init:
# true` (see docker-compose.yml) rather than baking tini/dumb-init into the
# image - one less thing to install and patch.
CMD ["node", "server.js"]
