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

  const bcrypt = await import('bcryptjs');
  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@openeventhub.local';
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? 'ChangeMeNow!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      role: 'admin',
    },
    update: {
      passwordHash,
      role: 'admin',
    },
  });

  await prisma.aiRuntimeSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  });

  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://ollama:11434/v1';
  const ollamaModel = process.env.OLLAMA_MODEL ?? 'llama3.2';

  const existingOllama = await prisma.aiProviderProfile.findFirst({
    where: { name: 'Local Ollama' },
  });

  const ollama = existingOllama
    ? await prisma.aiProviderProfile.update({
        where: { id: existingOllama.id },
        data: {
          type: 'ollama',
          baseUrl: ollamaBaseUrl,
          model: ollamaModel,
          enabled: true,
          // Local models often need more than the 60s schema default.
          timeoutMs: Math.max(existingOllama.timeoutMs, 180_000),
        },
      })
    : await prisma.aiProviderProfile.create({
        data: {
          name: 'Local Ollama',
          type: 'ollama',
          baseUrl: ollamaBaseUrl,
          model: ollamaModel,
          enabled: true,
          timeoutMs: 180_000,
        },
      });

  const runtime = await prisma.aiRuntimeSettings.findUnique({ where: { id: 'singleton' } });
  if (!runtime?.activeProviderProfileId) {
    await prisma.aiRuntimeSettings.update({
      where: { id: 'singleton' },
      data: { activeProviderProfileId: ollama.id },
    });
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
