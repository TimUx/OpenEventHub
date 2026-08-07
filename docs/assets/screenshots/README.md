# UI-Screenshots

> Sprache: Deutsch (primär)

Beispielaufnahmen von Frontend und Admin Center mit Demo-Daten (München), flaches UI.

Header-Icons; Event-Liste mit aufklappbaren Filtern und Kalender-Export/Abonnement; Event-Aktionen als Icon-Buttons; Brand-Mark; SEO/PWA mit Bottom-Navigation.
Quellenverwaltung inkl. Bearbeiten und Plugin-Typen `html` / `rss` / `ics` / `toubiz`.
Events als Tabelle mit Spaltenfilter/-sortierung, Mehrfachauswahl und Bulk-Status/Löschen; Header-Hinweis auf prüfpflichtige Termine.

## Frontend

| Datei | Inhalt |
|-------|--------|
| `frontend-home.png` | Startseite (Desktop) |
| `frontend-home-mobile.png` | Startseite (Smartphone, Bottom-Nav) |
| `frontend-events.png` | Veranstaltungsliste inkl. zugeklappten Filter-/Kalender-Panels |
| `frontend-event-detail.png` | Veranstaltungsdetail |
| `frontend-calendar.png` | Kalender inkl. Abonnement |
| `frontend-map.png` | Karte mit Markern/Filtern |
| `frontend-submit.png` | Öffentliche Einreichung (Quelle-Tab inkl. Plugin-Typen) |
| `frontend-search.png` | Suche |

## Admin Center

| Datei | Inhalt |
|-------|--------|
| `admin-login.png` | Login |
| `admin-dashboard.png` | Dashboard |
| `admin-sources.png` | Quellenverwaltung |
| `admin-events.png` | Events (Tabelle, Spaltenfilter, Bulk-Aktionen) |
| `admin-moderation.png` | Moderation |
| `admin-ai-settings.png` | KI-Einstellungen |
| `admin-logs.png` | Fehler-Log |

## Neu erzeugen

```bash
npm run apps:up
bash scripts/db-migrate.sh
bash scripts/db-seed.sh
npx tsx packages/database/prisma/seed-demo-events.ts   # ggf. mit Docker-Netz / DATABASE_URL

./scripts/capture-ui-screenshots.sh
```
