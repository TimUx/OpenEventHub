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

Ergebnisse werden gecacht.

Die öffentlichen Event-APIs (`/api/v1/events`, `/api/v1/search`) liefern Venue-Koordinaten mit, damit die Frontend-Karte Marker setzen und automatisch zoomen kann.

## Admin-Regionen-Lookup (sync)

Für die Admin-Ortssuche (Hierarchie Land→…→Ort) nutzt die API **OpenStreetMap Nominatim**
synchron (`GET /api/v1/admin/regions/lookup`). Das ist kein BullMQ-Geocoding-Job und
ersetzt noch nicht die Venue-Koordinaten-Pipeline.

| Env | Default |
|-----|---------|
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` |
| `NOMINATIM_USER_AGENT` | `OpenEventHub/… (admin-region-lookup; …)` |

Nutzungsregeln von Nominatim beachten (User-Agent, Rate-Limit); die Admin-UI debounced die Suche.
