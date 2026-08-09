import type { Media, PrismaClient } from '@prisma/client';
import { MediaType } from '@prisma/client';

export type MediaWriteRow = {
  readonly type?: MediaType;
  readonly url: string;
  readonly objectKey?: string | null;
  readonly altText?: string | null;
  readonly sortOrder?: number;
};

/**
 * Persist event-attached media. MVP stores remote http(s) URLs without object upload.
 */
export class MediaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listForEvent(eventId: string): Promise<Media[]> {
    return this.prisma.media.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Replace image URL set for an event: keep existing matching URLs, insert new ones,
   * delete URLs no longer present. Does not invent media — empty input clears prior rows
   * only when `clearIfEmpty` is true.
   */
  async syncImageUrls(
    eventId: string,
    urls: readonly string[],
    options: { readonly clearIfEmpty?: boolean; readonly altText?: string | null } = {},
  ): Promise<Media[]> {
    const unique = [
      ...new Set(
        urls
          .map((url) => url.trim())
          .filter((url) => /^https?:\/\//i.test(url))
          .map((url) => url.slice(0, 2000)),
      ),
    ];

    if (unique.length === 0 && !options.clearIfEmpty) {
      return this.listForEvent(eventId);
    }

    const existing = await this.prisma.media.findMany({
      where: { eventId, type: MediaType.image },
    });
    const existingByUrl = new Map(
      existing.filter((row) => row.url).map((row) => [row.url as string, row]),
    );

    const keepIds = new Set<string>();
    let sortOrder = 0;
    for (const url of unique) {
      const prior = existingByUrl.get(url);
      if (prior) {
        keepIds.add(prior.id);
        if (prior.sortOrder !== sortOrder) {
          await this.prisma.media.update({
            where: { id: prior.id },
            data: { sortOrder },
          });
        }
      } else {
        const created = await this.prisma.media.create({
          data: {
            eventId,
            type: MediaType.image,
            url,
            objectKey: null,
            altText: options.altText ?? null,
            sortOrder,
          },
        });
        keepIds.add(created.id);
      }
      sortOrder += 1;
    }

    const staleIds = existing.filter((row) => !keepIds.has(row.id)).map((row) => row.id);
    if (staleIds.length > 0) {
      await this.prisma.media.deleteMany({ where: { id: { in: staleIds } } });
    }

    return this.listForEvent(eventId);
  }
}
