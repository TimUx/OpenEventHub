/**
 * Upsert curated rural categories, remap event links, delete everything else.
 *
 *   DATABASE_URL=... npx tsx packages/database/prisma/reset-categories.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_CATEGORY_SLUGS,
  DEFAULT_EVENT_CATEGORIES,
  resolveDefaultCategorySlug,
} from '@openeventhub/shared';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  for (const category of DEFAULT_EVENT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: { slug: category.slug, name: category.name, parentId: null },
      update: { name: category.name, parentId: null },
    });
  }

  const curated = await prisma.category.findMany({
    where: { slug: { in: [...DEFAULT_CATEGORY_SLUGS] } },
  });
  const bySlug = new Map(curated.map((row) => [row.slug, row]));
  const sonstiges = bySlug.get('sonstiges');
  if (!sonstiges) {
    throw new Error('Missing curated category slug "sonstiges"');
  }

  const obsolete = await prisma.category.findMany({
    where: { slug: { notIn: [...DEFAULT_CATEGORY_SLUGS] } },
  });

  for (const old of obsolete) {
    const targetSlug =
      resolveDefaultCategorySlug(old.slug) ?? resolveDefaultCategorySlug(old.name) ?? 'sonstiges';
    const target = bySlug.get(targetSlug) ?? sonstiges;

    const links = await prisma.eventCategory.findMany({ where: { categoryId: old.id } });
    for (const link of links) {
      await prisma.eventCategory.upsert({
        where: {
          eventId_categoryId: { eventId: link.eventId, categoryId: target.id },
        },
        create: { eventId: link.eventId, categoryId: target.id },
        update: {},
      });
      if (link.categoryId !== target.id) {
        await prisma.eventCategory.delete({
          where: {
            eventId_categoryId: { eventId: link.eventId, categoryId: old.id },
          },
        });
      }
    }
  }

  // Children first (parent_id restrict), then parents.
  await prisma.category.deleteMany({
    where: {
      slug: { notIn: [...DEFAULT_CATEGORY_SLUGS] },
      children: { none: {} },
    },
  });
  await prisma.category.deleteMany({
    where: { slug: { notIn: [...DEFAULT_CATEGORY_SLUGS] } },
  });

  const remaining = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  console.warn(`Categories now (${remaining.length}): ${remaining.map((c) => c.name).join(', ')}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
