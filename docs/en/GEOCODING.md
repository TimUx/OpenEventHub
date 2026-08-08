# Geocoding

> Language: English · [Deutsch (primary)](../GEOCODING.md)

Resolve:

- address
- city
- municipality
- district
- state
- country
- latitude
- longitude

Results are cached.

Public event APIs (`/api/v1/events`, `/api/v1/search`) include venue coordinates so the frontend map can place markers and auto-zoom.

## Admin region lookup (sync)

For Admin place search (Land→…→Ort hierarchy) the API uses **OpenStreetMap Nominatim**
synchronously (`GET /api/v1/admin/regions/lookup`). This is not a BullMQ geocoding job and
does not yet replace the venue-coordinate pipeline.

| Env | Default |
|-----|---------|
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` |
| `NOMINATIM_USER_AGENT` | `OpenEventHub/… (admin-region-lookup; …)` |

Respect Nominatim usage policy (User-Agent, rate limit); the Admin UI debounces search.
