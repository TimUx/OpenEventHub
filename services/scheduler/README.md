# Scheduler

Creates crawl jobs for configured sources.

## Responsibilities

- On startup, load sources with `scheduleCron`
- Register BullMQ repeatable jobs on the `crawl` queue

## Probes

- `/health`, `/ready`, `/metrics`

## Configuration

| Variable                      | Purpose           |
| ----------------------------- | ----------------- |
| `REDIS_*`                     | BullMQ connection |
| `DATABASE_URL` / `POSTGRES_*` | Source schedules  |
