"use server";

import { SYSTEM_CATEGORIES } from "@/src/lib/constants";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";

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

export interface SuggestedMatch {
  bankItem: ReconciliationItem;
  creditItem: ReconciliationItem;
}

export interface ReconciliationOverview {
  monthKey: string;
  bankCharges: ReconciliationItem[];
  creditDetails: ReconciliationItem[];
  unmatchedBankTotal: number;
  unmatchedCreditTotal: number;
  suggestedMatches: SuggestedMatch[];
}

function formatDateForUI(dateObj: Date): string {
  const d = dateObj.getDate().toString().padStart(2, "0");
  const m = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1;

  if (month === 0) {
    month = 12;
    year -= 1;
  }

  return `${year}-${month.toString().padStart(2, "0")}`;
}

export async function getReconciliationData(
  monthKey: string,
): Promise<ReconciliationOverview> {
  const previousMonthKey = getPreviousMonthKey(monthKey);

  const transactions = await prisma.transaction.findMany({
    where: {
      monthKey: {
        in: [monthKey, previousMonthKey],
      },
    },
    include: { category: true, account: true }, // <--- הוסף את account: true
    orderBy: { date: "desc" },
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
    const isCreditCardSummaryCharge =
      t.category?.isNeutralized ||
      t.category?.name === SYSTEM_CATEGORIES.CREDIT_CARD_TRANSFER.NAME;
    const rawAmt = Number(t.amount);
    const sourceName = t.account?.name || t.account?.provider || "ללא חשבון";
    const isBankAccount = t.account?.type === "bank";

    if (isCreditCardSummaryCharge && t.monthKey === monthKey) {
      const amt = Math.abs(rawAmt);
      const match = matches.find((m) => m.bankTransactionId === t.id);
      const isMatched = matchedBankIds.has(t.id);
      if (!isMatched) unmatchedBankTotal += amt;
      bankCharges.push({
        id: t.id,
        date: formatDateForUI(new Date(t.date)),
        description: t.description,
        amount: amt,
        source: sourceName,
        isMatched,
        matchedToId: match?.creditTransactionId,
        matchedToDescription: match?.creditTransaction?.description,
      });
    } else if (!isCreditCardSummaryCharge && !isBankAccount) {
      // תנועת אשראי: חיוב הוא שלילי (נציג כחיובי), זיכוי הוא חיובי (נציג כמקזז)
      const effectiveCreditAmt = -rawAmt;
      const match = matches.find((m) => m.creditTransactionId === t.id);
      const isMatched = matchedCreditIds.has(t.id);
      if (!isMatched && t.monthKey === monthKey) {
        unmatchedCreditTotal += effectiveCreditAmt;
      }
      const isPrevMonth = t.monthKey === previousMonthKey;
      creditDetails.push({
        id: t.id,
        date: formatDateForUI(new Date(t.date)),
        description: `${t.description}${isPrevMonth ? " (חודש קודם)" : ""}`,
        amount: effectiveCreditAmt,
        source: sourceName,
        isMatched,
        matchedToId: match?.bankTransactionId,
        matchedToDescription: match?.bankTransaction?.description,
      });
    }
  });

  // חישוב הצעות התאמה אוטומטיות (על בסיס זהות בסכום לתנועות פתוחות)
  const suggestedMatches: SuggestedMatch[] = [];
  const unmatchedBanks = bankCharges.filter((b) => !b.isMatched);
  const unmatchedCredits = [...creditDetails.filter((c) => !c.isMatched)];

  unmatchedBanks.forEach((b) => {
    const creditIndex = unmatchedCredits.findIndex(
      (c) => Math.abs(c.amount - b.amount) < 0.01,
    );

    if (creditIndex !== -1) {
      const matchedCredit = unmatchedCredits.splice(creditIndex, 1)[0];
      suggestedMatches.push({
        bankItem: b,
        creditItem: matchedCredit,
      });
    }
  });

  return {
    monthKey,
    bankCharges,
    creditDetails,
    unmatchedBankTotal,
    unmatchedCreditTotal,
    suggestedMatches,
  };
}

export async function createMatchAction(
  bankTransactionId: string,
  creditTransactionId: string,
  monthKey: string,
) {
  await prisma.creditMatch.create({
    data: {
      monthKey,
      bankTransactionId,
      creditTransactionId,
    },
  });

  revalidatePath("/reconciliation");
  revalidatePath("/");
}

// אישור גורף של כל ההצעות המוצעות בלחיצת כפתור אחת
export async function applyAllSuggestedMatchesAction(
  suggestions: SuggestedMatch[],
  monthKey: string,
) {
  await Promise.all(
    suggestions.map((s) =>
      prisma.creditMatch.create({
        data: {
          monthKey,
          bankTransactionId: s.bankItem.id,
          creditTransactionId: s.creditItem.id,
        },
      }),
    ),
  );

  revalidatePath("/reconciliation");
  revalidatePath("/");
}

export async function removeMatchAction(
  bankTransactionId: string,
  creditTransactionId: string,
) {
  await prisma.creditMatch.deleteMany({
    where: {
      bankTransactionId,
      creditTransactionId,
    },
  });

  revalidatePath("/reconciliation");
  revalidatePath("/");
}
