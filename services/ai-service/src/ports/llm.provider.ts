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

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
