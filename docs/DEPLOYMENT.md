# Deployment

## Development

Docker Compose: infra + apps overlays. See `docs/DOCKER_COMPOSE.md`.

```bash
cp .env.example .env
npm run infra:bootstrap
npm run apps:up
npm run apps:health
```

Optional monitoring overlay: `docs/MONITORING.md`.

## Production

Docker Swarm stack: `docs/DOCKER_STACK.md`.

1. Build/publish images (CI release on `v*` tags → GHCR) or build locally and retag.
2. `./scripts/stack-init-secrets.sh`
3. `docker stack deploy -c docker/stack/docker-stack.yml openeventhub`
4. Verify Traefik routes and `/health` on API replicas.
5. Enable monitoring and schedule `scripts/backup.sh`.

## Service contract

Each Nest service provides:

- Healthcheck (`/health`, `/ready`)
- Metrics endpoint (`/metrics`)
- Structured logging (Pino via service-runtime)
- Environment-based configuration (Swarm secrets loaded into env by entrypoint)
- Resource limits in Stack deploy specs

Frontends (Next.js) expose HTTP health via container HEALTHCHECK and Traefik routing.
