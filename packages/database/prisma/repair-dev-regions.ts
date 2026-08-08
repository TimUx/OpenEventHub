/**
 * Repair DEV region hierarchy to Land → Bundesland → Landkreis → Kommune → Ort.
 *
 *   DATABASE_URL=... npx tsx packages/database/prisma/repair-dev-regions.ts
 */
import { PrismaClient, RegionType } from '@prisma/client';

const prisma = new PrismaClient();

/** Administrative Kommunen in Schwalm-Eder relevant to current DEV data. */
const KOMMUNEN = [
  'Willingshausen',
  'Schwalmstadt',
  'Frielendorf',
  'Gilserberg',
  'Jesberg',
  'Neukirchen',
  'Oberaula',
  'Neuental',
  'Schrecksbach',
  'Knüllwald',
  'Homberg (Efze)',
  'Bad Zwesten',
  'Borken (Hessen)',
] as const;

/**
 * Ort → Kommune for names that currently pollute the flat municipality list.
 * Keys are matched case-insensitively after alias normalization.
 */
const ORT_TO_KOMMUNE: Record<string, string> = {
  merzhausen: 'Willingshausen',
  loshausen: 'Willingshausen',
  steina: 'Willingshausen',
  wasenberg: 'Willingshausen',
  zella: 'Willingshausen',
  gungelshausen: 'Willingshausen',
  leimbach: 'Willingshausen',
  ransbach: 'Willingshausen',
  treysa: 'Schwalmstadt',
  treyesa: 'Schwalmstadt',
  ziegenhain: 'Schwalmstadt',
  trutzhain: 'Schwalmstadt',
  ascherode: 'Schwalmstadt',
  florshain: 'Schwalmstadt',
  mengsberg: 'Schwalmstadt',
  frankenhain: 'Schwalmstadt',
  niedergrenzebach: 'Schwalmstadt',
  obergrenzebach: 'Schwalmstadt',
  allendorf: 'Schwalmstadt',
  'allendorf/landsburg': 'Schwalmstadt',
  frielingen: 'Frielendorf',
  leimsfeld: 'Frielendorf',
  lenderscheid: 'Frielendorf',
  großropperhausen: 'Frielendorf',
  grossropperhausen: 'Frielendorf',
  speckwinkel: 'Frielendorf',
  stolzenbach: 'Frielendorf',
  sebbeterode: 'Gilserberg',
  sachsenhausen: 'Gilserberg',
  schorbach: 'Gilserberg',
  hundshausen: 'Jesberg',
  dodenhausen: 'Jesberg',
  elnrode: 'Jesberg',
  nassenerfurth: 'Jesberg',
  riebelsdorf: 'Neukirchen',
  christerode: 'Neukirchen',
  schlierbach: 'Neukirchen',
  momberg: 'Neukirchen',
  olberode: 'Oberaula',
  friedigerode: 'Oberaula',
  friedigeröd: 'Oberaula',
  zimmersrode: 'Neuental',
  schwenden: 'Schrecksbach',
  holzhausen: 'Gilserberg',
  bottendorf: 'Frielendorf',
  josbach: 'Neukirchen',
  kleinengelis: 'Frielendorf',
  mandern: 'Bad Zwesten',
  niederurff: 'Bad Zwesten',
  roppershain: 'Oberaula',
  schmidtlotheim: 'Knüllwald',
  schönau: 'Gilserberg',
  schoenau: 'Gilserberg',
};

const ALIASES: Record<string, string> = {
  germany: 'Deutschland',
  'bundesland hessen': 'Hessen',
  'großgemeinde willingshausen': 'Willingshausen',
  'grossgemeinde willingshausen': 'Willingshausen',
  treyesa: 'Treysa',
  friedigeröd: 'Friedigerode',
};

const DELETE_NAMES = ['Bergstraum (part of Bernsburg municipality)'];

function norm(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .trim();
}

async function upsertNamed(
  name: string,
  type: RegionType,
  parentId: string | null,
  slug: string,
): Promise<{ id: string }> {
  const existing = await prisma.region.findFirst({
    where: {
      OR: [{ slug }, { name: { equals: name, mode: 'insensitive' } }],
    },
  });
  if (existing) {
    return prisma.region.update({
      where: { id: existing.id },
      data: { name, type, parentId, slug },
    });
  }
  return prisma.region.create({
    data: { name, type, parentId, slug },
  });
}

