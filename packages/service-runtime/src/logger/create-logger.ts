import pino, { type Logger } from 'pino';

/**
 * Creates a structured JSON logger for a backend service shell.
 */
export function createLogger(serviceName: string): Logger {
  const level = process.env['LOG_LEVEL'] ?? 'info';

  return pino({
    name: serviceName,
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
