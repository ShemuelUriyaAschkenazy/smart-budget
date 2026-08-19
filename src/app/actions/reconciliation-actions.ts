'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export interface ReconciliationItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  source: string;
  isMatched: boolean;
  matchedToId?: string;
  matchedToDescription?: string;
}

export interface ReconciliationOverview {
  monthKey: string;
  bankCharges: ReconciliationItem[];
  creditDetails: ReconciliationItem[];
  unmatchedBankTotal: number;
  unmatchedCreditTotal: number;
}

function formatDateForUI(dateObj: Date): string {
  const d = dateObj.getDate().toString().padStart(2, '0');
  const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

// חישוב חודש קודם בפורמט YYYY-MM
function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1;

  if (month === 0) {
    month = 12;
    year -= 1;
  }

  return `${year}-${month.toString().padStart(2, '0')}`;
}

export async function getReconciliationData(monthKey: string): Promise<ReconciliationOverview> {
  const previousMonthKey = getPreviousMonthKey(monthKey);

  // שליפת תנועות מהחודש הנוכחי והחודש הקודם [previousMonthKey, monthKey]
  const transactions = await prisma.transaction.findMany({
    where: {
      monthKey: {
        in: [monthKey, previousMonthKey],
      },
    },
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  const matches = await prisma.creditMatch.findMany({
    where: {
      monthKey: {
        in: [monthKey, previousMonthKey],
      },
    },
    include: {
      bankTransaction: true,
      creditTransaction: true,
    },
  });

  const matchedBankIds = new Set(matches.map((m) => m.bankTransactionId));
  const matchedCreditIds = new Set(matches.map((m) => m.creditTransactionId));

  const bankCharges: ReconciliationItem[] = [];
  const creditDetails: ReconciliationItem[] = [];

  let unmatchedBankTotal = 0;
  let unmatchedCreditTotal = 0;

  transactions.forEach((t) => {
    const isBankCharge =
      t.category?.isNeutralized || t.category?.name === 'כיסוי חיוב אשראי (מנוטרל)';
    const amt = Math.abs(Number(t.amount));

    // חיובי בנק מוצגים רק מהחודש הנבחר הנוכחי
    if (isBankCharge && t.monthKey === monthKey) {
      const match = matches.find((m) => m.bankTransactionId === t.id);
      const isMatched = matchedBankIds.has(t.id);

      if (!isMatched) unmatchedBankTotal += amt;

      bankCharges.push({
        id: t.id,
        date: formatDateForUI(new Date(t.date)),
        description: t.description,
        amount: amt,
        source: t.source || 'בנק',
        isMatched,
        matchedToId: match?.creditTransactionId,
        matchedToDescription: match?.creditTransaction?.description,
      });
    } 
    // עסקאות אשראי מוצגות גם מהחודש הנוכחי וגם מהחודש הקודם
    else if (!isBankCharge && t.source && t.source !== 'בנק הפועלים' && t.source !== 'בנק דיסקונט') {
      const match = matches.find((m) => m.creditTransactionId === t.id);
      const isMatched = matchedCreditIds.has(t.id);

      if (!isMatched && t.monthKey === monthKey) unmatchedCreditTotal += amt;

      const isPrevMonth = t.monthKey === previousMonthKey;

      creditDetails.push({
        id: t.id,
        date: formatDateForUI(new Date(t.date)),
        description: `${t.description}${isPrevMonth ? ' (חודש קודם)' : ''}`,
        amount: amt,
        source: t.source,
        isMatched,
        matchedToId: match?.bankTransactionId,
        matchedToDescription: match?.bankTransaction?.description,
      });
    }
  });

  return {
    monthKey,
    bankCharges,
    creditDetails,
    unmatchedBankTotal,
    unmatchedCreditTotal,
  };
}

export async function createMatchAction(bankTransactionId: string, creditTransactionId: string, monthKey: string) {
  await prisma.creditMatch.create({
    data: {
      monthKey,
      bankTransactionId,
      creditTransactionId,
    },
  });

  revalidatePath('/reconciliation');
  revalidatePath('/');
}

export async function removeMatchAction(bankTransactionId: string, creditTransactionId: string) {
  await prisma.creditMatch.deleteMany({
    where: {
      bankTransactionId,
      creditTransactionId,
    },
  });

  revalidatePath('/reconciliation');
  revalidatePath('/');
}