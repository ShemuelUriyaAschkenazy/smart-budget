'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export interface CategoryItem {
  id: string;
  name: string;
  type: string;
  expectedAmount?: number | null;
  currentBalance?: number | null;
  _count?: {
    transactions: number;
  };
}

// שליפת הקטגוריות והמרת שדות Decimal למספרים רגילים
export async function getCategories(): Promise<CategoryItem[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    expectedAmount: c.expectedAmount ? Number(c.expectedAmount) : null,
    currentBalance: c.currentBalance ? Number(c.currentBalance) : null,
    _count: c._count,
  }));
}

export async function createCategoryAction(name: string, type: 'expense' | 'income') {
  if (!name.trim()) throw new Error('שם הקטגוריה אינו יכול להיות ריק');

  const existing = await prisma.category.findUnique({
    where: { name: name.trim() },
  });

  if (existing) {
    throw new Error('קטגוריה בשם זה כבר קיימת במערכת');
  }

  await prisma.category.create({
    data: {
      name: name.trim(),
      type,
    },
  });

  revalidatePath('/categories');
  revalidatePath('/rules');
  revalidatePath('/');
}

export async function deleteCategoryAction(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!category) {
    throw new Error('הקטגוריה לא נמצאה');
  }

  if (category._count.transactions > 0) {
    throw new Error(
      `לא ניתן למחוק את הקטגוריה "${category.name}" מכיוון שהיא מקושרת ל-${category._count.transactions} תנועות קיימות.`
    );
  }

  await prisma.category.delete({
    where: { id },
  });

  revalidatePath('/categories');
  revalidatePath('/rules');
  revalidatePath('/');
}