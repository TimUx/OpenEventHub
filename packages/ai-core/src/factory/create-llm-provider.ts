import { AnthropicProvider } from '../adapters/anthropic.provider.js';
import { GeminiProvider } from '../adapters/gemini.provider.js';
import { OpenAiCompatibleProvider } from '../adapters/openai-compatible.provider.js';
import type { AiProviderProfileConfig, LlmProvider } from '../ports/llm.provider.js';

export function createLlmProvider(profile: AiProviderProfileConfig): LlmProvider {
  switch (profile.type) {
    case 'anthropic':
      return new AnthropicProvider(profile);
    case 'google':
      return new GeminiProvider(profile);
    case 'openai':
    case 'azure_openai':
    case 'openrouter':
    case 'ollama':
    case 'custom_openai':
      return new OpenAiCompatibleProvider(profile);
    default: {
      const exhaustive: never = profile.type;
      throw new Error(`Unsupported provider type: ${String(exhaustive)}`);
    }
  }
}

export function defaultModelForType(type: AiProviderProfileConfig['type']): string {
  switch (type) {
    case 'openai':
    case 'azure_openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-sonnet-4-20250514';
    case 'google':
      return 'gemini-2.0-flash';
    case 'openrouter':
      return 'openai/gpt-4o-mini';
    case 'ollama':
      return 'llama3.2';
    case 'custom_openai':
      return 'gpt-4o-mini';
  }
}

export function defaultBaseUrlForType(type: AiProviderProfileConfig['type']): string | null {
  switch (type) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com';
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    case 'ollama':
      return 'http://host.docker.internal:11434/v1';
    case 'azure_openai':
    case 'custom_openai':
      return null;
  }
}
