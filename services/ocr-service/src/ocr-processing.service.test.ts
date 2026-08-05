import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FakeOcrEngine } from './adapters/fake-ocr.engine.js';
import { NoopAiJobPublisher } from './ai-job.publisher.js';
import { OcrProcessingService } from './ocr-processing.service.js';
import { FsObjectStorageClient } from './object-storage/fs-object-storage.client.js';
import { ObjectStorageService } from './object-storage/object-storage.service.js';

describe('OcrProcessingService', () => {
  it('validates, extracts text, stores OCR output, and enqueues AI', async () => {
    const root = '/tmp/openeventhub-ocr-processing-test';
    const storageClient = new FsObjectStorageClient(root);
    const objectKey = 'crawl-results/job/fixture.png';
    await storageClient.putObject({
      key: objectKey,
      body: Buffer.from('fake-image-bytes'),
      contentType: 'image/png',
    });

    const objectStorage = new ObjectStorageService();
    objectStorage.setClientForTests(storageClient);

    const aiCalls: unknown[] = [];
    const aiJobs = {
      enqueueAi: (payload: unknown) => {
        aiCalls.push(payload);
        return Promise.resolve();
      },
    };

    const service = new OcrProcessingService(
      objectStorage,
      new FakeOcrEngine('Open Air im Stadtpark', 'deu'),
      aiJobs,
    );

    const result = await service.process({
      objectKey,
      mimeType: 'image/png',
      crawlResultId: '33333333-3333-4333-8333-333333333333',
      sourceUrl: 'https://example.test/flyer.png',
      crawlJobId: '22222222-2222-4222-8222-222222222222',
    });

    assert.equal(result.text, 'Open Air im Stadtpark');
    assert.equal(result.language, 'deu');
    assert.equal(result.objectKey, `${objectKey}.ocr.txt`);

    const stored = await storageClient.getObject({ key: result.objectKey });
    assert.equal(stored.body.toString('utf-8'), 'Open Air im Stadtpark');
    assert.equal(aiCalls.length, 1);
  });

  it('rejects unsupported mime types', async () => {
    const objectStorage = new ObjectStorageService();
    objectStorage.setClientForTests(new FsObjectStorageClient('/tmp/openeventhub-ocr-reject'));
    const service = new OcrProcessingService(
      objectStorage,
      new FakeOcrEngine('unused'),
      new NoopAiJobPublisher(),
    );

    await assert.rejects(
      () =>
        service.process({
          objectKey: 'x',
          mimeType: 'text/plain',
        }),
      /unsupported mime type/i,
    );
  });
});
