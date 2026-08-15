import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultCategories = [
    'מזון וסופרמרקט',
    'חטיפים ומסעדות',
    'דיור ומגורים',
    'תחבורה ודלק',
    'משכנתא / שכר דירה',
    'השקעות וחיסכון',
    'חשבונות ומיסים',
    'קניות וביגוד',
    'בריאות ופנאי',
    'משכורת והכנסה',
  ];

  for (const name of defaultCategories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Categories seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });