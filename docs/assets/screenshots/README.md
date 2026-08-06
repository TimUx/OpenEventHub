# UI-Screenshots

> Sprache: Deutsch (primär)

Beispielaufnahmen von Frontend und Admin Center mit Demo-Daten (München), flaches UI.

Akzentfarben und Light/Dark im Portal-Header als Icon-Buttons; Event-Aktionen (Karte / Kalender); Brand-Mark; SEO/PWA-fähiges Portal mit Bottom-Navigation auf schmalen Viewports.

## Frontend

| Datei | Inhalt |
|-------|--------|
| `frontend-home.png` | Startseite (Desktop) |
| `frontend-home-mobile.png` | Startseite (Smartphone, Bottom-Nav) |
| `frontend-events.png` | Veranstaltungsliste |
| `frontend-event-detail.png` | Veranstaltungsdetail |
| `frontend-calendar.png` | Kalender |
| `frontend-map.png` | Karte mit Markern/Filtern |
| `frontend-submit.png` | Öffentliche Einreichung |
| `frontend-search.png` | Suche |

## Admin Center

| Datei | Inhalt |
|-------|--------|
| `admin-login.png` | Login |
| `admin-dashboard.png` | Dashboard |
| `admin-sources.png` | Quellenverwaltung |
| `admin-moderation.png` | Moderation |
| `admin-ai-settings.png` | KI-Einstellungen |

## Neu erzeugen

```bash
npm run apps:up
bash scripts/db-migrate.sh
bash scripts/db-seed.sh
npx tsx packages/database/prisma/seed-demo-events.ts   # ggf. mit Docker-Netz / DATABASE_URL

./scripts/capture-ui-screenshots.sh
```
