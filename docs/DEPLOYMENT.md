# Deployment

> Sprache: Deutsch (primär) · [English](en/DEPLOYMENT.md)

## Development

Docker Compose: infra + apps Overlays. Siehe `docs/DOCKER_COMPOSE.md`.

```bash
cp .env.example .env
npm run infra:bootstrap
bash scripts/db-migrate.sh && bash scripts/db-seed.sh
npm run apps:up
npm run apps:health
```

Host veröffentlicht nur Traefik (Frontend/Admin/API über Host-Header). Optionales Monitoring-Overlay: `docs/MONITORING.md`.

## Production

Docker Swarm Stack: `docs/DOCKER_STACK.md`.

1. Images bauen/veröffentlichen (CI-Release auf `v*`-Tags → GHCR) oder lokal bauen und retaggen.
2. `./scripts/stack-init-secrets.sh`
3. `docker stack deploy -c docker/stack/docker-stack.yml openeventhub`
4. Traefik-Routen und `/health` auf API-Replicas prüfen.
5. Monitoring aktivieren und `scripts/backup.sh` einplanen.

## Service-Vertrag

Jeder Nest-Service stellt bereit:

- Healthcheck (`/health`, `/ready`)
- Metrics-Endpoint (`/metrics`)
- Strukturiertes Logging (Pino über service-runtime)
- Umgebungsbasierte Konfiguration (Swarm Secrets werden vom Entrypoint in Env geladen)
- Ressourcenlimits in den Stack-Deploy-Specs

Frontends (Next.js) exponieren HTTP-Health über Container-HEALTHCHECK und Traefik-Routing.
