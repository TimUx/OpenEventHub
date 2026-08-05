# SEO

> Sprache: Deutsch (primär) · [English](en/SEO.md)

Suchmaschinen sollen das öffentliche Portal indexieren können. Die Umsetzung liegt im Frontend-Service (`services/frontend`) und nutzt Next.js Metadata, Sitemap und strukturierte Daten.

## Öffentliche URLs

| Pfad | Indexierung | Anmerkung |
|------|-------------|-----------|
| `/` | ja | Startseite mit Organization/WebSite JSON-LD |
| `/events` | ja | Event-Liste |
| `/events/[id]` | ja | Detail + Event JSON-LD |
| `/calendar` | ja | Interaktive UI + serverseitige Event-Links |
| `/map` | ja | Interaktive UI + serverseitige Event-Links |
| `/submit` | ja | Niedrige Sitemap-Priorität |
| `/search` | **nein** | `noindex`, nicht in der Sitemap (Filter-/Query-URLs) |
| `/health`, `/ready`, `/metrics` | **nein** | in `robots.txt` verboten |

## Sitemap & Robots

- **`/sitemap.xml`** — Next.js `app/sitemap.ts`
  - Statische Routen inkl. Priorität/Change-Frequency
  - Bis zu 500 veröffentlichte Events
  - `revalidate = 3600` (stündliche Aktualisierung)
- **`/robots.txt`** — Next.js `app/robots.ts`
  - `Allow: /`
  - `Disallow` für Health-/Metrik- und Search-Routen
  - Verweis auf die Sitemap unter der konfigurierten Site-URL

Die kanonische Basis-URL kommt aus `NEXT_PUBLIC_SITE_URL` / `getSiteUrl()`. In Produktion muss diese auf die öffentliche Domain zeigen (nicht auf einen internen Hostnamen).

## Metadata

- Root-Layout: `metadataBase`, Title-Template, Open Graph (Site-Name, Locale, Brand-Bild)
- Seiten: `pageMetadata()` in `lib/seo.ts` setzt Title, Description, Canonical, Robots, Open Graph und Twitter Card
- Event-Detail: Title/Description aus dem Event; bei 404 `noindex`
- Search: bewusst `index: false`

## Strukturierte Daten (JSON-LD)

- **WebSite + Organization** auf der Startseite (`SiteJsonLd`), inkl. `SearchAction` → `/search?q={search_term_string}`
- **Event** auf Detailseiten (`EventJsonLd`): Zeit, Ort/Geo, Kategorien als Keywords, Schema.org-Status

## Crawlbare Inhalte

Kalender und Karte sind clientseitig interaktiv. Zusätzlich rendert der Server eine Liste mit Links zu Event-Details (`CrawlableEventList`), damit Crawler ohne JavaScript die Events erreichen.

## Checkliste Betrieb

1. `NEXT_PUBLIC_SITE_URL` auf die öffentliche HTTPS-URL setzen
2. Nach Deploy: `https://<domain>/robots.txt` und `https://<domain>/sitemap.xml` prüfen
3. In Search Console / Bing Webmaster die Sitemap einreichen
4. Stichprobe: Event-Detail-HTML enthält `<script type="application/ld+json">` mit `@type":"Event"`
