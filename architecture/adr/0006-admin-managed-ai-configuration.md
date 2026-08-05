# ADR 0006: Admin-Managed AI Provider Configuration

- Status: Accepted
- Date: 2026-07-31
- Supersedes: ADR 0005 §3 (environment-based provider selection only)

## Context

Operators must configure LLM providers (ChatGPT/OpenAI, Claude/Anthropic,
Gemini/Google, Azure OpenAI, OpenRouter, Ollama/local, custom OpenAI-compatible
endpoints) from the Admin Center with credentials — not via deployment env vars.
`docs/ADMIN_CENTER.md` already lists **AI Settings**.

## Decision

1. Persist provider profiles and the active profile in PostgreSQL
   (`AiProviderProfile`, `AiRuntimeSettings`).
2. Store API keys encrypted at rest (AES-256-GCM). The only env secret related
   to AI settings is `SETTINGS_ENCRYPTION_KEY` (encryption key material).
3. Resolve the runtime LLM adapter from the **active** DB profile on each AI job
   (cached briefly; refreshed after admin updates).
4. Support native adapters:
   - OpenAI-compatible HTTP (`openai`, `azure_openai`, `openrouter`, `ollama`, `custom_openai`)
   - Anthropic Messages API (`anthropic` / Claude)
   - Google Gemini generateContent API (`google`)
5. Expose Admin REST API under `/api/v1/admin/ai/*` and an Admin UI page.
6. Protect admin AI routes with JWT (admin users in DB). Auth JWT signing secret
   remains env (`AUTH_JWT_SECRET`) — not provider credentials.

## Consequences

### Positive

- Matches Admin Center documentation
- Credentials changeable without redeploy
- Multiple named profiles (e.g. prod ChatGPT + local Ollama)

### Negative

- Requires `SETTINGS_ENCRYPTION_KEY` and `AUTH_JWT_SECRET` in env (bootstrapping only)
- Provider-specific API quirks live in adapters

## Alternatives considered

| Alternative                           | Why rejected                                     |
| ------------------------------------- | ------------------------------------------------ |
| Keep AI_* env vars as source of truth | Contradicts Admin AI Settings requirement        |
| Store API keys in plaintext           | Unacceptable for production credentials          |
| Single OpenAI-compatible adapter only | Cannot speak Claude/Gemini native APIs correctly |
