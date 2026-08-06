# Scheduler

> Language: English · [Deutsch (primary)](../SCHEDULER.md)

Default interval: every 6 hours

In Admin → Sources and on the public source submission form, the interval is chosen via a **dropdown** (no free-form cron required). Admin → Scheduler lists the same intervals in plain language (no raw cron) plus the next run time.

- manual only
- hourly
- every 6 hours
- daily (06:00 UTC)
- weekly (Monday 06:00 UTC)
- monthly (1st at 06:00 UTC)
- custom schedule (advanced: UTC cron expression)

Internally the platform still stores `schedule_cron`. For each **distinct** cron
pattern exactly **one** BullMQ repeatable job (schedule tick) is registered. On
each tick the worker crawls all enabled sources with that pattern **serially**
(one after another; crawl worker concurrency = 1). Manual “Crawl now” remains a
single-source job.

Only changed content should be processed whenever possible.

## Future events only

Crawl ingest (all plugins and AI ingest) keeps only events whose **effective end**
(`endAt`, otherwise `startAt`) is still **≥ now**. Expired candidates are dropped.

## Automatic deletion

The scheduler deletes events with an expired effective end hourly (and on startup),
cascading versions, source links, and analyses.
