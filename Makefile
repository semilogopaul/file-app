# istore - common tasks.
#
# The compose invocations are wrapped because a bare
# `docker compose up -d <service>` recreates that service's dependencies from
# docker-compose.yml alone, which silently drops the host-published Postgres
# port that local development relies on.

COMPOSE     := docker compose
COMPOSE_DEV := docker compose -f docker-compose.yml -f docker-compose.dev.yml

.DEFAULT_GOAL := help

.PHONY: help setup up down logs ps seed hooks install dev-infra dev-down migrate test lint clean

## Show available targets.
help:
	@grep -B1 -E '^[a-z-]+:' $(MAKEFILE_LIST) \
	  | grep -A1 '^##' \
	  | sed -e 's/^## //' -e 's/:.*//' \
	  | paste -d '|' - - \
	  | awk -F'|' '{printf "  \033[36m%-12s\033[0m %s\n", $$2, $$1}'

## Create .env files and a TLS certificate. Run once, before `make up`.
setup:
	@./scripts/bootstrap.sh

## Build and start the whole stack, then wait until it is serving.
up: setup
	$(COMPOSE) build
	$(COMPOSE) up -d
	@printf 'Waiting for the stack to become healthy'
	@for i in $$(seq 1 60); do \
	  if curl -sk -o /dev/null https://localhost/ 2>/dev/null; then \
	    printf '\n\033[32m✓ istore is running at https://localhost\033[0m\n'; \
	    printf '  The TLS certificate is self-signed, so your browser will warn once.\n'; \
	    exit 0; \
	  fi; \
	  printf '.'; sleep 2; \
	done; \
	printf '\n\033[31m✗ Timed out. Check: make logs\033[0m\n'; exit 1

## Create the demo account (run after `make up`).
seed:
	@./scripts/seed.sh

## Stop the stack. Add ARGS=-v to also discard database and file storage.
down:
	$(COMPOSE) down $(ARGS)

## Tail logs from every service.
logs:
	$(COMPOSE) logs -f

## Show container status.
ps:
	$(COMPOSE) ps

## Enable the version-controlled git hooks (once per clone).
hooks:
	git config core.hooksPath .githooks
	@echo "git hooks enabled (.githooks)"

## Install dependencies for both apps (only needed to work on the code).
install:
	npm --prefix backend install
	npm --prefix frontend install

## Start only the datastores, with host ports published, for local dev.
dev-infra:
	$(COMPOSE_DEV) up -d postgres minio minio-init migrate

## Stop everything including datastores.
dev-down:
	$(COMPOSE_DEV) down $(ARGS)

## Apply pending database migrations.
migrate:
	$(COMPOSE_DEV) run --rm migrate

## Run both apps' unit tests.
test:
	npm --prefix backend run test
	npm --prefix frontend run test

## Lint and typecheck both apps - the same checks the pre-commit hook runs.
lint:
	npm --prefix backend run lint:check
	npm --prefix frontend run lint
	npm --prefix backend run typecheck
	npm --prefix frontend run typecheck

## Remove containers, volumes and generated local files.
clean:
	$(COMPOSE) down -v
	rm -f backend/.env.production frontend/.env.production
	rm -f nginx/certs/fullchain.pem nginx/certs/privkey.pem
