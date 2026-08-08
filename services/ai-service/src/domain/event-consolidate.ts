import type { ExtractedEventFields } from '@openeventhub/shared';
import type { Event, EventStatus, Prisma } from '@prisma/client';

const MATCHABLE_STATUSES: EventStatus[] = ['draft', 'pending_moderation', 'published'];

export type ConsolidateCandidate = {
  readonly id: string;
  readonly title: string;
  readonly summary: string | null;
  readonly description: string | null;
  readonly startAt: Date;
  readonly endAt: Date | null;
  readonly allDay: boolean;
  readonly confidenceScore: Prisma.Decimal | number;
  readonly venueId: string | null;
  readonly venueName: string | null;
  readonly venueCity: string | null;
};

export type EventConsolidateDb = {
  event: {
    findMany(args: {
      where: {
        status: { in: EventStatus[] };
        startAt: { gte: Date; lt: Date };
      };
      include: { venue: true };
      take: number;
    }): Promise<
      Array<
        Event & {
          venue: { name: string; city: string | null } | null;
        }
      >
    >;
    findUnique(args: { where: { id: string } }): Promise<Event | null>;
    update(args: { where: { id: string }; data: Prisma.EventUpdateInput }): Promise<Event>;
  };
  eventSource: {
    findUnique(args: {
      where: { sourceId_externalId: { sourceId: string; externalId: string } };
    }): Promise<{ id: string; eventId: string } | null>;
    findFirst(args: {
      where: { eventId: string; sourceId: string };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        eventId: string;
        sourceId: string;
        externalId: string | null;
        sourceUrl: string | null;
        confidenceScore: number;
      };
    }): Promise<unknown>;
    count(args: { where: { eventId: string } }): Promise<number>;
  };
  eventVersion: {
    findFirst(args: {
      where: { eventId: string };
      orderBy: { versionNumber: 'desc' };
    }): Promise<{ versionNumber: number } | null>;
    create(args: {
      data: {
        eventId: string;
        versionNumber: number;
        title: string;
        startAt: Date;
        endAt: Date | null;
        allDay: boolean;
        venueId: string | null;
        organizerId: string | null;
        confidenceScore: number | Prisma.Decimal;
        status: EventStatus;
        changeReason: string;
      };
    }): Promise<unknown>;
  };
};

/**
 * Normalize titles for duplicate matching (case/umlaut/punct/year insensitive).
 */
