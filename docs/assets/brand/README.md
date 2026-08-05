# Brand mark

> Sprache: Deutsch (primär)

Flaches OpenEventHub-Markenzeichen (Hub / vernetzte Quellen):

| Datei | Verwendung |
|-------|------------|
| `openeventhub-mark.svg` | Vektor (Primärblau `#1565c0`) |
| `openeventhub-mark.png` | Raster 512×512 |

Runtime-Kopien:

- Portal: `services/frontend/public/brand/` — `mark.svg` (`currentColor`), `mark.png`, PWA-Icons (`icon-192/512`, maskable), `apple-touch-icon.png`
- Admin: `services/admin/public/brand/…`
- Favicon/App-Icon: `src/app/icon.png`, `apple-icon.png` (Next.js Metadata)
- PWA-Manifest: `services/frontend/src/app/manifest.ts` → `/manifest.webmanifest`

Header nutzt die SVG-Komponente `BrandMark` mit `currentColor` auf der Primär-AppBar.
