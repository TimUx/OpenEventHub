# Docker Stack (Swarm)

> Language: English · [Deutsch (primary)](../DOCKER_STACK.md)

Production deployment targets Docker Swarm. The stack file is `docker/stack/docker-stack.yml`.

## Requirements

- Overlay networks (`edge`, `internal` with `internal: true`)
- External Docker secrets (see below)
- Configs (`postgres_init_extensions`)
- Rolling updates with rollback (`start-first`, `failure_action: rollback`)
- Placement constraints (`oeh.storage=true` for Postgres and SeaweedFS)
- Resource limits on every service
- Images from GHCR (`ghcr.io/<owner>/openeventhub-<service>:<version>`)
- Host ports on Traefik only (HTTP/HTTPS); workers and data stores stay internal-only

## Validate without Swarm

```bash
npm run validate:stack
```

## Bootstrap secrets

```bash
docker swarm init   # once
docker node update --label-add oeh.storage=true <node-id>
./scripts/stack-init-secrets.sh
```

Secrets created: `postgres_password`, `redis_password`, `s3_secret_key`, `auth_jwt_secret`, `settings_encryption_key`, `database_url`.

NestJS services load `/run/secrets/*` via `docker/scripts/load-secrets-entrypoint.sh` (image ENTRYPOINT).

## Deploy

```bash
export SERVICE_VERSION=0.20.1
export GITHUB_OWNER=timux   # GHCR namespace
docker stack deploy -c docker/stack/docker-stack.yml openeventhub
# Optional: bundled Ollama (otherwise use external Ollama like Compose with OLLAMA_DEPLOY=0)
# docker stack deploy -c docker/stack/docker-stack.yml -c docker/stack/docker-stack.ollama.yml openeventhub
# With GPU: also add docker/stack/docker-stack.ollama-gpu.yml
docker stack services openeventhub
```

Traefik publishes HTTP/HTTPS on the manager and routes:

- `api.${DOMAIN}` → API
- `${DOMAIN}` / `www.${DOMAIN}` → frontend
- `admin.${DOMAIN}` → admin

## Rolling updates

`update_config` uses parallelism 1, `start-first`, and automatic rollback on failure. Override replica counts with `API_REPLICAS`, `FRONTEND_REPLICAS`, `CRAWLER_REPLICAS`.

## Local alternative

Development and CI use Docker Compose (`docs/DOCKER_COMPOSE.md`). Stack is the production path.
