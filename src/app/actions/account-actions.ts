'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export interface AccountItem {
  id: string;
  name: string;
  type: string;
  provider: string;
  last4Digits?: string | null;
  isActive: boolean;
}

export interface AccountUploadStatus {
  account: AccountItem;
  hasUploadedThisMonth: boolean;
  transactionsCount: number;
}

export async function getAccounts(onlyActive = false): Promise<AccountItem[]> {
  const where = onlyActive ? { isActive: true } : {};
  return await prisma.financialAccount.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });
}

export async function createAccountAction(
  name: string,
  type: 'bank' | 'credit_card',
  provider: string,
  last4Digits?: string
) {
  if (!name.trim()) throw new Error('שם החשבון אינו יכול להיות ריק');

  const existing = await prisma.financialAccount.findUnique({
    where: { name: name.trim() },
  });

  if (existing) throw new Error('כבר קיים חשבון בשם זה');

  const cleanLast4 = last4Digits?.trim() || null;

  await prisma.financialAccount.create({
    data: {
      name: name.trim(),
      type,
      provider,
      last4Digits: cleanLast4,
      isActive: true,
    },
  });

  revalidatePath('/accounts');
  revalidatePath('/');
}

export async function toggleAccountActiveAction(id: string, isActive: boolean) {
  await prisma.financialAccount.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath('/accounts');
  revalidatePath('/');
}

export async function deleteAccountAction(id: string) {
  await prisma.financialAccount.delete({
    where: { id },
  });

  revalidatePath('/accounts');
  revalidatePath('/');
}

export async function getMonthlyAccountsChecklist(monthKey: string): Promise<AccountUploadStatus[]> {
  const activeAccounts = await prisma.financialAccount.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const monthTransactions = await prisma.transaction.findMany({
    where: { monthKey },
    select: { accountId: true },
  });

  const countsByAccountId = new Map<string, number>();
  monthTransactions.forEach((t) => {
    if (t.accountId) {
      countsByAccountId.set(t.accountId, (countsByAccountId.get(t.accountId) || 0) + 1);
    }
  });

  return activeAccounts.map((account) => {
    const count = countsByAccountId.get(account.id) || 0;
    return {
      account: {
        id: account.id,
        name: account.name,
        type: account.type,
        provider: account.provider,
        last4Digits: account.last4Digits,
        isActive: account.isActive,
      },
      hasUploadedThisMonth: count > 0,
      transactionsCount: count,
    };
  });
}