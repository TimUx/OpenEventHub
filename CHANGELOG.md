# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-31

### Added

- Monorepo foundation with npm workspaces and shared TypeScript baseline
- `@openeventhub/shared` contracts (service names, queues, health payloads)
- Docker Compose infrastructure: Traefik, PostgreSQL, Redis, MinIO
- Docker Stack (Swarm) skeleton with secrets/placement placeholders
- Bootstrap and infrastructure health scripts
- Containerized Node 22 tooling (`scripts/run-in-node.sh`, `npm run tools:*`)
- GitHub Actions CI (lint, typecheck, tests, compose validation)
- Cursor rules enforcing documentation-driven development
- ADR 0001: Monorepo & container-first foundation
- Detailed milestone roadmap (`docs/ROADMAP.md`)
- Apache-2.0 license, contributing guide, environment template
