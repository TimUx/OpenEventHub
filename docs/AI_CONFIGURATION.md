# AI Configuration

> Sprache: Deutsch (primär) · [English](en/AI_CONFIGURATION.md)

## Prinzipien

- Provider-Zugangsdaten und Modellauswahl werden im **Admin Center**
  (AI Settings) verwaltet, nicht über Umgebungsvariablen der Anwendung.
- Prompts bleiben zentral unter `prompts/` und sind versioniert.
- Der aktive Provider kann ohne Codeänderungen oder Redeploys gewechselt werden.

## Unterstützte Provider

| Type | Product examples | API style |
|------|------------------|-----------|
| `openai` | ChatGPT / OpenAI API | OpenAI Chat Completions |
| `anthropic` | Claude | Anthropic Messages |
| `google` | Gemini | Google Generative Language |
| `azure_openai` | Azure OpenAI | OpenAI-compatible |
| `openrouter` | OpenRouter | OpenAI-compatible |
| `ollama` | Local Ollama | OpenAI-compatible (`/v1`) |
| `custom_openai` | Any OpenAI-compatible gateway | OpenAI-compatible |

## Admin-Einstellungen

Betreiber konfigurieren:

- Benannte Provider-Profile (Base URL, API-Key, Modell, Timeouts)
- Welches Profil für die Event Intelligence Engine **aktiv** ist
- Optionale Header / Organization-IDs pro Profil

API-Keys werden verschlüsselt at rest gespeichert.

## Runtime

`ai-service` lädt bei der Verarbeitung von BullMQ-`ai`-Jobs das aktive Profil
aus PostgreSQL und instanziiert den passenden Adapter.
