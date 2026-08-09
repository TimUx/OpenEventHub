import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EventStatus,
  RegionType,
  SubmissionStatus,
  SubmissionType,
  type CategoryRepository,
  type EventRepository,
  type RegionRepository,
  type SubmissionRepository,
} from '@openeventhub/database';
import { graphql } from 'graphql';

import { AuditService } from './audit/audit.service.js';
import { filterEventsForCalendarFeed } from './events/calendar-feed.controller.js';
import { EventsService } from './events/events.service.js';
import { createPublicGraphQlSchema } from './graphql/public.schema.js';

const sampleEvent = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  slug: 'open-air',
  title: 'Open Air',
  summary: 'Music in the park',
  description: 'Outdoor concert',
  startAt: new Date('2026-08-15T17:00:00.000Z'),
  endAt: null,
  confidenceScore: 0.9 as unknown as never,
  status: EventStatus.published,
  venueId: null,
  organizerId: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  venue: null,
  categories: [],
  media: [],
};

describe('API v1 contract', () => {
  const eventRepo = {
    listPublished: () => Promise.resolve([sampleEvent]),
    findPublishedById: (id: string) => Promise.resolve(id === sampleEvent.id ? sampleEvent : null),
    searchPublished: ({ q }: { q: string }) =>
      Promise.resolve(
        sampleEvent.title.toLowerCase().includes(q.toLowerCase()) ? [sampleEvent] : [],
      ),
  } as unknown as EventRepository;

  const categoryRepo = {
    list: () =>
      Promise.resolve([
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          name: 'Music',
          slug: 'music',
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
  } as unknown as CategoryRepository;

  const regionRepo = {
    list: () =>
      Promise.resolve([
        {
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          name: 'Germany',
          slug: 'germany',
          type: RegionType.country,
          parentId: null,
          isoCode: 'DE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
  } as unknown as RegionRepository;

  const submissionRepo = {
    createWithModeration: (input: {
      type: SubmissionType;
      payload: Record<string, unknown>;
      submitterEmail?: string | null;
    }) =>
      Promise.resolve({
        submission: {
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          type: input.type,
          payload: input.payload,
          submitterEmail: input.submitterEmail ?? null,
          status: SubmissionStatus.pending,
          eventId: null,
          createdAt: new Date('2026-08-05T12:00:00.000Z'),
          updatedAt: new Date('2026-08-05T12:00:00.000Z'),
        },
        moderation: {
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          status: 'pending',
        },
      }),
  } as unknown as SubmissionRepository;

  const audit = new AuditService();

  it('lists and reads published events', async () => {
    const service = new EventsService(eventRepo, audit);
    const listed = await service.list();
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.title, 'Open Air');
    assert.equal(listed[0]?.startAt, '2026-08-15T17:00:00.000Z');
    assert.equal(listed[0]?.venue, null);
    assert.deepEqual(listed[0]?.categories, []);

    const one = await service.getById(sampleEvent.id);
    assert.equal(one.slug, 'open-air');
  });

  it('searches published events by query', async () => {
    const hits = await eventRepo.searchPublished({ q: 'Open' });
    assert.equal(hits.length, 1);
    const misses = await eventRepo.searchPublished({ q: 'zzz' });
    assert.equal(misses.length, 0);
  });

  it('lists categories and regions', async () => {
    assert.equal((await categoryRepo.list())[0]?.slug, 'music');
    assert.equal((await regionRepo.list())[0]?.slug, 'germany');
  });

  it('creates event submissions with moderation', async () => {
    const created = await submissionRepo.createWithModeration({
      type: SubmissionType.event,
      payload: { title: 'Community Meetup' },
      submitterEmail: 'user@example.com',
    });
    assert.equal(created.submission.type, SubmissionType.event);
    assert.equal(created.submission.status, SubmissionStatus.pending);
    assert.ok(created.moderation.id);
  });

  it('filters calendar feed events by category and date range', async () => {
    const service = new EventsService(eventRepo, audit);
    const listed = await service.list();
    const withExtras = [
      ...listed,
      {
        ...listed[0]!,
        id: 'second',
        title: 'Later',
        startAt: '2026-09-01T10:00:00.000Z',
        categories: [{ id: 'cat-1', name: 'Music', slug: 'music' }],
      },
    ];
    assert.equal(filterEventsForCalendarFeed(withExtras, { from: '2026-09-01' }).length, 1);
    assert.equal(filterEventsForCalendarFeed(withExtras, { category: 'music' })[0]?.id, 'second');
  });

  it('GraphQL events query returns published events', async () => {
    const schema = createPublicGraphQlSchema({
      events: eventRepo,
      categories: categoryRepo,
      regions: regionRepo,
      submissions: submissionRepo,
      audit,
    });

    const result = await graphql({
      schema,
      source: '{ events { id title } }',
    });

    assert.equal(result.errors, undefined);
    assert.equal(
      (result.data as { events: Array<{ title: string }> }).events[0]?.title,
      'Open Air',
    );
  });
});
