import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { PromptMeta, PromptRepository, PromptTemplate } from '../ports/prompt.repository.js';

export class FilePromptRepository implements PromptRepository {
  constructor(private readonly promptsRoot: string) {}

  async getPrompt(id: string, version: string): Promise<PromptTemplate> {
    const base = path.join(this.promptsRoot, id, version);
    const [metaRaw, system, user] = await Promise.all([
      readFile(path.join(base, 'meta.json'), 'utf8'),
      readFile(path.join(base, 'system.md'), 'utf8'),
      readFile(path.join(base, 'user.md'), 'utf8'),
    ]);

    const meta = JSON.parse(metaRaw) as PromptMeta;
    if (meta.id !== id || meta.version !== version) {
      throw new Error(
        `Prompt meta mismatch for ${id}@${version}: found ${meta.id}@${meta.version}`,
      );
    }

    return { meta, system, user };
  }
}