export function normalizeTitleKey(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b20\d{2}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function utcDayBounds(startAt: Date): { readonly gte: Date; readonly lt: Date } {
  const gte = new Date(
    Date.UTC(startAt.getUTCFullYear(), startAt.getUTCMonth(), startAt.getUTCDate()),
  );
  const lt = new Date(gte);
  lt.setUTCDate(lt.getUTCDate() + 1);
  return { gte, lt };
}

export function titlesMatch(a: string, b: string): boolean {
  const keysFor = (title: string): string[] => {
    const full = normalizeTitleKey(title);
    const head = normalizeTitleKey(title.split(/\s*[—–|\-]\s*/)[0] ?? title);
    return [...new Set([full, head].filter((value) => value.length > 0))];
  };

  const leftKeys = keysFor(a);
  const rightKeys = keysFor(b);
  for (const left of leftKeys) {
    for (const right of rightKeys) {
      if (left === right) return true;

      // Allow minor suffix/prefix drift ("Kirmes X" vs "Kirmes X am Markt").
      const shorter = left.length <= right.length ? left : right;
      const longer = left.length <= right.length ? right : left;
      if (shorter.length < 8) continue;
      if (!longer.includes(shorter)) continue;
      if (shorter.length / longer.length >= 0.72) return true;
    }
  }
  return false;
}

function normalizePlace(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return normalizeTitleKey(value);
}

/**
 * Venues reinforce a match; conflicting concrete venues block a merge.
 */
export function venuesCompatible(
  incoming: string | null | undefined,
  existingName: string | null | undefined,
  existingCity: string | null | undefined,
): boolean {
  const a = normalizePlace(incoming);
  if (!a) return true;
  const bName = normalizePlace(existingName);
  const bCity = normalizePlace(existingCity);
  if (!bName && !bCity) return true;
  if (bName && (a === bName || a.includes(bName) || bName.includes(a))) return true;
  if (bCity && (a === bCity || a.includes(bCity) || bCity.includes(a))) return true;
  return false;
}

export function pickLongerText(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const cur = current?.trim() || '';
  const next = incoming?.trim() || '';
  if (!cur) return next || null;
  if (!next) return cur;
  // Prefer richer content; keep current on ties.
  return next.length > cur.length ? next : cur;
}

export type CoalesceInput = {
  readonly title: string;
  readonly summary: string | null;
  readonly description: string | null;
  readonly startAt: Date;
  readonly endAt: Date | null;
  readonly allDay: boolean;
  readonly confidenceScore: number;
};

/**
 * Fill missing/empty fields only; never shrink richer text with thinner source data.
 */
export function coalesceEventFields(
  existing: {
    readonly title: string;
    readonly summary: string | null;
    readonly description: string | null;
    readonly endAt: Date | null;
    readonly allDay: boolean;
    readonly confidenceScore: Prisma.Decimal | number;
  },
  incoming: CoalesceInput,
): {
  readonly title: string;
  readonly summary: string | null;
  readonly description: string | null;
  readonly endAt: Date | null;
  readonly allDay: boolean;
  readonly confidenceScore: number;
  readonly changed: boolean;
} {
  const title =
    existing.title.trim().length >= incoming.title.trim().length ? existing.title : incoming.title;
  const summary = pickLongerText(existing.summary, incoming.summary);
  const description = pickLongerText(existing.description, incoming.description);
  const endAt = existing.endAt ?? incoming.endAt;
  // allDay stays true if either side is all-day and neither introduces a conflicting clock time policy:
  // prefer existing unless existing is allDay=false and incoming is allDay=true with no end — keep existing.
  const allDay = existing.allDay || incoming.allDay;
  const existingConfidence = Number(existing.confidenceScore);
  const confidenceScore = Math.max(
    Number.isFinite(existingConfidence) ? existingConfidence : 0,
    incoming.confidenceScore,
  );

  const changed =
    title !== existing.title ||
    summary !== (existing.summary ?? null) ||
    description !== (existing.description ?? null) ||
    (endAt?.toISOString() ?? null) !== (existing.endAt?.toISOString() ?? null) ||
    allDay !== existing.allDay ||
    confidenceScore !== existingConfidence;

  return { title, summary, description, endAt, allDay, confidenceScore, changed };
}

export function selectBestMatch(
  candidates: readonly ConsolidateCandidate[],
  title: string,
  venueName: string | null | undefined,
): ConsolidateCandidate | null {
  const matches = candidates.filter(
    (row) =>
      titlesMatch(title, row.title) && venuesCompatible(venueName, row.venueName, row.venueCity),
  );
  if (matches.length === 0) return null;
  // Prefer events that already have more filled fields / venue linked.
  matches.sort((a, b) => {
    const score = (row: ConsolidateCandidate) =>
      (row.venueId ? 2 : 0) +
      (row.description ? 1 : 0) +
      (row.summary ? 1 : 0) +
      Number(row.confidenceScore);
    return score(b) - score(a);
  });
  return matches[0] ?? null;
}

export async function findMatchingEvent(
  db: EventConsolidateDb,
  args: {
    readonly title: string;
    readonly startAt: Date;
    readonly venueName?: string | null;
  },
): Promise<ConsolidateCandidate | null> {
  const { gte, lt } = utcDayBounds(args.startAt);
  const rows = await db.event.findMany({
    where: {
      status: { in: MATCHABLE_STATUSES },
      startAt: { gte, lt },
    },
    include: { venue: true },
    take: 200,
  });

  const candidates: ConsolidateCandidate[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    description: row.description,
    startAt: row.startAt,
    endAt: row.endAt,
    allDay: row.allDay,
    confidenceScore: row.confidenceScore,
    venueId: row.venueId,
    venueName: row.venue?.name ?? null,
    venueCity: row.venue?.city ?? null,
  }));

  return selectBestMatch(candidates, args.title, args.venueName);
}

export async function ensureEventSourceLink(
  db: EventConsolidateDb,
  args: {
    readonly eventId: string;
    readonly sourceId: string;
    readonly externalId: string;
    readonly sourceUrl: string | null;
    readonly confidenceScore: number;
  },
): Promise<{ readonly linked: boolean; readonly sourceCount: number }> {
  const byExternal = await db.eventSource.findUnique({
    where: {
      sourceId_externalId: {
        sourceId: args.sourceId,
        externalId: args.externalId,
      },
    },
  });
  if (byExternal) {
    const sourceCount = await db.eventSource.count({ where: { eventId: args.eventId } });
    return { linked: false, sourceCount };
  }

  const already = await db.eventSource.findFirst({
    where: { eventId: args.eventId, sourceId: args.sourceId },
  });
  if (!already) {
    await db.eventSource.create({
      data: {
        eventId: args.eventId,
        sourceId: args.sourceId,
        externalId: args.externalId,
        sourceUrl: args.sourceUrl,
        confidenceScore: args.confidenceScore,
      },
    });
  }

  const sourceCount = await db.eventSource.count({ where: { eventId: args.eventId } });
  return { linked: !already, sourceCount };
}

export async function appendEventVersion(
  db: EventConsolidateDb,
  event: Event,
  changeReason: string,
): Promise<void> {
  const latest = await db.eventVersion.findFirst({
    where: { eventId: event.id },
    orderBy: { versionNumber: 'desc' },
  });
  await db.eventVersion.create({
    data: {
      eventId: event.id,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      allDay: event.allDay,
      venueId: event.venueId,
      organizerId: event.organizerId,
      confidenceScore: event.confidenceScore,
      status: event.status,
      changeReason,
    },
  });
}

export function buildExternalId(title: string, startAt: Date): string {
  return `${title}|${startAt.toISOString()}`.slice(0, 240);
}

export function extractionToCoalesceInput(
  extraction: ExtractedEventFields,
  startAt: Date,
  endAt: Date | null,
  allDay: boolean,
  confidenceScore: number,
): CoalesceInput {
  return {
    title: extraction.title!.trim(),
    summary: extraction.summary,
    description: extraction.description,
    startAt,
    endAt,
    allDay,
    confidenceScore,
  };
}
