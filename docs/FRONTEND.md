# Frontend

> Sprache: Deutsch (primär) · [English](en/FRONTEND.md)

Stack:
- Next.js
- React
- TailwindCSS
- shadcn/ui
- TanStack Query

## Visuelle Sprache

Flaches UI (an FestSchmiede angelehnt):
- solide Primär-/Akzentfarbe (Default Blau `#1565c0`), Sekundär/Teal (`#00838f`), Erfolg grün (`#2e7d32`)
- wählbare Akzentfarben in der Kopfzeile (nur WCAG-AA-sichere Paare mit Kontrastschrift für Light/Dark)
- Light/Dark-Modus und Akzent werden lokal im Browser gespeichert (`oeh-theme`, `oeh-accent`)
- keine Hintergrund-Farbverläufe; helles Grau + weiße Flächen
- Roboto / Sans, fette Überschriften
- abgerundete Buttons (`12px`), flache Icons, leichte Kartenschatten
- solide Primär-AppBar (Kontrastschrift auf Akzent)

Ansichten:
- Startseite
- Veranstaltungsliste (Anzeigemodi: Liste, Details, Kacheln)
- Kalender (Tag, Woche, Monat, Jahr)
- Karte
- Veranstaltungsdetail
- Suchergebnisse
- Öffentliche Einreichung (Veranstaltung / Quelle → Moderationswarteschlange)

Event-Aktionen (Liste, Kacheln, Details und Detailseite):
- **Auf Karte anzeigen** — Deep-Link `/map?event=<id>` (nur mit Venue-Koordinaten aktiv)
- **In Kalender eintragen** — Download einer `.ics`-Datei für lokale Kalender (Smartphone, Outlook, Thunderbird, …)

## Mehrsprachigkeit (UI)

- Unterstützte Locales: **`de`** (Default), **`en`**
- Ermittlung: Cookie `oeh_locale` → Browser-`Accept-Language` → Default **Deutsch**
- Manuelle Umschaltung über Sprachwähler in der Kopfzeile (setzt Cookie)
- Message-Dateien: `services/frontend/src/i18n/messages/{de,en}.ts`

## Anzeigemodi

### Veranstaltungen
- **Liste** — kompakte Zeilen
- **Details** — erweiterte Listeneinträge mit Summary/Beschreibung
- **Kacheln** — Kartenraster

### Kalender
- **Tag** / **Woche** / **Monat** / **Jahr**
- Navigation inkl. „Heute“; Klick auf Tag wechselt in die Tagesansicht

Gewählte Modi werden lokal im Browser gespeichert (`oeh_view_*`).

## Karte

- Eingebettete OpenStreetMap-Karte (Leaflet)
- Marker für alle veröffentlichten Events mit Venue-Koordinaten
- Suche + Filter (Kategorie, Region, Datum); Marker und Liste folgen dem Filter
- Auto-Zoom (`fitBounds`) auf die aktuellen Treffer, mit begrenztem Zoom und Padding
- Deep-Link: `/map?event=<id>` wählt den Marker (aus Listen/Detail-Aktionen)

## Einreichen

Öffentliche Formulare unter `/submit`:
- **Veranstaltung** — Titel, Zeitraum, Ort, Beschreibung (optional E-Mail)
- **Quelle** — Name, URL, Plugin-Typ (`rss` / `html` / `ics`), optional Cron

Einreichungen gehen über `POST /api/v1/submissions` bzw. `POST /api/v1/source-submissions` in die Moderationswarteschlange (Admin → Moderation). Direkte Freischaltung erfolgt nicht.

## Screenshots

![Startseite des Frontends](assets/screenshots/frontend-home.png)

*Startseite*

![Veranstaltungsliste](assets/screenshots/frontend-events.png)

*Veranstaltungsliste*

![Veranstaltungsdetail](assets/screenshots/frontend-event-detail.png)

*Veranstaltungsdetail*

![Kalender](assets/screenshots/frontend-calendar.png)

*Kalender*

![Karte](assets/screenshots/frontend-map.png)

*Karte*

![Einreichen](assets/screenshots/frontend-submit.png)

*Öffentliche Einreichung*

![Suche](assets/screenshots/frontend-search.png)

*Suche*
