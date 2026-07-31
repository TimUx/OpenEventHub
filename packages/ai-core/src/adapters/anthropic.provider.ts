import type {
  AiProviderProfileConfig,
  ChatMessage,
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from '../ports/llm.provider.js';
import { postJson } from './openai-compatible.provider.js';

interface AnthropicResponse {
  readonly content?: ReadonlyArray<{ readonly type: string; readonly text?: string }>;
  readonly model?: string;
}

export class AnthropicProvider implements LlmProvider {
  constructor(private readonly profile: AiProviderProfileConfig) {}

  async completeChat(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const model = request.model ?? this.profile.model;
    const baseUrl = (this.profile.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '');
    const url = `${baseUrl}/v1/messages`;
    const { system, messages } = splitSystem(request.messages);

    if (!this.profile.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-api-key': this.profile.apiKey,
      'anthropic-version': '2023-06-01',
      ...this.profile.extraHeaders,
    };

    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      temperature: request.temperature ?? 0,
      messages: messages.map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      })),
    };
    if (system) {
      body.system = system;
    }

    const payload = await postJson<AnthropicResponse>(url, headers, body, this.profile.timeoutMs);
    const content = payload.content?.find((part) => part.type === 'text')?.text;
    if (!content) {
      throw new Error('Anthropic returned empty content');
    }
    return { content, model: payload.model ?? model, provider: 'anthropic' };
  }
}

function splitSystem(messages: readonly ChatMessage[]): {
  system: string | null;
  messages: ChatMessage[];
} {
  const systemParts = messages.filter((message) => message.role === 'system').map((m) => m.content);
  const rest = messages.filter((message) => message.role !== 'system');
  return {
    system: systemParts.length > 0 ? systemParts.join('\n\n') : null,
    messages: rest,
  };
}
