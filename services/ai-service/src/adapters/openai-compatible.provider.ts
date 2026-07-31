import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from '../ports/llm.provider.js';

export type AiProviderName = 'openai' | 'azure' | 'openrouter' | 'ollama';

export interface OpenAiCompatibleConfig {
  readonly provider: AiProviderName;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly timeoutMs?: number;
}

interface ChatCompletionResponse {
  readonly choices?: ReadonlyArray<{
    readonly message?: { readonly content?: string | null };
  }>;
  readonly model?: string;
}

export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(private readonly config: OpenAiCompatibleConfig) {}

  async completeChat(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const model = request.model ?? this.config.model;
    const url = joinUrl(this.config.baseUrl, '/chat/completions');
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (this.config.apiKey.length > 0) {
      headers.authorization = `Bearer ${this.config.apiKey}`;
    }

    const body: Record<string, unknown> = {
      model,
      temperature: request.temperature ?? 0,
      messages: request.messages,
    };

    if (request.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 60_000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `LLM provider ${this.config.provider} failed (${response.status}): ${errorBody}`,
        );
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(`LLM provider ${this.config.provider} returned empty content`);
      }

      return {
        content,
        model: payload.model ?? model,
        provider: this.config.provider,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function resolveProviderConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): OpenAiCompatibleConfig {
  const provider = (env.AI_PROVIDER ?? 'ollama') as AiProviderName;
  const defaults = defaultBaseUrl(provider);
  const baseUrl = (env.AI_BASE_URL ?? defaults).replace(/\/$/, '');
  const apiKey = env.AI_API_KEY ?? '';
  const model = env.AI_MODEL ?? defaultModel(provider);

  if (!['openai', 'azure', 'openrouter', 'ollama'].includes(provider)) {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }

  if (provider !== 'ollama' && apiKey.length === 0) {
    throw new Error(`AI_API_KEY is required for provider ${provider}`);
  }

  return {
    provider,
    baseUrl,
    apiKey,
    model,
    timeoutMs: Number(env.AI_TIMEOUT_MS ?? 60_000),
  };
}

function defaultBaseUrl(provider: AiProviderName): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    case 'azure':
      return 'https://example.openai.azure.com/openai/deployments/gpt-4o';
    case 'ollama':
      return 'http://host.docker.internal:11434/v1';
  }
}

function defaultModel(provider: AiProviderName): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'openrouter':
      return 'openai/gpt-4o-mini';
    case 'azure':
      return 'gpt-4o-mini';
    case 'ollama':
      return 'llama3.2';
  }
}

function joinUrl(base: string, suffix: string): string {
  if (base.endsWith('/v1') && suffix.startsWith('/')) {
    return `${base}${suffix}`;
  }
  if (base.includes('/chat/completions')) {
    return base;
  }
  return `${base.replace(/\/$/, '')}${suffix}`;
}
