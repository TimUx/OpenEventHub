import { createReadinessResult } from '@openeventhub/shared';

const SERVICE_NAME = 'admin';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.1.0';

export function GET(): Response {
  return Response.json(createReadinessResult(SERVICE_NAME, SERVICE_VERSION, { runtime: 'ok' }));
}
