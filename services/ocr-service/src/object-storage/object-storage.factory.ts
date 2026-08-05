import fs from 'node:fs';

import type { ObjectStorageClient } from './object-storage.client.js';
import { FsObjectStorageClient } from './fs-object-storage.client.js';
import { S3ObjectStorageClient } from './s3-object-storage.client.js';

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

export function createObjectStorageClient(): ObjectStorageClient {
  const adapter = (process.env.OBJECT_STORAGE_ADAPTER ?? '').toLowerCase();
  const s3Endpoint = env('S3_ENDPOINT');
  const useS3 = adapter === 's3' || (adapter !== 'fs' && Boolean(s3Endpoint));

  if (!useS3) {
    const rootDir = env('OBJECT_STORAGE_ROOT') ?? '/tmp/openeventhub-object-storage';
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }
    return new FsObjectStorageClient(rootDir);
  }

  const bucket = env('S3_BUCKET');
  if (!s3Endpoint || !bucket) {
    throw new Error('S3 object storage misconfigured: missing S3_ENDPOINT or S3_BUCKET');
  }

  const accessKeyId = env('S3_ACCESS_KEY') ?? '';
  const secretAccessKey = env('S3_SECRET_KEY') ?? '';
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3 object storage misconfigured: missing S3_ACCESS_KEY or S3_SECRET_KEY');
  }

  return new S3ObjectStorageClient(bucket, s3Endpoint, accessKeyId, secretAccessKey);
}
