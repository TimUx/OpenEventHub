import type { Prisma, PrismaClient, Source } from '@prisma/client';

export class SourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.SourceCreateInput): Promise<Source> {
    return this.prisma.source.create({ data });
  }

  findById(id: string): Promise<Source | null> {
    return this.prisma.source.findUnique({ where: { id } });
  }

  list(): Promise<Source[]> {
    return this.prisma.source.findMany({ orderBy: { name: 'asc' } });
  }
}
