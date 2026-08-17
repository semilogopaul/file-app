# Thin wrappers so the dev overlay is never forgotten. Running a bare
# `docker compose up -d <service>` recreates that service's dependencies
# from docker-compose.yml alone, which silently drops the host-published
# Postgres port that local development relies on.

COMPOSE      := docker compose
COMPOSE_DEV  := docker compose -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: dev-infra dev-down prod-up prod-down logs migrate test lint

## Start the datastores with host ports published, for running the apps locally.
dev-infra:
	$(COMPOSE_DEV) up -d postgres minio minio-init migrate

## Full containerised stack (production topology).
prod-up:
	$(COMPOSE) up -d

prod-down:
	$(COMPOSE) down

## Stop everything, including datastores. Add ARGS=-v to discard data.
dev-down:
	$(COMPOSE_DEV) down $(ARGS)

logs:
	$(COMPOSE) logs -f

migrate:
	$(COMPOSE_DEV) run --rm migrate

test:
	npm run test

lint:
	npm run lint && npm run typecheck
