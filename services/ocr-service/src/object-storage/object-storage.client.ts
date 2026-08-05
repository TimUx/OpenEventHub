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

export interface ObjectStorageClient {
  putObject(params: PutObjectParams): Promise<PutObjectResult>;
  getObject(params: GetObjectParams): Promise<GetObjectResult>;
}
