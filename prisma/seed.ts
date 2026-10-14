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
      isMaaserEligible: false,
      isNeutralized: true,
    },
  });

  await prisma.category.upsert({
    where: { name: 'העברה פנימית (מנוטרל)' },
    update: {},
    create: {
      name: 'העברה פנימית (מנוטרל)',
      type: 'transfer',
      isMaaserEligible: false,
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
      isMaaserEligible: false,
      isNeutralized: false,
    },
  });

  // 3. קטגוריות ברירת מחדל נפוצות (עם הגדרת סוג מתאימה)
  const defaultCategories = [
    { name: 'מזון וסופרמרקט', type: 'expense', isMaaserEligible: false },
    { name: 'חטיפים ומסעדות', type: 'expense', isMaaserEligible: false },
    { name: 'דיור ומגורים', type: 'expense', isMaaserEligible: false },
    { name: 'תחבורה ודלק', type: 'expense', isMaaserEligible: false },
    { name: 'משכנתא / שכר דירה', type: 'expense', isMaaserEligible: false },
    { name: 'השקעות וחיסכון', type: 'savings', isMaaserEligible: false },
    { name: 'חשבונות ומיסים', type: 'expense', isMaaserEligible: false },
    { name: 'קניות וביגוד', type: 'expense', isMaaserEligible: false },
    { name: 'בריאות ופנאי', type: 'expense', isMaaserEligible: false },
    { name: 'משכורת והכנסה', type: 'income', isMaaserEligible: true },
    { name: 'תרומות ומעשרות', type: 'donations', isMaaserEligible: true },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        type: cat.type,
        isMaaserEligible: cat.isMaaserEligible,
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