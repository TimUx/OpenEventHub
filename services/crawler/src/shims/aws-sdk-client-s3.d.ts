declare module '@aws-sdk/client-s3' {
  export class S3Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config: any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send(command: any): Promise<any>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export class PutObjectCommand {
    constructor(input: any);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export class GetObjectCommand {
    constructor(input: any);
  }
}
