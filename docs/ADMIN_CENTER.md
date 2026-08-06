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
- Veranstaltungen (bearbeiten, Status ändern, löschen; Updates erzeugen EventVersion)
- Kategorien (manuell anlegen / bearbeiten / löschen; KI legt fehlende per Find-or-create an und verknüpft)
- Regionen (manuell anlegen / bearbeiten / löschen; KI kann Orte/Hierarchie per Find-or-create ergänzen)
- Moderation
- Benutzer & Rollen
- AI-Einstellungen (Provider-Profile anlegen / bearbeiten / löschen; Standard: Local Ollama; Profil-Test mit sofortigem Dialog inkl. Warteanzeige)
- Scheduler (lesbare Intervalle + nächster Lauf; Konfiguration unter Quellen)

## Mehrsprachigkeit (UI)

- Unterstützte Locales: **`de`** (Default), **`en`**
- Ermittlung: Cookie `oeh_locale` → Browser-`Accept-Language` → Default **Deutsch**
- Sprachwähler im Admin-Chrome; gleiche Cookie-Konvention wie das öffentliche Portal
- Message-Dateien: `services/admin/src/i18n/messages/{de,en}.ts`

## Visuelle Sprache

Flaches UI analog zum öffentlichen Portal (Primärblau-AppBar, abgerundete Buttons, keine Hintergrund-Verläufe).

## Screenshots

![Admin-Login](assets/screenshots/admin-login.png)

*Admin-Login*

![Admin-Dashboard](assets/screenshots/admin-dashboard.png)

*Admin-Dashboard*

![Quellenverwaltung](assets/screenshots/admin-sources.png)

*Quellenverwaltung*

![Moderation](assets/screenshots/admin-moderation.png)

*Moderation*

![KI-Einstellungen](assets/screenshots/admin-ai-settings.png)

*KI-Einstellungen*

![Fehler-Log](assets/screenshots/admin-logs.png)

*Fehler-Log*
