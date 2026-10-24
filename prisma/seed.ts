import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 מתחיל להזין קטגוריות בסיס...');

  // 1. קטגוריות מנוטרלות (העברות וכיסוי אשראי)
  await prisma.category.upsert({
    where: { name: 'כיסוי חיוב אשראי (מנוטרל)' },
    update: {},
    create: {
      name: 'כיסוי חיוב אשראי (מנוטרל)',
      type: 'transfer',
      countInMaaserDefault: false,
      isNeutralized: true,
    },
  });

  await prisma.category.upsert({
    where: { name: 'העברה פנימית (מנוטרל)' },
    update: {},
    create: {
      name: 'העברה פנימית (מנוטרל)',
      type: 'transfer',
      countInMaaserDefault: false,
      isNeutralized: true,
    },
  });

  // 2. קטגוריית ברירת מחדל לתנועות ללא סיווג
  await prisma.category.upsert({
    where: { name: 'ללא קטגוריה' },
    update: {},
    create: {
      name: 'ללא קטגוריה',
      type: 'expense',
      countInMaaserDefault: false,
      isNeutralized: false,
    },
  });

  // 3. קטגוריות ברירת מחדל נפוצות (עם הגדרת סוג מתאימה)
  const defaultCategories = [
    { name: 'מזון וסופרמרקט', type: 'expense', countInMaaserDefault: false },
    { name: 'חטיפים ומסעדות', type: 'expense', countInMaaserDefault: false },
    { name: 'דיור ומגורים', type: 'expense', countInMaaserDefault: false },
    { name: 'תחבורה ודלק', type: 'expense', countInMaaserDefault: false },
    { name: 'משכנתא / שכר דירה', type: 'expense', countInMaaserDefault: false },
    { name: 'השקעות וחיסכון', type: 'savings', countInMaaserDefault: false },
    { name: 'חשבונות ומיסים', type: 'expense', countInMaaserDefault: false },
    { name: 'קניות וביגוד', type: 'expense', countInMaaserDefault: false },
    { name: 'בריאות ופנאי', type: 'expense', countInMaaserDefault: false },
    { name: 'משכורת והכנסה', type: 'income', countInMaaserDefault: true },
    { name: 'תרומות ומעשרות', type: 'donations', countInMaaserDefault: true },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        type: cat.type,
        countInMaaserDefault: cat.countInMaaserDefault,
      },
    });
  }

  // 4. הגדרות מעשר ראשוניות
  await prisma.maaserSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      initialBalance: 0,
      percentage: 10,
    },
  });

  console.log('✅ Categories and settings seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ שגיאה בהרצת ה-seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });