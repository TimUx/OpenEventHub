import { createHealthResult } from '@openeventhub/shared';

const SERVICE_NAME = 'frontend';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.1.0';

export function GET(): Response {
  return Response.json(createHealthResult(SERVICE_NAME, SERVICE_VERSION));
}
