import type { ModerationItem, PrismaClient, UserSubmission } from '@prisma/client';
import { type ModerationStatus, SubmissionStatus } from '@prisma/client';

export type ModerationListItem = ModerationItem & {
  readonly userSubmission: UserSubmission | null;
  readonly event: { id: string; title: string; status: string } | null;
};

export type DecideModerationInput = {
  readonly status: 'approved' | 'rejected' | 'escalated';
  readonly reviewedBy: string;
  readonly notes?: string | null;
};

export class ModerationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(status?: ModerationStatus, limit = 100): Promise<ModerationListItem[]> {
    const take = Math.min(Math.max(limit, 1), 200);
    return this.prisma.moderationItem.findMany({
      ...(status ? { where: { status } } : {}),
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        userSubmission: true,
        event: { select: { id: true, title: true, status: true } },
      },
    });
  }

  findById(id: string): Promise<ModerationListItem | null> {
    return this.prisma.moderationItem.findUnique({
      where: { id },
      include: {
        userSubmission: true,
        event: { select: { id: true, title: true, status: true } },
      },
    });
  }

  countByStatus(): Promise<Record<string, number>> {
    return this.prisma.moderationItem
      .groupBy({ by: ['status'], _count: { _all: true } })
      .then((rows) => Object.fromEntries(rows.map((row) => [row.status, row._count._all])));
  }

  async decide(id: string, input: DecideModerationInput): Promise<ModerationListItem> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.moderationItem.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Moderation item ${id} not found`);
      }

      const updated = await tx.moderationItem.update({
        where: { id },
        data: {
          status: input.status,
          reviewedBy: input.reviewedBy,
          reviewedAt: new Date(),
          notes: input.notes ?? existing.notes,
        },
        include: {
          userSubmission: true,
          event: { select: { id: true, title: true, status: true } },
        },
      });

      if (existing.userSubmissionId) {
        const submissionStatus =
          input.status === 'approved'
            ? SubmissionStatus.accepted
            : input.status === 'rejected'
              ? SubmissionStatus.rejected
              : SubmissionStatus.pending;

        await tx.userSubmission.update({
          where: { id: existing.userSubmissionId },
          data: { status: submissionStatus },
        });
      }

      return updated;
    });
  }
}
