/**
 * BullMQ job payload contracts for the crawler/discovery pipeline.
 * Keep these types serializable (JSON) because BullMQ stores job data in Redis.
 */

export interface CrawlJobPayload {
  /** The database identifier of the `Source` to crawl. */
  readonly sourceId: string;
}
