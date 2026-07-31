import type { AiSettingsRepository } from '@openeventhub/database';
import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from '@openeventhub/ai-core';

/**
 * Resolves the active Admin-configured provider on every completion call.
 */
export class DatabaseBackedLlmProvider implements LlmProvider {
  constructor(private readonly settings: AiSettingsRepository) {}

  async completeChat(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const { provider } = await this.settings.resolveActiveLlmProvider();
    return provider.completeChat(request);
  }
}
