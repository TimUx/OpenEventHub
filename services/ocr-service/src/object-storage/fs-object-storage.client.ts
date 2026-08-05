import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  GetObjectParams,
  GetObjectResult,
  ObjectStorageClient,
  PutObjectParams,
  PutObjectResult,
} from './object-storage.client.js';

export class FsObjectStorageClient implements ObjectStorageClient {
  constructor(private readonly rootDir: string) {}

  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    const targetPath = path.join(this.rootDir, params.key);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, params.body);
    return { key: params.key };
  }

  async getObject(params: GetObjectParams): Promise<GetObjectResult> {
    const targetPath = path.join(this.rootDir, params.key);
    const body = await fs.readFile(targetPath);
    return { key: params.key, body };
  }
}
