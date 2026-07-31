import net from 'node:net';

import type { HealthStatus } from '@openeventhub/shared';

export async function probeTcp(
  host: string,
  port: number,
  timeoutMs = 2000,
): Promise<HealthStatus> {
  return await new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (status: HealthStatus) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(status);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish('ok'));
    socket.once('timeout', () => finish('error'));
    socket.once('error', () => finish('error'));
    socket.connect(port, host);
  });
}