async function main(): Promise<void> {
  // Drop known junk rows (no children expected).
  for (const name of DELETE_NAMES) {
    const row = await prisma.region.findFirst({ where: { name } });
    if (row) {
      await prisma.region.delete({ where: { id: row.id } }).catch(() => undefined);
    }
  }

  // Merge aliases into canonical names.
  for (const [from, to] of Object.entries(ALIASES)) {
    const source = await prisma.region.findFirst({
      where: { name: { equals: from, mode: 'insensitive' } },
    });
    const target = await prisma.region.findFirst({
      where: { name: { equals: to, mode: 'insensitive' } },
    });
    if (!source) continue;
    if (!target) {
      await prisma.region.update({
        where: { id: source.id },
        data: { name: to },
      });
      continue;
    }
    if (source.id === target.id) continue;
    // Re-point children and venues, then delete duplicate.
    await prisma.region.updateMany({
      where: { parentId: source.id },
      data: { parentId: target.id },
    });
    await prisma.venue.updateMany({
      where: { regionId: source.id },
      data: { regionId: target.id },
    });
    await prisma.coverageScopeRegion
      .deleteMany({ where: { regionId: source.id } })
      .catch(() => undefined);
    await prisma.region.delete({ where: { id: source.id } }).catch(async () => {
      // If delete fails (FK), keep renamed away.
      await prisma.region.update({
        where: { id: source.id },
        data: { name: `${to} (dup)`, parentId: target.id },
      });
    });
  }

  const deutschland = await upsertNamed('Deutschland', RegionType.country, null, 'deutschland');
  const hessen = await upsertNamed('Hessen', RegionType.state, deutschland.id, 'hessen');
  const sek = await upsertNamed(
    'Schwalm-Eder-Kreis',
    RegionType.district,
    hessen.id,
    'schwalm-eder-kreis',
  );

  const kommuneIds = new Map<string, string>();
  for (const name of KOMMUNEN) {
    const slug = name
      .toLowerCase()
      .replace(/[()]/g, '')
      .replace(/\s+/g, '-')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');
    const row = await upsertNamed(name, RegionType.municipality, sek.id, slug);
    kommuneIds.set(norm(name), row.id);
  }

  // Promote/fix every remaining region under SEK hierarchy.
  const all = await prisma.region.findMany();
  for (const row of all) {
    if (row.id === deutschland.id || row.id === hessen.id || row.id === sek.id) continue;
    if (kommuneIds.has(norm(row.name))) {
      await prisma.region.update({
        where: { id: row.id },
        data: {
          type: RegionType.municipality,
          parentId: sek.id,
          name: row.name.replace(/^Großgemeinde\s+/i, ''),
        },
      });
      continue;
    }

    const key = norm(row.name);
    const kommuneName = ORT_TO_KOMMUNE[key];
    if (kommuneName) {
      let kommuneId = kommuneIds.get(norm(kommuneName));
      if (!kommuneId) {
        const created = await upsertNamed(
          kommuneName,
          RegionType.municipality,
          sek.id,
          norm(kommuneName).replace(/\s+/g, '-'),
        );
        kommuneId = created.id;
        kommuneIds.set(norm(kommuneName), kommuneId);
      }
      await prisma.region.update({
        where: { id: row.id },
        data: { type: RegionType.suburb, parentId: kommuneId },
      });
      continue;
    }

    // Legacy city → Kommune under SEK if already hanging flat.
    if (row.type === RegionType.city) {
      await prisma.region.update({
        where: { id: row.id },
        data: { type: RegionType.municipality, parentId: row.parentId ?? sek.id },
      });
    }
  }

  // Ensure Bayern/München seed path if present.
  const bayern = await prisma.region.findFirst({ where: { slug: 'bayern' } });
  if (bayern) {
    await prisma.region.update({
      where: { id: bayern.id },
      data: { type: RegionType.state, parentId: deutschland.id },
    });
    const muenchen = await prisma.region.findFirst({ where: { slug: 'muenchen' } });
    if (muenchen) {
      await prisma.region.update({
        where: { id: muenchen.id },
        data: { type: RegionType.municipality, parentId: bayern.id },
      });
    }
  }

  const summary = await prisma.region.groupBy({ by: ['type'], _count: true });
  console.warn('Region types after repair:', summary);
  const sample = await prisma.region.findMany({
    where: { name: { in: ['Merzhausen', 'Willingshausen', 'Hessen', 'Schwalm-Eder-Kreis'] } },
    include: { parent: true },
  });
  for (const row of sample) {
    console.warn(`${row.name} (${row.type}) ← ${row.parent?.name ?? '—'}`);
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
