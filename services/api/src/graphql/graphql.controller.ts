import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  CategoryRepository,
  EventRepository,
  RegionRepository,
  SubmissionRepository,
} from '@openeventhub/database';
import { graphql, type GraphQLSchema } from 'graphql';

import { AuditService } from '../audit/audit.service.js';
import { createPublicGraphQlSchema } from './public.schema.js';

@ApiExcludeController()
@Controller('graphql')
export class GraphQlController {
  private readonly schema: GraphQLSchema;

  constructor(
    events: EventRepository,
    categories: CategoryRepository,
    regions: RegionRepository,
    submissions: SubmissionRepository,
    audit: AuditService,
  ) {
    this.schema = createPublicGraphQlSchema({
      events,
      categories,
      regions,
      submissions,
      audit,
    });
  }

  @Post()
  @HttpCode(200)
  async handle(
    @Body()
    body: {
      query?: string;
      variables?: Record<string, unknown>;
      operationName?: string;
    },
  ) {
    if (!body.query || typeof body.query !== 'string') {
      throw new BadRequestException('GraphQL query string is required');
    }

    return graphql({
      schema: this.schema,
      source: body.query,
      variableValues: body.variables,
      operationName: body.operationName,
    });
  }
}
