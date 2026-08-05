import type { ModerationItem, Prisma, PrismaClient, UserSubmission } from '@prisma/client';
import { ModerationStatus, SubmissionStatus, SubmissionType } from '@prisma/client';

export type CreateSubmissionInput = {
  readonly type: SubmissionType;
  readonly payload: Prisma.InputJsonValue;
  readonly submitterEmail?: string | null;
};

export class SubmissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createWithModeration(input: CreateSubmissionInput): Promise<{
    submission: UserSubmission;
    moderation: ModerationItem;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.userSubmission.create({
        data: {
          type: input.type,
          payload: input.payload,
          submitterEmail: input.submitterEmail ?? null,
          status: SubmissionStatus.pending,
        },
      });

      const moderation = await tx.moderationItem.create({
        data: {
          userSubmissionId: submission.id,
          status: ModerationStatus.pending,
          reason: 'public_submission',
        },
      });

      return { submission, moderation };
    });
  }

  findById(id: string): Promise<UserSubmission | null> {
    return this.prisma.userSubmission.findUnique({ where: { id } });
  }
}
