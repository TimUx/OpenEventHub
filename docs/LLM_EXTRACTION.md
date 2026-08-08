# LLM-Extraktion

> Sprache: Deutsch (primär) · [English](en/LLM_EXTRACTION.md)

Das LLM erhält normalisierten Quellinhalt.

Aufgaben:

- feststellen, ob der Inhalt eine Veranstaltung ist
- strukturierte Felder extrahieren
- wiederkehrende Veranstaltungen erkennen
- Organisator identifizieren
- Venue identifizieren
- wenn kein Venue angegeben ist, Ortsnamen aus dem Titel ableiten
  (z. B. `Kirmes Niedergrenzebach` → Ort `Niedergrenzebach`)
- Confidence schätzen

Die Ausgabe ist deterministisches JSON, validiert gegen ein Schema.
