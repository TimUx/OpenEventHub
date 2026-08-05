export interface PutObjectParams {
  readonly key: string;
  readonly body: Buffer;
  readonly contentType: string;
}

export interface PutObjectResult {
  readonly key: string;
}

export interface GetObjectParams {
  readonly key: string;
}

export interface GetObjectResult {
  readonly key: string;
  readonly body: Buffer;
  readonly contentType?: string;
}

/**
 * Nest DI token for an `ObjectStorageClient` implementation.
 * Interfaces are erased at runtime, so we need a stable token.
 */
export const OBJECT_STORAGE_CLIENT_TOKEN = Symbol('OBJECT_STORAGE_CLIENT_TOKEN');

export interface ObjectStorageClient {
  putObject(params: PutObjectParams): Promise<PutObjectResult>;
  getObject(params: GetObjectParams): Promise<GetObjectResult>;
}
