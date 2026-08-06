import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  Kind,
} from 'graphql';
import type { GraphQLScalarTypeConfig, ValueNode } from 'graphql';
import type {
  CategoryRepository,
  EventRepository,
  RegionRepository,
  SubmissionRepository,
  Prisma,
} from '@openeventhub/database';
import { SubmissionType } from '@openeventhub/database';

import type { AuditService } from '../audit/audit.service.js';

const GraphQLJSON = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral(ast: ValueNode) {
    if (
      ast.kind === Kind.STRING ||
      ast.kind === Kind.BOOLEAN ||
      ast.kind === Kind.INT ||
      ast.kind === Kind.FLOAT
    ) {
      return 'value' in ast ? ast.value : null;
    }
    if (ast.kind === Kind.NULL) {
      return null;
    }
    throw new GraphQLError(
      'JSON literal parsing supports primitives only; use variables for objects',
    );
  },
} satisfies GraphQLScalarTypeConfig<unknown, unknown>);

function mapEvent(event: {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  status: string;
}) {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    description: event.description,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt?.toISOString() ?? null,
    allDay: event.allDay,
    status: event.status,
  };
}

export type PublicGraphQlDeps = {
  readonly events: EventRepository;
  readonly categories: CategoryRepository;
  readonly regions: RegionRepository;
  readonly submissions: SubmissionRepository;
  readonly audit: AuditService;
};

export function createPublicGraphQlSchema(deps: PublicGraphQlDeps): GraphQLSchema {
  const EventType = new GraphQLObjectType({
    name: 'Event',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      slug: { type: new GraphQLNonNull(GraphQLString) },
      title: { type: new GraphQLNonNull(GraphQLString) },
      summary: { type: GraphQLString },
      description: { type: GraphQLString },
      startAt: { type: new GraphQLNonNull(GraphQLString) },
      endAt: { type: GraphQLString },
      allDay: { type: new GraphQLNonNull(GraphQLBoolean) },
      status: { type: new GraphQLNonNull(GraphQLString) },
    },
  });

  const CategoryType = new GraphQLObjectType({
    name: 'Category',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      name: { type: new GraphQLNonNull(GraphQLString) },
      slug: { type: new GraphQLNonNull(GraphQLString) },
      parentId: { type: GraphQLID },
    },
  });

  const RegionType = new GraphQLObjectType({
    name: 'Region',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      name: { type: new GraphQLNonNull(GraphQLString) },
      slug: { type: new GraphQLNonNull(GraphQLString) },
      type: { type: new GraphQLNonNull(GraphQLString) },
      parentId: { type: GraphQLID },
    },
  });

  const SubmissionResultType = new GraphQLObjectType({
    name: 'SubmissionResult',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      type: { type: new GraphQLNonNull(GraphQLString) },
      status: { type: new GraphQLNonNull(GraphQLString) },
      moderationId: { type: new GraphQLNonNull(GraphQLID) },
    },
  });

  async function createSubmission(
    type: SubmissionType,
    args: { payload: Record<string, unknown>; submitterEmail?: string },
  ) {
    if (!args.payload || typeof args.payload !== 'object') {
      throw new GraphQLError('payload object is required');
    }

    const result = await deps.submissions.createWithModeration({
      type,
      payload: args.payload as Prisma.InputJsonValue,
      submitterEmail: args.submitterEmail ?? null,
    });

    deps.audit.record({
      action: type === SubmissionType.event ? 'graphql.submitEvent' : 'graphql.submitSource',
      resourceType: 'user_submission',
      resourceId: result.submission.id,
    });

    return {
      id: result.submission.id,
      type: result.submission.type,
      status: result.submission.status,
      moderationId: result.moderation.id,
    };
  }

  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        events: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(EventType))),
          args: {
            limit: { type: GraphQLInt },
            offset: { type: GraphQLInt },
          },
          resolve: async (_root, args: { limit?: number; offset?: number }) => {
            const rows = await deps.events.listPublished({
              ...(args.limit !== undefined ? { limit: args.limit } : {}),
              ...(args.offset !== undefined ? { offset: args.offset } : {}),
            });
            return rows.map(mapEvent);
          },
        },
        event: {
          type: EventType,
          args: { id: { type: new GraphQLNonNull(GraphQLID) } },
          resolve: async (_root, args: { id: string }) => {
            const row = await deps.events.findPublishedById(args.id);
            return row ? mapEvent(row) : null;
          },
        },
        categories: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(CategoryType))),
          resolve: async () => deps.categories.list(),
        },
        regions: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(RegionType))),
          resolve: async () => deps.regions.list(),
        },
        search: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(EventType))),
          args: {
            q: { type: new GraphQLNonNull(GraphQLString) },
            limit: { type: GraphQLInt },
            offset: { type: GraphQLInt },
          },
          resolve: async (_root, args: { q: string; limit?: number; offset?: number }) => {
            const rows = await deps.events.searchPublished(args);
            return rows.map(mapEvent);
          },
        },
      },
    }),
    mutation: new GraphQLObjectType({
      name: 'Mutation',
      fields: {
        submitEvent: {
          type: new GraphQLNonNull(SubmissionResultType),
          args: {
            payload: { type: new GraphQLNonNull(GraphQLJSON) },
            submitterEmail: { type: GraphQLString },
          },
          resolve: async (
            _root,
            args: { payload: Record<string, unknown>; submitterEmail?: string },
          ) => createSubmission(SubmissionType.event, args),
        },
        submitSource: {
          type: new GraphQLNonNull(SubmissionResultType),
          args: {
            payload: { type: new GraphQLNonNull(GraphQLJSON) },
            submitterEmail: { type: GraphQLString },
          },
          resolve: async (
            _root,
            args: { payload: Record<string, unknown>; submitterEmail?: string },
          ) => createSubmission(SubmissionType.source, args),
        },
      },
    }),
  });
}
