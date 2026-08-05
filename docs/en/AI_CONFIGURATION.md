# AI Configuration

> Language: English · [Deutsch (primary)](../AI_CONFIGURATION.md)

## Principles

- Provider credentials and model selection are managed in the **Admin Center**
  (AI Settings), not via application environment variables.
- Prompts remain centralized under `prompts/` and are versioned.
- The active provider can be changed without code changes or redeploys.

## Default: Local Ollama

Compose and the Swarm stack run an **Ollama** service (`http://ollama:11434`,
no host port; `edge`+`internal` networks for model pulls, no Traefik exposure).

Seed (`db:seed`) creates/updates the **Local Ollama** profile
(`baseUrl=http://ollama:11434/v1`, model `llama3.2` or `OLLAMA_MODEL`) and sets it
active when no active provider is configured yet.

Compose pulls the default model once via the `ollama-pull` one-shot service.
Override with `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_IMAGE` in `.env`.

Admin → AI Settings: **create, edit, delete** profiles, set active, and test.

## Supported providers

| Type | Product examples | API style |
|------|------------------|-----------|
| `openai` | ChatGPT / OpenAI API | OpenAI Chat Completions |
| `anthropic` | Claude | Anthropic Messages |
| `google` | Gemini | Google Generative Language |
| `azure_openai` | Azure OpenAI | OpenAI-compatible |
| `openrouter` | OpenRouter | OpenAI-compatible |
| `ollama` | Local Ollama (Compose/Stack) | OpenAI-compatible (`/v1`) |
| `custom_openai` | Any OpenAI-compatible gateway | OpenAI-compatible |

## Admin settings

Operators configure:

- Named provider profiles (base URL, API key, model, timeouts, enabled)
- CRUD in Admin Center (`/ai-settings`)
- Which profile is **active** for the Event Intelligence Engine
- Optional per-profile headers / organization ids

API keys are stored encrypted at rest.

## Runtime

`ai-service` loads the active profile from PostgreSQL when processing BullMQ `ai`
jobs and instantiates the matching adapter.
