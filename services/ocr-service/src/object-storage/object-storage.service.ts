import { Injectable } from '@nestjs/common';

import { createObjectStorageClient } from './object-storage.factory.js';
import type {
  GetObjectParams,
  GetObjectResult,
  ObjectStorageClient,
  PutObjectParams,
  PutObjectResult,
} from './object-storage.client.js';

@Injectable()
export class ObjectStorageService {
  private client: ObjectStorageClient = createObjectStorageClient();

  setClientForTests(client: ObjectStorageClient): void {
    this.client = client;
  }

  putObject(params: PutObjectParams): Promise<PutObjectResult> {
    return this.client.putObject(params);
  }

  getObject(params: GetObjectParams): Promise<GetObjectResult> {
    return this.client.getObject(params);
  }
}
