import type { AiJobPayload } from '@openeventhub/shared';

export interface AiJobPublisher {
  enqueueAi(payload: AiJobPayload): Promise<void>;
}

export class NoopAiJobPublisher implements AiJobPublisher {
  enqueueAi(): Promise<void> {
    return Promise.resolve();
  }
}
