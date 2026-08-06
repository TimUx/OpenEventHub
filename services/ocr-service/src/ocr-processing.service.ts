import { Injectable, Logger } from '@nestjs/common';

import type { OcrJobPayload, OcrJobResult } from '@openeventhub/shared';

import type { AiJobPublisher } from './ai-job.publisher.js';
import { assertSupportedOcrMime } from './mime.js';
import { ObjectStorageService } from './object-storage/object-storage.service.js';
import type { OcrEngine } from './ports/ocr.engine.js';

@Injectable()
export class OcrProcessingService {
  private readonly logger = new Logger(OcrProcessingService.name);

  constructor(
    private readonly objectStorage: ObjectStorageService,
    private readonly engine: OcrEngine,
    private readonly aiJobs: AiJobPublisher,
  ) {}

  async process(job: OcrJobPayload): Promise<OcrJobResult> {
    const mimeType = assertSupportedOcrMime(job.mimeType);
    const object = await this.objectStorage.getObject({ key: job.objectKey });

    if (object.body.byteLength === 0) {
      throw new Error(`OCR file validation failed: empty object '${job.objectKey}'`);
    }

    const extraction = await this.engine.extractText({
      bytes: object.body,
      mimeType,
    });

    const textObjectKey = `${job.objectKey}.ocr.txt`;
    await this.objectStorage.putObject({
      key: textObjectKey,
      body: Buffer.from(extraction.text, 'utf-8'),
      contentType: 'text/plain; charset=utf-8',
    });

    await this.aiJobs.enqueueAi({
      content: extraction.text,
      ...(job.sourceUrl ? { sourceUrl: job.sourceUrl } : {}),
      ...(job.crawlResultId ? { crawlResultId: job.crawlResultId } : {}),
      ...(job.crawlJobId ? { jobId: job.crawlJobId } : {}),
      ...(job.sourceId ? { sourceId: job.sourceId } : {}),
    });

    this.logger.log(
      `OCR completed objectKey=${job.objectKey} language=${extraction.language ?? 'unknown'} chars=${extraction.text.length}`,
    );

    return {
      text: extraction.text,
      language: extraction.language,
      mimeType,
      objectKey: textObjectKey,
      ...(job.crawlResultId ? { crawlResultId: job.crawlResultId } : {}),
    };
  }
}
