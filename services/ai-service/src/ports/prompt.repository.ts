export interface PromptMeta {
  readonly id: string;
  readonly version: string;
  readonly task: string;
  readonly description: string;
  readonly responseFormat: 'json' | 'text';
}

export interface PromptTemplate {
  readonly meta: PromptMeta;
  readonly system: string;
  readonly user: string;
}

export interface PromptRepository {
  getPrompt(id: string, version: string): Promise<PromptTemplate>;
}

export const PROMPT_REPOSITORY = Symbol('PROMPT_REPOSITORY');

export function renderTemplate(
  template: string,
  variables: Readonly<Record<string, string>>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return variables[key] ?? '';
  });
}
