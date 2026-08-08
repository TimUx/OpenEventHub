import type { Category, PrismaClient } from '@prisma/client';

export class CategoryImportAllowlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listCategoryIds(): Promise<string[]> {
    const rows = await this.prisma.categoryImportAllowlist.findMany({
      select: { categoryId: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => row.categoryId);
  }

  async listCategories(): Promise<Category[]> {
    const rows = await this.prisma.categoryImportAllowlist.findMany({
      include: { category: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => row.category);
  }

  /**
   * Replace the allowlist set. Empty array disables category filtering.
   */
  async setCategoryIds(categoryIds: readonly string[]): Promise<string[]> {
    const unique = [...new Set(categoryIds.map((id) => id.trim()).filter(Boolean))];
    await this.prisma.$transaction(async (tx) => {
      await tx.categoryImportAllowlist.deleteMany();
      if (unique.length > 0) {
        await tx.categoryImportAllowlist.createMany({
          data: unique.map((categoryId) => ({ categoryId })),
        });
      }
    });
    return this.listCategoryIds();
  }
}
