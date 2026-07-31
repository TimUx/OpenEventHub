# Developer Guide

## Principles

- Clean Architecture
- SOLID
- Domain Driven Design
- Test First where practical
- Small independent services
- API First
- Plugin First
- Container First (no host runtime dependency for the platform)

## Repository Layout

```
architecture/   Architecture Decision Records
docker/         Compose, Stack, Traefik/Postgres assets
docs/           Binding documentation
packages/       Shared libraries (npm workspaces)
services/       One directory per deployable container
plugins/        Source connectors (SDK-based)
prompts/        Centralized LLM prompts
scripts/        Bootstrap and ops helpers
```

Each service owns its domain and communicates through APIs or queues
(`docs/COMMUNICATION.md`).

## Local infrastructure

```bash
cp .env.example .env
npm run infra:bootstrap
```

Contributor tooling (lint/test) uses Node 20+; the platform itself runs in Docker.

## Shared contracts

`@openeventhub/shared` defines:

- Service name constants (`docs/CONTAINERS.md`)
- Queue name constants (`docs/QUEUE_AND_WORKERS.md`)
- Health / readiness payload helpers (`docs/HEALTHCHECKS.md`)

## Milestone process

Follow `docs/ROADMAP.md`. Do not start the next milestone until the current
one meets its exit criteria (code, tests, docs, review).
