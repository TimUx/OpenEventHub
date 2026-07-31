import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from '../ports/llm.provider.js';

/**
 * Port-boundary fake for tests. Not a business mock — scripts canned completions.
 */
export class FakeLlmProvider implements LlmProvider {
  readonly calls: LlmCompletionRequest[] = [];

  constructor(
    private readonly responses: readonly string[],
    private readonly provider = 'fake',
    private readonly model = 'fake-model',
  ) {}

  completeChat(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    this.calls.push(request);
    const index = this.calls.length - 1;
    const content = this.responses[index];
    if (content === undefined) {
      return Promise.reject(new Error(`FakeLlmProvider has no response for call #${index + 1}`));
    }
    return Promise.resolve({
      content,
      model: this.model,
      provider: this.provider,
    });
  }
}
