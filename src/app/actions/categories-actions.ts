'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export interface CategoryItem {
  id: string;
  name: string;
  type: string;
  _count?: {
    transactions: number;
  };
}

// שליפת כל הקטגוריות כולל ספירת תנועות מקושרות
export async function getCategories(): Promise<CategoryItem[]> {
  return await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });
}

// הוספת קטגוריה חדשה
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
  revalidatePath('/');
}

// מחיקת קטגוריה עם הגנה על קטגוריות מקושרות
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

  // בדיקה מפורשת האם יש תנועות מקושרות
  if (category._count.transactions > 0) {
    throw new Error(
      `לא ניתן למחוק את הקטגוריה "${category.name}" מכיוון שהיא מקושרת ל-${category._count.transactions} תנועות קיימות.`
    );
  }

  await prisma.category.delete({
    where: { id },
  });

  revalidatePath('/categories');
  revalidatePath('/');
}