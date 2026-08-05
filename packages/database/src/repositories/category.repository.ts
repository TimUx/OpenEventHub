import type { Category, PrismaClient } from '@prisma/client';

export class CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(): Promise<Category[]> {
    return this.prisma.category.findMany({
      orderBy: [{ name: 'asc' }],
    });
  }

  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { slug } });
  }
}
