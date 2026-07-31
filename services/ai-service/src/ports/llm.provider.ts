/**
 * Re-export port types from ai-core for local DI tokens used by Nest wiring.
 */
export type {
  ChatMessage,
  ChatRole,
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from '@openeventhub/ai-core';

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
