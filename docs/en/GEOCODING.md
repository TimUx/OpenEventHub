# Geocoding

> Language: English · [Deutsch](../GEOCODING.md)

Resolved fields:

- address
- city
- municipality
- district
- state
- country
- latitude
- longitude

Results are persisted on `venues` and `regions` (database as cache).

Public event APIs (`/api/v1/events`, `/api/v1/search`) include venue coordinates so the
frontend map can place markers and auto-zoom.

## BullMQ geocoding (worker)

After AI ingest (venue/region linked) and after admin event venue assignment,
`ai-service` / API enqueue jobs on the **`geocoding`** queue. The **`worker`** service
processes them (concurrency 1, ≤1 Nominatim request / 1.5s):

1. Search via Nominatim (address / name / city / region + “Deutschland”)
2. Write `latitude` / `longitude` on the venue
3. If the linked region lacks coordinates, copy the same point onto the region

The worker needs **outbound internet** (Compose/Stack: `internal` + `edge` networks)
to reach Nominatim.

Backfill missing coordinates (admin):

```
POST /api/v1/admin/geocoding/backfill
Body: { "limit": 200, "venues": true, "regions": true }
```

HTTP 429 from Nominatim causes job retries with backoff — re-run backfill after a pause if needed.

## Admin region lookup (sync)

Admin place search uses **OpenStreetMap Nominatim** synchronously
(`GET /api/v1/admin/regions/lookup`). Creating from a candidate
(`POST …/from-lookup`) stores candidate coordinates on the leaf region.

| Env | Default |
|-----|---------|
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` |
| `NOMINATIM_USER_AGENT` | `OpenEventHub/… (geocoding; …)` |

Follow Nominatim usage policy (User-Agent, rate limit).

## AI ingest region resolve

During taxonomy link after classification, `ai-service` may verify missing settlements
via the same Nominatim endpoint (Compose: `edge` network, ~1.1s spacing per worker
process). Only `place`/`boundary` hits with settlement/admin types are accepted;
amenities (church, parking, …) do not create regions. Admin lookup stays intentionally broader.
