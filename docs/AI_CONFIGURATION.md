# AI Configuration

> Sprache: Deutsch (primär) · [English](en/AI_CONFIGURATION.md)

## Prinzipien

- Provider-Zugangsdaten und Modellauswahl werden im **Admin Center**
  (AI Settings) verwaltet, nicht über Umgebungsvariablen der Anwendung.
- Prompts bleiben zentral unter `prompts/` und sind versioniert.
- Der aktive Provider kann ohne Codeänderungen oder Redeploys gewechselt werden.

## Standard: Local Ollama

Compose und Swarm Stack starten einen **Ollama**-Dienst (`http://ollama:11434`,
kein Host-Port; Netz `edge`+`internal` für Modell-Pulls, ohne Traefik-Exposure).

Beim Seed (`db:seed`) wird das Profil **Local Ollama** angelegt bzw. aktualisiert
(`baseUrl=http://ollama:11434/v1`, Modell `llama3.2` bzw. `OLLAMA_MODEL`) und als
aktiver Provider gesetzt, sofern noch keiner aktiv ist.

Compose zieht das Default-Modell einmalig über den One-Shot-Service `ollama-pull`.
Override: `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_IMAGE` in `.env`.

Admin → KI-Einstellungen: Profile **anlegen, bearbeiten, löschen**, aktiv setzen und testen.

## Unterstützte Provider

| Type | Product examples | API style |
|------|------------------|-----------|
| `openai` | ChatGPT / OpenAI API | OpenAI Chat Completions |
| `anthropic` | Claude | Anthropic Messages |
| `google` | Gemini | Google Generative Language |
| `azure_openai` | Azure OpenAI | OpenAI-compatible |
| `openrouter` | OpenRouter | OpenAI-compatible |
| `ollama` | Local Ollama (Compose/Stack) | OpenAI-compatible (`/v1`) |
| `custom_openai` | Any OpenAI-compatible gateway | OpenAI-compatible |

## Admin-Einstellungen

Betreiber konfigurieren:

- Benannte Provider-Profile (Base URL, API-Key, Modell, Timeouts, enabled)
- CRUD im Admin Center (`/ai-settings`)
- Welches Profil für die Event Intelligence Engine **aktiv** ist
- Optionale Header / Organization-IDs pro Profil

API-Keys werden verschlüsselt at rest gespeichert.

## Runtime

`ai-service` lädt bei der Verarbeitung von BullMQ-`ai`-Jobs das aktive Profil
aus PostgreSQL und instanziiert den passenden Adapter.
