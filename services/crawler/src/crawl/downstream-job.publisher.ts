import type { AiJobPayload, OcrJobPayload } from '@openeventhub/shared';

export interface DownstreamJobPublisher {
  enqueueAi(payload: AiJobPayload): Promise<void>;
  enqueueOcr(payload: OcrJobPayload): Promise<void>;
}

export class NoopDownstreamJobPublisher implements DownstreamJobPublisher {
  enqueueAi(): Promise<void> {
    return Promise.resolve();
  }

  enqueueOcr(): Promise<void> {
    return Promise.resolve();
  }
}
