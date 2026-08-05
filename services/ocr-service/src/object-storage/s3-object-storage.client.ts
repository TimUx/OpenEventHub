import type {
  GetObjectParams,
  GetObjectResult,
  ObjectStorageClient,
  PutObjectParams,
  PutObjectResult,
} from './object-storage.client.js';

type S3Module = {
  S3Client: new (config: Record<string, unknown>) => {
    send: (command: unknown) => Promise<unknown>;
  };
  PutObjectCommand: new (input: Record<string, unknown>) => unknown;
  GetObjectCommand: new (input: Record<string, unknown>) => unknown;
};

export class S3ObjectStorageClient implements ObjectStorageClient {
  private s3: InstanceType<S3Module['S3Client']> | undefined;
  private PutObjectCommand: S3Module['PutObjectCommand'] | undefined;
  private GetObjectCommand: S3Module['GetObjectCommand'] | undefined;

  private readonly region: string;
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(
    private readonly bucket: string,
    endpoint: string,
    accessKeyId: string,
    secretAccessKey: string,
    region = process.env.AWS_REGION ?? 'us-east-1',
  ) {
    this.region = region;
    this.endpoint = endpoint;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
  }

  private async ensureClientInitialized(): Promise<void> {
    if (this.s3 && this.PutObjectCommand && this.GetObjectCommand) {
      return;
    }

    const mod = (await import('@aws-sdk/client-s3')) as unknown as S3Module;
    this.s3 = new mod.S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      forcePathStyle: true,
    });
    this.PutObjectCommand = mod.PutObjectCommand;
    this.GetObjectCommand = mod.GetObjectCommand;
  }

  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    await this.ensureClientInitialized();
    await this.s3!.send(
      new this.PutObjectCommand!({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
    return { key: params.key };
  }

  async getObject(params: GetObjectParams): Promise<GetObjectResult> {
    await this.ensureClientInitialized();
    const response = (await this.s3!.send(
      new this.GetObjectCommand!({
        Bucket: this.bucket,
        Key: params.key,
      }),
    )) as {
      Body?: { transformToByteArray?: () => Promise<Uint8Array> };
      ContentType?: string;
    };

    if (!response.Body?.transformToByteArray) {
      throw new Error(`S3 getObject returned empty body for key=${params.key}`);
    }

    const bytes = await response.Body.transformToByteArray();
    return {
      key: params.key,
      body: Buffer.from(bytes),
      ...(response.ContentType ? { contentType: response.ContentType } : {}),
    };
  }
}
