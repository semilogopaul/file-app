# File App

Monorepo-style layout with a Next.js frontend, a NestJS backend, and an nginx
reverse proxy that fronts both in production. See `frontend/CLAUDE.md` and
`backend/CLAUDE.md` for each app's conventions.

## Architecture

```
internet --> nginx (TLS, security headers, rate limiting)
               |-- /            --> frontend  (Next.js, standalone server)
               '-- /api/*       --> backend   (NestJS, /api prefix stripped)
```

nginx is the only container reachable from outside the Docker host. The
frontend and backend are only reachable from each other and from nginx, over
an internal Docker network - see the `networks` section of
`docker-compose.yml`.

Because the frontend and API are served from one public origin, browser
requests to `/api/*` are same-origin - no CORS is needed for normal browser
traffic. `CORS_ORIGINS` (backend) exists for direct, non-proxied callers
(local dev, a mobile app, etc.).

## Running locally without Docker

Two terminals:

```bash
cd backend && cp .env.example .env && npm install && npm run start:dev
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Set `frontend/.env.local`'s `NEXT_PUBLIC_API_URL=http://localhost:4000`
(instead of the default `/api`) since there's no nginx in front to proxy
same-origin requests in this mode.

## Running the full stack with Docker

Requires Docker with Compose v2.

```bash
# 1. Configure each app
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production

# 2. TLS certificate - generate a throwaway one to smoke-test locally,
#    or drop real fullchain.pem/privkey.pem into nginx/certs/ instead.
./nginx/certs/generate-self-signed.sh localhost

# 3. Build and start
docker compose build
docker compose up -d

# 4. Verify (-k because the self-signed cert above isn't trusted)
curl http://localhost/healthz     # nginx's own probe endpoint - plain HTTP only, not proxied
curl -k https://localhost/api/health
curl -k https://localhost/
```

`docker compose logs -f` to tail all three services; `docker compose down`
to stop.

## Docker image notes

- Every image is a multi-stage build (deps -> build -> minimal runtime) and
  runs as a non-root user, including nginx (`nginxinc/nginx-unprivileged`,
  listening on 8080/8443 internally, mapped to 80/443 on the host).
- `frontend`/`backend`/`nginx` containers run with a **read-only root
  filesystem**; only the specific paths each process needs to write to
  (`/tmp`, Next's `.next/cache`, nginx's `/var/cache/nginx` and `/var/run`)
  are tmpfs-mounted. `no-new-privileges` is set on all three.
- Each container has its own `HEALTHCHECK`, used by `depends_on: condition:
  service_healthy` so nginx won't start routing traffic until the app
  containers are actually ready. The frontend has no API-like routes of its
  own (kept strictly presentational - the backend owns the API surface), so
  its check just confirms the Next.js server renders `/`; the backend has a
  real `GET /health` (Terminus); nginx answers its own `/healthz` directly,
  unproxied, on plain HTTP (see conf.d/default.conf).
- Real TLS certificates and `.env.production` files are never baked into an
  image or committed - see `.gitignore`.

## Going further

- **Real TLS**: add a `certbot` service to `docker-compose.yml` for
  Let's Encrypt: the HTTP-01 challenge path (`/.well-known/acme-challenge/`)
  is already reserved in `nginx/conf.d/default.conf`.
- **Stricter CSP**: the current Content-Security-Policy (see
  `nginx/snippets/security-headers.conf`) allows `'unsafe-inline'` for
  scripts/styles, which Next.js needs by default. Tightening this to a
  per-request nonce means generating the nonce in the Next.js app itself, in
  a `frontend/src/app/proxy.ts` file (Next 16's replacement for
  `middleware.ts`) rather than in nginx - see the comment in
  `nginx/snippets/security-headers.conf` and
  https://nextjs.org/docs/app/guides/content-security-policy. Move CSP
  ownership there instead of nginx if you do this, to avoid two conflicting
  headers.
