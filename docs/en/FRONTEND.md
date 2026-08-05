# Frontend

> Language: English · [Deutsch (primary)](../FRONTEND.md)

Stack:
- Next.js
- React
- TailwindCSS
- shadcn/ui
- TanStack Query

## Visual language

Flat UI (FestSchmiede-inspired):
- solid primary (`#1565c0`), secondary/teal (`#00838f`), success green (`#2e7d32`)
- no background gradients; light grey + white surfaces
- Roboto / sans, bold headings
- rounded buttons (`12px`), flat icons, soft card shadows
- solid primary app bar (white on blue)

Views:
- Home
- Event list (display modes: list, details, tiles)
- Calendar (day, week, month, year)
- Map
- Event detail
- Search results
- Public submission (event / source → moderation queue)

## UI languages

- Supported locales: **`de`** (default), **`en`**
- Resolution: cookie `oeh_locale` → browser `Accept-Language` → default **German**
- Manual override via header language switcher
- Messages: `services/frontend/src/i18n/messages/{de,en}.ts`

## Display modes

### Events
- **List** — compact rows
- **Details** — expanded rows with summary/description
- **Tiles** — card grid

### Calendar
- **Day** / **Week** / **Month** / **Year**
- Navigation including “Today”; clicking a day opens day view

Selected modes persist in the browser (`oeh_view_*`).

## Map

- Embedded OpenStreetMap (Leaflet)
- Markers for all published events with venue coordinates
- Search + filters (category, region, date); markers and list follow the filter
- Auto-zoom (`fitBounds`) to current matches, with padding and max zoom

## Submit

Public forms at `/submit`:
- **Event** — title, time range, venue, description (optional email)
- **Source** — name, URL, plugin type (`rss` / `html` / `ics`), optional cron

Submissions go through `POST /api/v1/submissions` / `POST /api/v1/source-submissions` into the moderation queue (Admin → Moderation). They are not published immediately.

## Screenshots

![Frontend home](../assets/screenshots/frontend-home.png)

*Home*

![Event list](../assets/screenshots/frontend-events.png)

*Event list*

![Event detail](../assets/screenshots/frontend-event-detail.png)

*Event detail*

![Calendar](../assets/screenshots/frontend-calendar.png)

*Calendar*

![Map](../assets/screenshots/frontend-map.png)

*Map*

![Submit](../assets/screenshots/frontend-submit.png)

*Public submission*

![Search](../assets/screenshots/frontend-search.png)

*Search*
