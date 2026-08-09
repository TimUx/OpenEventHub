# worker

OpenEventHub background worker.

- Runtime: NestJS + `@openeventhub/service-runtime`
- Probes: `/health`, `/ready`, `/metrics`
- Default port: `3002`
- Queues: **Geocoding** (Nominatim → `venues` / `regions` latitude/longitude)

See `docs/GEOCODING.md`.
