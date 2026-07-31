# AI Configuration

## Principles

- Provider credentials and model selection are managed in the **Admin Center**
  (AI Settings), not via application environment variables.
- Prompts remain centralized under `prompts/` and are versioned.
- The active provider can be changed without code changes or redeploys.

## Supported providers

| Type | Product examples | API style |
|------|------------------|-----------|
| `openai` | ChatGPT / OpenAI API | OpenAI Chat Completions |
| `anthropic` | Claude | Anthropic Messages |
| `google` | Gemini | Google Generative Language |
| `azure_openai` | Azure OpenAI | OpenAI-compatible |
| `openrouter` | OpenRouter | OpenAI-compatible |
| `ollama` | Local Ollama | OpenAI-compatible (`/v1`) |
| `custom_openai` | Any OpenAI-compatible gateway | OpenAI-compatible |

## Admin settings

Operators configure:

- Named provider profiles (base URL, API key, model, timeouts)
- Which profile is **active** for the Event Intelligence Engine
- Optional per-profile headers / organization ids

API keys are stored encrypted at rest.

## Runtime

`ai-service` loads the active profile from PostgreSQL when processing BullMQ `ai`
jobs and instantiates the matching adapter.
