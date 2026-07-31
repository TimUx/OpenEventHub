import type {
  AiProviderProfileConfig,
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from '../ports/llm.provider.js';

interface ChatCompletionResponse {
  readonly choices?: ReadonlyArray<{
    readonly message?: { readonly content?: string | null };
  }>;
  readonly model?: string;
}

export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(private readonly profile: AiProviderProfileConfig) {}

  async completeChat(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const model = request.model ?? this.profile.model;
    const baseUrl = (this.profile.baseUrl ?? defaultBaseUrl(this.profile.type)).replace(/\/$/, '');
    const url = joinUrl(baseUrl, '/chat/completions');
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...this.profile.extraHeaders,
    };

    if (this.profile.apiKey) {
      headers.authorization = `Bearer ${this.profile.apiKey}`;
    }
    if (this.profile.organizationId) {
      headers['openai-organization'] = this.profile.organizationId;
    }
    if (this.profile.projectId) {
      headers['openai-project'] = this.profile.projectId;
    }

    const body: Record<string, unknown> = {
      model,
      temperature: request.temperature ?? 0,
      messages: request.messages,
    };
    if (request.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const payload = await postJson<ChatCompletionResponse>(url, headers, body, this.profile.timeoutMs);
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`Provider ${this.profile.type} returned empty content`);
    }
    return { content, model: payload.model ?? model, provider: this.profile.type };
  }
}

function defaultBaseUrl(type: AiProviderProfileConfig['type']): string {
  switch (type) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    case 'ollama':
      return 'http://host.docker.internal:11434/v1';
    case 'azure_openai':
    case 'custom_openai':
      throw new Error(`baseUrl is required for provider type ${type}`);
    default:
      throw new Error(`OpenAI-compatible adapter does not support ${type}`);
  }
}

function joinUrl(base: string, suffix: string): string {
  if (base.includes('/chat/completions')) {
    return base;
  }
  return `${base.replace(/\/$/, '')}${suffix}`;
}

export async function postJson<T>(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`LLM HTTP ${response.status}: ${errorBody}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
