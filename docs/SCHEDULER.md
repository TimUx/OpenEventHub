# Scheduler

> Sprache: Deutsch (primär) · [English](en/SCHEDULER.md)

Standardintervall: alle 6 Stunden

In Admin → Quellen und beim öffentlichen Quellen-Einreichen wählt man das Intervall über ein **Dropdown** (kein freies Cron-Feld nötig). Admin → Scheduler zeigt dieselben Intervalle lesbar (ohne Roh-Cron) und den nächsten Lauf.

- nur manuell
- stündlich
- alle 6 Stunden
- täglich (06:00 UTC)
- wöchentlich (Montag 06:00 UTC)
- monatlich (1. des Monats 06:00 UTC)
- eigener Zeitplan (Experten-Option: Cron-Ausdruck UTC)

Intern speichert die Plattform weiterhin `schedule_cron`. Pro **unterscheidbarem**
Cron-Muster wird genau **ein** BullMQ-Repeatable-Job (Schedule-Tick) registriert.
Beim Tick crawlt der Worker alle aktivierten Quellen mit diesem Muster **seriell**
(nacheinander in einer Queue; Crawl-Worker-Concurrency = 1). Manuelles „Jetzt crawlen“
bleibt ein Einzel-Job für eine Quelle.

Wo möglich, soll nur geänderter Inhalt verarbeitet werden.
