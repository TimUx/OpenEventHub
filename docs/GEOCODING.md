# Geocoding

> Sprache: Deutsch (primär) · [English](en/GEOCODING.md)

Aufgelöst werden:

- address
- city
- municipality
- district
- state
- country
- latitude
- longitude

Ergebnisse werden in `venues` und `regions` persistiert (DB als Cache).

Die öffentlichen Event-APIs (`/api/v1/events`, `/api/v1/search`) liefern Venue-Koordinaten mit, damit die Frontend-Karte Marker setzen und automatisch zoomen kann.

## BullMQ-Geocoding (Worker)

Nach AI-Ingest (Venue/Region verknüpft) und nach Admin-Event-Ort-Zuweisung enqueued
`ai-service` bzw. API Jobs in die Queue **`geocoding`**. Der **`worker`**-Service
verarbeitet sie (Concurrency 1, ≤1 Nominatim-Request/1,5 s):

1. Suche über Nominatim (Adresse / Name / Stadt / Region + „Deutschland“)
2. Schreiben von `latitude` / `longitude` auf das Venue
3. Fehlen Region-Koordinaten und das Venue hat eine `region_id`, werden dieselben
   Koordinaten auf die Region übernommen

Der Worker braucht **Outbound-Internetzugang** (Compose/Stack: Netze `internal` + `edge`),
weil Nominatim öffentlich erreichbar sein muss.

Backfill fehlender Koordinaten (Admin):

```
POST /api/v1/admin/geocoding/backfill
Body: { "limit": 200, "venues": true, "regions": true }
```

Bei HTTP 429 von Nominatim werden Jobs mit Backoff erneut versucht — Backfill bei Bedarf
nach einer Pause wiederholen.

## Admin-Regionen-Lookup (sync)

Für die Admin-Ortssuche (Hierarchie Land→…→Ort) nutzt die API **OpenStreetMap Nominatim**
synchron (`GET /api/v1/admin/regions/lookup`). Beim Anlegen (`POST …/from-lookup`)
werden die Kandidaten-Koordinaten auf dem Blatt-Region-Knoten gespeichert.

| Env | Default |
|-----|---------|
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` |
| `NOMINATIM_USER_AGENT` | `OpenEventHub/… (geocoding; …)` |

Nutzungsregeln von Nominatim beachten (User-Agent, Rate-Limit).
