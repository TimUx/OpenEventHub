# Backup Strategy

Back up PostgreSQL, object storage (SeaweedFS/S3), and non-secret configuration. Test restores with a dry-run before relying on any schedule.

## What to back up

| Asset | Method |
|-------|--------|
| PostgreSQL | `pg_dump` custom format (`scripts/backup.sh`) |
| Configuration | Compose/Stack/monitoring YAML + `.env.example` snapshot |
| Object storage | S3 sync (`aws s3 sync` / rclone) against SeaweedFS S3 API |
| Uploaded / crawl objects | Included in object-storage bucket sync |

Never commit real `.env` or Swarm secret material into backup archives shared outside the ops boundary.

## Create a backup

```bash
# Compose postgres must be healthy, or set DATABASE_URL
./scripts/backup.sh
```

Archives land under `.backups/openeventhub-backup-<UTC>.tar.gz` (gitignored). Each archive contains:

- `MANIFEST.txt`
- `postgres/openeventhub.dump`
- `config/`
- `object-storage/` (listing or README with sync instructions)

Schedule via cron/systemd timer calling `scripts/backup.sh`, then copy archives off-box.

## Restore dry-run (required)

Validates archive layout and dump signature without writing to production:

```bash
npm run restore:dry-run
# or against a real archive:
BACKUP_ARCHIVE=.backups/openeventhub-backup-….tar.gz npm run restore:dry-run
```

CI runs `restore:dry-run` with a synthetic fixture.

## Full restore (operator)

1. Stop writers (API/crawler/scheduler) or put the stack in maintenance.
2. Restore Postgres: `pg_restore --clean --if-exists -d "$DATABASE_URL" postgres/openeventhub.dump`
3. Sync object storage bucket from the backup copy.
4. Redeploy Stack/Compose with the same secret names.
5. Run `npm run apps:health` / probe checks and a short crawl smoke.

Document the restore window and last successful dry-run date in your ops runbook.
