import { PrismaClient, RegionType } from '@prisma/client';

const prisma = new PrismaClient();

type RegionSeed = {
  slug: string;
  name: string;
  type: RegionType;
  isoCode?: string;
  children?: RegionSeed[];
};

type CategorySeed = {
  slug: string;
  name: string;
  children?: CategorySeed[];
};

const regionTree: RegionSeed[] = [
  {
    slug: 'germany',
    name: 'Germany',
    type: RegionType.country,
    isoCode: 'DE',
    children: [
      {
        slug: 'bayern',
        name: 'Bayern',
        type: RegionType.state,
        children: [
          {
            slug: 'muenchen',
            name: 'München',
            type: RegionType.city,
          },
        ],
      },
    ],
  },
];

const categoryTree: CategorySeed[] = [
  {
    slug: 'music',
    name: 'Music',
    children: [
      { slug: 'music-concerts', name: 'Concerts' },
      { slug: 'music-festivals', name: 'Festivals' },
    ],
  },
  {
    slug: 'sports',
    name: 'Sports',
    children: [
      { slug: 'sports-football', name: 'Football' },
      { slug: 'sports-running', name: 'Running' },
    ],
  },
  {
    slug: 'culture',
    name: 'Culture',
    children: [
      { slug: 'culture-theatre', name: 'Theatre' },
      { slug: 'culture-exhibitions', name: 'Exhibitions' },
    ],
  },
];

async function upsertRegion(node: RegionSeed, parentId?: string): Promise<void> {
  const region = await prisma.region.upsert({
    where: { slug: node.slug },
    create: {
      slug: node.slug,
      name: node.name,
      type: node.type,
      isoCode: node.isoCode ?? null,
      parentId: parentId ?? null,
    },
    update: {
      name: node.name,
      type: node.type,
      isoCode: node.isoCode ?? null,
      parentId: parentId ?? null,
    },
  });

  for (const child of node.children ?? []) {
    await upsertRegion(child, region.id);
  }
}

async function upsertCategory(node: CategorySeed, parentId?: string): Promise<void> {
  const category = await prisma.category.upsert({
    where: { slug: node.slug },
    create: {
      slug: node.slug,
      name: node.name,
      parentId: parentId ?? null,
    },
    update: {
      name: node.name,
      parentId: parentId ?? null,
    },
  });

  for (const child of node.children ?? []) {
    await upsertCategory(child, category.id);
  }
}

async function main(): Promise<void> {
  for (const region of regionTree) {
    await upsertRegion(region);
  }

  for (const category of categoryTree) {
    await upsertCategory(category);
  }
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
