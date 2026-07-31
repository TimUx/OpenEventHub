/**
 * Queue names for BullMQ workers.
 * See docs/QUEUE_AND_WORKERS.md.
 */

export const QUEUE_NAMES = {
  discovery: 'discovery',
  crawl: 'crawl',
  ocr: 'ocr',
  ai: 'ai',
  geocoding: 'geocoding',
  searchIndex: 'search-index',
  notifications: 'notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
