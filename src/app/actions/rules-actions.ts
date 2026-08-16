'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export interface RuleItem {
  id: string;
  keyword: string;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
}

export async function getRules(): Promise<RuleItem[]> {
  const data = await prisma.rule.findMany({
    orderBy: { keyword: 'asc' },
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
  });

  return data.map((r) => ({
    id: r.id,
    keyword: r.keyword,
    categoryId: r.categoryId,
    category: {
      id: r.category.id,
      name: r.category.name,
    },
  }));
}

export async function createRuleAction(keyword: string, categoryId: number) {
  if (!keyword.trim()) throw new Error('מילת המפתח אינה יכולה להיות ריקה');
  if (!categoryId) throw new Error('חובה לבחור קטגוריה');

  const existing = await prisma.rule.findUnique({
    where: { keyword: keyword.trim().toLowerCase() },
  });

  if (existing) {
    throw new Error(`כבר קיים חוק עבור מילת המפתח "${keyword.trim()}"`);
  }

  await prisma.rule.create({
    data: {
      keyword: keyword.trim().toLowerCase(),
      categoryId,
    },
  });

  revalidatePath('/rules');
  revalidatePath('/');
}

export async function deleteRuleAction(id: string) {
  await prisma.rule.delete({
    where: { id },
  });

  revalidatePath('/rules');
  revalidatePath('/');
}