import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubmissionRepository, SubmissionType } from '@openeventhub/database';

import { AuditService } from '../audit/audit.service.js';

type SubmissionBody = {
  readonly payload?: Record<string, unknown>;
  readonly submitterEmail?: string;
};

@ApiTags('submissions')
@Controller('api/v1')
export class SubmissionsController {
  constructor(
    private readonly submissions: SubmissionRepository,
    private readonly audit: AuditService,
  ) {}

  @Post('submissions')
  @ApiOperation({ summary: 'Submit a public event proposal' })
  async submitEvent(@Body() body: SubmissionBody) {
    return this.create(SubmissionType.event, body);
  }

  @Post('source-submissions')
  @ApiOperation({ summary: 'Submit a public source proposal' })
  async submitSource(@Body() body: SubmissionBody) {
    return this.create(SubmissionType.source, body);
  }

  private async create(type: SubmissionType, body: SubmissionBody) {
    if (!body.payload || typeof body.payload !== 'object') {
      throw new BadRequestException('payload object is required');
    }

    const result = await this.submissions.createWithModeration({
      type,
      payload: body.payload,
      submitterEmail: body.submitterEmail ?? null,
    });

    this.audit.record({
      action: type === SubmissionType.event ? 'submissions.event' : 'submissions.source',
      resourceType: 'user_submission',
      resourceId: result.submission.id,
      metadata: { moderationId: result.moderation.id },
    });

    return {
      id: result.submission.id,
      type: result.submission.type,
      status: result.submission.status,
      moderationId: result.moderation.id,
      createdAt: result.submission.createdAt,
    };
  }
}
