# OpenEventHub Admin

## AI Settings

Configure LLM providers in **Admin → AI Settings** (`/ai-settings`):

- OpenAI (ChatGPT)
- Anthropic (Claude)
- Google (Gemini)
- Azure OpenAI
- OpenRouter
- Ollama (local)
- Custom OpenAI-compatible endpoints

API keys are stored encrypted. The Event Intelligence Engine uses the **active** profile from the database (ADR 0006).

Default login after seed:

- Email: `admin@openeventhub.local`
- Password: `ChangeMeNow!`
