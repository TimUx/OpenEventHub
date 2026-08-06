import type { Category, PrismaClient } from '@prisma/client';

export type CategoryWriteInput = {
  readonly name: string;
  readonly slug: string;
  readonly parentId?: string | null;
};

export type CategoryUpdateInput = {
  readonly name?: string;
  readonly slug?: string;
  readonly parentId?: string | null;
};

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

  create(data: CategoryWriteInput): Promise<Category> {
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId ?? null,
      },
    });
  }

  update(id: string, data: CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      },
    });
  }

  delete(id: string): Promise<Category> {
    return this.prisma.category.delete({ where: { id } });
  }

  countChildren(id: string): Promise<number> {
    return this.prisma.category.count({ where: { parentId: id } });
  }
}
