# Scheduler

Creates crawl jobs for configured sources.

## Responsibilities

- On startup, load sources with `scheduleCron`
- Register **one** BullMQ repeatable job per distinct cron (schedule tick)
- On each tick, the crawler processes matching sources **serially**

## Probes

- `/health`, `/ready`, `/metrics`

## Configuration

| Variable                      | Purpose           |
| ----------------------------- | ----------------- |
| `REDIS_*`                     | BullMQ connection |
| `DATABASE_URL` / `POSTGRES_*` | Source schedules  |
