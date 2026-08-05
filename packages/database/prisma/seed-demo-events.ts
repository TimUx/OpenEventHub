/**
 * Demo-Daten für UI-Screenshots (Frontend + Admin).
 * Voraussetzung: migrate + seed (Regionen/Kategorien/Admin) bereits gelaufen.
 *
 *   DATABASE_URL=... npx tsx packages/database/prisma/seed-demo-events.ts
 */
import { EventStatus, PrismaClient, SourceStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const muenchen = await prisma.region.findUnique({ where: { slug: 'muenchen' } });
  const concerts = await prisma.category.findUnique({ where: { slug: 'music-concerts' } });
  const theatre = await prisma.category.findUnique({ where: { slug: 'culture-theatre' } });
  const running = await prisma.category.findUnique({ where: { slug: 'sports-running' } });

  const venue = await prisma.venue.upsert({
    where: { slug: 'gasteig-hp8' },
    create: {
      slug: 'gasteig-hp8',
      name: 'Gasteig HP8',
      address: 'Hans-Preißinger-Str. 8',
      city: 'München',
      regionId: muenchen?.id,
      latitude: 48.1167,
      longitude: 11.5569,
    },
    update: {
      name: 'Gasteig HP8',
      city: 'München',
      regionId: muenchen?.id,
      latitude: 48.1167,
      longitude: 11.5569,
    },
  });

  const venue2 = await prisma.venue.upsert({
    where: { slug: 'olympiapark-muenchen' },
    create: {
      slug: 'olympiapark-muenchen',
      name: 'Olympiapark München',
      address: 'Spiridon-Louis-Ring 21',
      city: 'München',
      regionId: muenchen?.id,
      latitude: 48.1755,
      longitude: 11.5517,
    },
    update: {
      name: 'Olympiapark München',
      city: 'München',
      regionId: muenchen?.id,
      latitude: 48.1755,
      longitude: 11.5517,
    },
  });

  const organizer = await prisma.organizer.upsert({
    where: { slug: 'muenchner-kultur' },
    create: {
      slug: 'muenchner-kultur',
      name: 'Münchner Kultur e.V.',
      website: 'https://example.org/muenchner-kultur',
      email: 'info@example.org',
    },
    update: { name: 'Münchner Kultur e.V.' },
  });

  const sourceRss = await prisma.source.upsert({
    where: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    create: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'München Kultur RSS',
      pluginType: 'rss',
      url: 'https://example.org/muenchen-kultur.rss',
      scheduleCron: '0 */6 * * *',
      status: SourceStatus.healthy,
      lastCrawlAt: new Date(),
    },
    update: {
      name: 'München Kultur RSS',
      status: SourceStatus.healthy,
      lastCrawlAt: new Date(),
    },
  });

  const sourceHtml = await prisma.source.upsert({
    where: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    create: {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      name: 'Olympiapark Veranstaltungen',
      pluginType: 'html',
      url: 'https://example.org/olympiapark/events',
      scheduleCron: '30 */12 * * *',
      status: SourceStatus.healthy,
    },
    update: { name: 'Olympiapark Veranstaltungen', status: SourceStatus.healthy },
  });

  const events = [
    {
      slug: 'jazz-nacht-gasteig-2026',
      title: 'Jazz Nacht am Gasteig',
      summary: 'Internationale Jazzacts auf zwei Bühnen — Open Air und Hall.',
      description:
        'Die Jazz Nacht bringt Ensembles aus Europa und den USA nach München. Gates öffnen um 18:00, Hauptprogramm ab 20:00.',
      startAt: new Date('2026-09-12T18:00:00+02:00'),
      endAt: new Date('2026-09-13T01:00:00+02:00'),
      confidenceScore: 0.92,
      venueId: venue.id,
      organizerId: organizer.id,
      categoryId: concerts?.id,
    },
    {
      slug: 'sommerlauf-olympiapark-2026',
      title: 'Sommerlauf Olympiapark',
      summary: '10 km Volkslauf rund um den Olympiasee.',
      description:
        'Start und Ziel am Coubertinplatz. Anmeldung online; Startnummernabholung ab 08:00.',
      startAt: new Date('2026-08-23T09:00:00+02:00'),
      endAt: new Date('2026-08-23T13:00:00+02:00'),
      confidenceScore: 0.88,
      venueId: venue2.id,
      organizerId: organizer.id,
      categoryId: running?.id,
    },
    {
      slug: 'schiller-raeuber-residenztheater',
      title: 'Die Räuber — Residenztheater Gastspiel',
      summary: 'Schiller-Inszenierung als Gastspiel im HP8 Isarphilharmonie-Foyer.',
      description: 'Eine moderne Lesart von Schillers Klassiker. Einführung 30 Minuten vor Beginn.',
      startAt: new Date('2026-10-03T19:30:00+02:00'),
      endAt: new Date('2026-10-03T22:00:00+02:00'),
      confidenceScore: 0.85,
      venueId: venue.id,
      organizerId: organizer.id,
      categoryId: theatre?.id,
    },
  ] as const;

  for (const e of events) {
    const created = await prisma.event.upsert({
      where: { slug: e.slug },
      create: {
        slug: e.slug,
        title: e.title,
        summary: e.summary,
        description: e.description,
        startAt: e.startAt,
        endAt: e.endAt,
        confidenceScore: e.confidenceScore,
        status: EventStatus.published,
        venueId: e.venueId,
        organizerId: e.organizerId,
      },
      update: {
        title: e.title,
        summary: e.summary,
        description: e.description,
        startAt: e.startAt,
        endAt: e.endAt,
        confidenceScore: e.confidenceScore,
        status: EventStatus.published,
        venueId: e.venueId,
        organizerId: e.organizerId,
      },
    });

    if (e.categoryId) {
      await prisma.eventCategory.upsert({
        where: {
          eventId_categoryId: { eventId: created.id, categoryId: e.categoryId },
        },
        create: { eventId: created.id, categoryId: e.categoryId },
        update: {},
      });
    }

    await prisma.eventSource.upsert({
      where: {
        sourceId_externalId: {
          sourceId: sourceRss.id,
          externalId: e.slug,
        },
      },
      create: {
        eventId: created.id,
        sourceId: sourceRss.id,
        externalId: e.slug,
        sourceUrl: `https://example.org/events/${e.slug}`,
        confidenceScore: e.confidenceScore,
      },
      update: {
        eventId: created.id,
        sourceUrl: `https://example.org/events/${e.slug}`,
      },
    });
  }

  // second source link for first event (multi-source demo)
  const jazz = await prisma.event.findUnique({ where: { slug: 'jazz-nacht-gasteig-2026' } });
  if (jazz) {
    await prisma.eventSource.upsert({
      where: {
        sourceId_externalId: {
          sourceId: sourceHtml.id,
          externalId: 'jazz-nacht-html',
        },
      },
      create: {
        eventId: jazz.id,
        sourceId: sourceHtml.id,
        externalId: 'jazz-nacht-html',
        sourceUrl: 'https://example.org/olympiapark/events/jazz',
        confidenceScore: 0.8,
      },
      update: { eventId: jazz.id },
    });
  }

  console.warn('Demo events/sources seeded for screenshots.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
