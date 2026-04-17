// filepath: apps/server/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create admin user
  const adminPasswordHash = await bcrypt.hash('Admin2024!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gabinet.pl' },
    update: {},
    create: {
      email: 'admin@gabinet.pl',
      name: 'Administrator',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      loyaltyTier: 'GOLD',
      loyaltyPoints: 9999
    }
  });

  console.log(`Created admin user: ${admin.email}`);

  // Create test user
  const userPasswordHash = await bcrypt.hash('User2024!', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@gabinet.pl' },
    update: {},
    create: {
      email: 'user@gabinet.pl',
      name: 'Jan Kowalski',
      passwordHash: userPasswordHash,
      role: 'USER',
      loyaltyTier: 'BRONZE',
      loyaltyPoints: 0
    }
  });

  console.log(`Created test user: ${testUser.email}`);

  // Create some initial services
  const servicesData = [
    {
      name: 'Konsultacja Kosmetologiczna',
      slug: 'konsultacja-kosmetologiczna',
      description: 'Szczegółowa diagnoza skóry wraz ze spersonalizowanym planem pielęgnacyjnym.',
      price: 150.00,
      durationMinutes: 45,
      category: 'Konsultacje'
    },
    {
      name: 'Oczyszczanie Wodorowe',
      slug: 'oczyszczanie-wodorowe',
      description: 'Zabieg wieloetapowego oczyszczania skóry z wykorzystaniem aktywnego wodoru.',
      price: 250.00,
      durationMinutes: 60,
      category: 'Zabiegi na twarz'
    }
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: s
    });
  }

  console.log('Created initial services.');

  // Create loyalty rewards
  const rewardsData = [
    {
      name: 'Zniżka 50 PLN',
      description: 'Kupon rabatowy 50 PLN na dowolny zabieg.',
      pointsCost: 500
    },
    {
      name: 'Darmowa Konsultacja',
      description: 'Bezpłatna konsultacja kontrolna.',
      pointsCost: 700
    }
  ];

  for (const r of rewardsData) {
    const existing = await prisma.loyaltyReward.findFirst({ where: { name: r.name }});
    if (!existing) {
      await prisma.loyaltyReward.create({ data: r });
    }
  }

  console.log('Created initial loyalty rewards.');

  // Seed SkinTypeAdvice (5 records, one per skin type)
  const skinTypes: Array<'SUCHA' | 'TLUSTA' | 'MIESZANA' | 'NORMALNA' | 'WRAZLIWA'> = [
    'SUCHA', 'TLUSTA', 'MIESZANA', 'NORMALNA', 'WRAZLIWA',
  ];
  for (const skinType of skinTypes) {
    await prisma.skinTypeAdvice.upsert({
      where: { skinType },
      update: {},
      create: { skinType, content: '' },
    });
  }
  console.log('Seeded 5 SkinTypeAdvice records');

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
