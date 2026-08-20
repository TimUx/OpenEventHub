# Admin Center

> Sprache: Deutsch (primär) · [English](en/ADMIN_CENTER.md)

## Dashboard
- Systemstatus
- Crawl-Übersicht
- AI-Status
- Queue-Status (Zähler)
- Letzte Imports
- Fehlerübersicht (nur Zähler) mit Link zum **Fehler-Log**

## Fehler-Log
- Tabellarische Liste aktueller Fehler inkl. Gründe
- Quellen: BullMQ (`failedReason`), fehlgeschlagene Crawl-Jobs, Quellen-`lastError`

## Verwaltung
- Quellen (anlegen / bearbeiten / aktivieren / deaktivieren / löschen; Plugin-Typen
  `html` / `rss` / `ics` / `toubiz`; Aktualisierungsintervall per Dropdown; optional eigener Cron)
- Veranstaltungen (Tabellenansicht: Filter/Sortierung in Spaltenköpfen; Checkbox-Auswahl
  mit kompakter Bulk-Leiste für Status/Löschen über Sammel-Endpunkte; Bearbeiten je Zeile;
  Header zeigt Anzahl `pending_moderation`)
- Kategorien (Tabelle mit Spaltenfilter/-sortierung; manuell anlegen / bearbeiten / löschen;
  Seed liefert den ländlichen Starterkatalog; KI legt **keine** neuen Kategorien an)
- Regionen (Hierarchie-Baum Land→…→Ort, aufklappbar; Ortssuche legt Hierarchie an;
  Mehrdeutigkeit mit Auswahl; manuell bearbeiten / löschen; Checkbox-Auswahl mit
  Bulk-Leiste für Parent/Wurzel setzen und Löschen; KI ergänzt Orte/Hierarchie nur
  nach Katalog-Match oder Nominatim-verifizierter Siedlungskette)
- **Import-Einstellungen** (Abdeckungsgebiet und Kategorie-Allowlist für den Ingest;
  getrennt vom Regionen-/Kategoriekatalog)
- Moderation
- Benutzer & Rollen (Bearbeiten: E-Mail/Rolle/Passwort; Löschen)
- **Mein Profil** (jeder angemeldete Admin: E-Mail/Passwort mit aktuellem Passwort)
- AI-Einstellungen (Provider-Profile anlegen / bearbeiten / löschen; Standard: Local Ollama; Profil-Test mit sofortigem Dialog inkl. Warteanzeige)
- Scheduler (lesbare Intervalle + nächster Lauf; Konfiguration unter Quellen)

## Mehrsprachigkeit (UI)

- Unterstützte Locales: **`de`** (Default), **`en`**
- Ermittlung: Cookie `oeh_locale` → Browser-`Accept-Language` → Default **Deutsch**
- Sprachwähler im Admin-Chrome; gleiche Cookie-Konvention wie das öffentliche Portal
- Message-Dateien: `services/admin/src/i18n/messages/{de,en}.ts`

## Visuelle Sprache

Flaches UI mit linker Sidebar und schlankem Top-Header (Primärblau als Marken-/Akzentfarbe, abgerundete Buttons, keine Hintergrund-Verläufe).

## Branding (White-Label)

- **Logo:** Dateien unter `services/admin/public/brand/` ersetzen und/oder
  `NEXT_PUBLIC_ADMIN_LOGO_URL` setzen (z. B. `/brand/mark.png`)
- **Titel:** `NEXT_PUBLIC_ADMIN_TITLE` (Header, Login, Browser-Titel); Default `OpenEventHub Admin`
- `NEXT_PUBLIC_*`-Werte werden beim **Image-Build** eingebettet — Admin-Image neu bauen nach Änderung

## Navigation

Feste **linke Sidebar** (Desktop dauerhaft, Mobil als Overlay) mit immer sichtbaren
Gruppen — analog HaushaltsRadar:

| Gruppe | Einträge |
|--------|----------|
| Übersicht | Dashboard |
| Inhalt | Events, Moderation, Kategorien, Regionen |
| Quellen | Quellen, Crawler, Scheduler, Import-Einstellungen |
| Betrieb | Warteschlangen, Fehler-Log |
| System | KI-Einstellungen, Benutzer |
| Konto | Mein Profil |

Schlanker Top-Header: Pending-Hinweis, Sprache, Benutzer, Abmelden.

## Screenshots

![Admin-Login](assets/screenshots/admin-login.png)

*Admin-Login*

![Admin-Dashboard](assets/screenshots/admin-dashboard.png)

*Admin-Dashboard*

![Quellenverwaltung](assets/screenshots/admin-sources.png)

*Quellenverwaltung*

![Events](assets/screenshots/admin-events.png)

*Events (Tabelle mit Spaltenfilter)*

![Moderation](assets/screenshots/admin-moderation.png)

*Moderation*

![KI-Einstellungen](assets/screenshots/admin-ai-settings.png)

*KI-Einstellungen*

![Fehler-Log](assets/screenshots/admin-logs.png)

*Fehler-Log*
