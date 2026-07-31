export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
}

export interface LlmCompletionRequest {
  readonly messages: readonly ChatMessage[];
  readonly model?: string;
  readonly temperature?: number;
  readonly responseFormat?: 'json' | 'text';
}

export interface LlmCompletionResult {
  readonly content: string;
  readonly model: string;
  readonly provider: string;
}

export interface LlmProvider {
  completeChat(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
}

export type AiProviderTypeName =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure_openai'
  | 'openrouter'
  | 'ollama'
  | 'custom_openai';

export interface AiProviderProfileConfig {
  readonly id: string;
  readonly name: string;
  readonly type: AiProviderTypeName;
  readonly baseUrl: string | null;
  readonly apiKey: string | null;
  readonly model: string;
  readonly organizationId: string | null;
  readonly projectId: string | null;
  readonly extraHeaders: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
}
