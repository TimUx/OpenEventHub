import type {
  AiProviderProfileConfig,
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from '../ports/llm.provider.js';
import { postJson } from './openai-compatible.provider.js';

interface GeminiResponse {
  readonly candidates?: ReadonlyArray<{
    readonly content?: { readonly parts?: ReadonlyArray<{ readonly text?: string }> };
  }>;
}

export class GeminiProvider implements LlmProvider {
  constructor(private readonly profile: AiProviderProfileConfig) {}

  async completeChat(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const model = request.model ?? this.profile.model;
    if (!this.profile.apiKey) {
      throw new Error('Google Gemini API key is required');
    }

    const baseUrl = (
      this.profile.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/$/, '');
    const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.profile.apiKey)}`;

    const system = request.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const contents = request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0,
        ...(request.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
      },
    };
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...this.profile.extraHeaders,
    };

    const payload = await postJson<GeminiResponse>(url, headers, body, this.profile.timeoutMs);
    const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Gemini returned empty content');
    }
    return { content, model, provider: 'google' };
  }
}
