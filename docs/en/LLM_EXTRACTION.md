# LLM Extraction

> Language: English · [Deutsch (primary)](../LLM_EXTRACTION.md)

The LLM receives normalized source content.

Tasks:

- determine whether the content is an event
- extract structured fields
- identify recurring events
- identify organizer
- identify venue
- if no venue is given, derive a place name from the title
  (e.g. `Kirmes Niedergrenzebach` → place `Niedergrenzebach`)
- estimate confidence

Output is deterministic JSON validated against a schema.
