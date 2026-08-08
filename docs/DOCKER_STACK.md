# Docker Stack (Swarm)

> Sprache: Deutsch (primär) · [English](en/DOCKER_STACK.md)

Das Production-Deployment zielt auf Docker Swarm. Die Stack-Datei ist `docker/stack/docker-stack.yml`.

## Anforderungen

- Overlay-Netzwerke (`edge`, `internal` mit `internal: true`)
- Externe Docker Secrets (siehe unten)
- Configs (`postgres_init_extensions`)
- Rolling Updates mit Rollback (`start-first`, `failure_action: rollback`)
- Placement Constraints (`oeh.storage=true` für Postgres und SeaweedFS)
- Ressourcenlimits auf jedem Service
- Images aus GHCR (`ghcr.io/<owner>/openeventhub-<service>:<version>`)
- Host-Ports nur an Traefik (HTTP/HTTPS); Worker und Datenspeicher bleiben internal-only

## Validieren ohne Swarm

```bash
npm run validate:stack
```

## Secrets bootstrapen

```bash
docker swarm init   # once
docker node update --label-add oeh.storage=true <node-id>
./scripts/stack-init-secrets.sh
```

Erzeugte Secrets: `postgres_password`, `redis_password`, `s3_secret_key`, `auth_jwt_secret`, `settings_encryption_key`, `database_url`.

NestJS-Services laden `/run/secrets/*` über `docker/scripts/load-secrets-entrypoint.sh` (Image-ENTRYPOINT).

## Deploy

```bash
export SERVICE_VERSION=0.20.1
export GITHUB_OWNER=timux   # GHCR namespace
docker stack deploy -c docker/stack/docker-stack.yml openeventhub
# Optional: gebündeltes Ollama (sonst externes Ollama wie Compose mit OLLAMA_DEPLOY=0)
# docker stack deploy -c docker/stack/docker-stack.yml -c docker/stack/docker-stack.ollama.yml openeventhub
# Mit GPU: zusätzlich docker/stack/docker-stack.ollama-gpu.yml
docker stack services openeventhub
```

Traefik veröffentlicht HTTP/HTTPS auf dem Manager und routet:

- `api.${DOMAIN}` → API
- `${DOMAIN}` / `www.${DOMAIN}` → frontend
- `admin.${DOMAIN}` → admin

## Rolling Updates

`update_config` nutzt Parallelität 1, `start-first` und automatischen Rollback bei Fehler. Replica-Counts überschreiben mit `API_REPLICAS`, `FRONTEND_REPLICAS`, `CRAWLER_REPLICAS`.

## Lokale Alternative

Development und CI nutzen Docker Compose (`docs/DOCKER_COMPOSE.md`). Stack ist der Production-Pfad.
