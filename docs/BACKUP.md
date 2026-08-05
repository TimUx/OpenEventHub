# Backup-Strategie

> Sprache: Deutsch (primär) · [English](en/BACKUP.md)

PostgreSQL, Objektspeicher (SeaweedFS/S3) und nicht-geheime Konfiguration sichern. Restores vor dem Verlassen auf einen Zeitplan mit einem Dry-Run testen.

## Was sichern

| Asset | Methode |
|-------|---------|
| PostgreSQL | `pg_dump` Custom-Format (`scripts/backup.sh`) |
| Konfiguration | Compose-/Stack-/Monitoring-YAML + Snapshot von `.env.example` |
| Objektspeicher | S3-Sync (`aws s3 sync` / rclone) gegen die SeaweedFS-S3-API |
| Upload-/Crawl-Objekte | Enthalten im Objektspeicher-Bucket-Sync |

Niemals echte `.env`- oder Swarm-Secret-Inhalte in Backup-Archive schreiben, die die Ops-Grenze verlassen.

## Backup erstellen

```bash
# Compose-Postgres muss healthy sein, oder DATABASE_URL setzen
./scripts/backup.sh
```

Archive landen unter `.backups/openeventhub-backup-<UTC>.tar.gz` (gitignored). Jedes Archiv enthält:

- `MANIFEST.txt`
- `postgres/openeventhub.dump`
- `config/`
- `object-storage/` (Listing oder README mit Sync-Anleitung)

Zeitplan über cron/systemd-Timer, der `scripts/backup.sh` aufruft; Archive anschließend off-box kopieren.

## Restore-Dry-Run (pflicht)

Prüft Archivlayout und Dump-Signatur, ohne in Production zu schreiben:

```bash
npm run restore:dry-run
# oder gegen ein echtes Archiv:
BACKUP_ARCHIVE=.backups/openeventhub-backup-….tar.gz npm run restore:dry-run
```

CI führt `restore:dry-run` mit einem synthetischen Fixture aus.

## Vollständiger Restore (Operator)

1. Writer stoppen (API/Crawler/Scheduler) oder Stack in Maintenance setzen.
2. Postgres wiederherstellen: `pg_restore --clean --if-exists -d "$DATABASE_URL" postgres/openeventhub.dump`
3. Objektspeicher-Bucket aus der Backup-Kopie synchronisieren.
4. Stack/Compose mit denselben Secret-Namen erneut deployen.
5. `npm run apps:health` / Probe-Checks und einen kurzen Crawl-Smoke ausführen.

Restore-Fenster und Datum des letzten erfolgreichen Dry-Runs im Ops-Runbook dokumentieren.
