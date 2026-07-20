import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const db = new PrismaClient();

const ELECTRONICS_CATEGORIES = [
  { name: 'Audio', slug: 'audio' },
  { name: 'Computing', slug: 'computing' },
  { name: 'Mobile & Wearables', slug: 'mobile-wearables' },
  { name: 'Components & Parts', slug: 'components-parts' },
  { name: 'Home Automation', slug: 'home-automation' },
  { name: 'Gaming Hardware', slug: 'gaming-hardware' },
  { name: 'Networking', slug: 'networking' },
  { name: 'Cameras & Drones', slug: 'cameras-drones' },
];

async function main() {
  console.log('Seeding electronics categories…');
  for (const cat of ELECTRONICS_CATEGORIES) {
    await db.category.upsert({
      where: { slug: cat.slug },
      create: { ...cat, isElectronics: true },
      update: { isElectronics: true },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@electrohub.example';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    console.warn(
      'SEED_ADMIN_PASSWORD not set — skipping admin user creation. ' +
        'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars and re-run to create one.'
    );
  } else {
    const passwordHash = await hash(adminPassword, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
      algorithm: 2,
    });

    await db.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      create: {
        email: adminEmail.toLowerCase(),
        name: 'Platform Admin',
        passwordHash,
        role: 'SUPER_ADMIN',
      },
      update: {},
    });
    console.log(`Super admin ready: ${adminEmail}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
