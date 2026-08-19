'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export interface BudgetVsActualItem {
  categoryId: number;
  categoryName: string;
  categoryType: string;
  budgetAmount: number;
  actualAmount: number;
  difference: number;
  percentUsed: number;
}

export interface MaaserSummary {
  initialBalance: number;
  percentage: number;
  monthIncomeTotal: number;
  monthMaaserEligibleIncome: number;
  monthMaaserObligation: number;
  monthDonationsTotal: number;
  monthMaaserEligibleDonations: number;
  currentCumulativeBalance: number;
}

export interface MonthlyOverview {
  monthKey: string;
  totalPlannedIncome: number;
  totalActualIncome: number;
  totalPlannedExpenses: number;
  totalActualExpenses: number;
  totalPlannedSavings: number;
  totalActualSavings: number;
  totalPlannedDonations: number;
  totalActualDonations: number;
  netPlannedFree: number;
  netActualFree: number;
  incomeItems: BudgetVsActualItem[];
  expenseItems: BudgetVsActualItem[];
  savingsItems: BudgetVsActualItem[];
  donationItems: BudgetVsActualItem[];
  maaser: MaaserSummary;
}

export async function getBudgetVsActual(monthKey: string): Promise<MonthlyOverview> {
  try {
    const categories = await prisma.category.findMany({
      include: {
        budgets: { where: { monthKey } },
        transactions: { where: { monthKey } },
      },
      orderBy: { name: 'asc' },
    });

    let maaserSettings = await prisma.maaserSettings.findUnique({ where: { id: 1 } });
    if (!maaserSettings) {
      maaserSettings = await prisma.maaserSettings.create({
        data: { id: 1, initialBalance: 0, percentage: 10 },
      });
    }

    let totalPlannedIncome = 0;
    let totalActualIncome = 0;
    let monthMaaserEligibleIncome = 0;

    let totalPlannedExpenses = 0;
    let totalActualExpenses = 0;

    let totalPlannedSavings = 0;
    let totalActualSavings = 0;

    let totalPlannedDonations = 0;
    let totalActualDonations = 0;
    let monthMaaserEligibleDonations = 0;

    const incomeItems: BudgetVsActualItem[] = [];
    const expenseItems: BudgetVsActualItem[] = [];
    const savingsItems: BudgetVsActualItem[] = [];
    const donationItems: BudgetVsActualItem[] = [];

    categories.forEach((cat) => {
      // התעלמות מקטגוריות מנוטרלות (כמו כיסוי חיוב אשראי)
      if (cat.isNeutralized || cat.name === 'כיסוי חיוב אשראי (מנוטרל)') {
        return;
      }

      const budgetAmount = cat.budgets && cat.budgets[0] ? Number(cat.budgets[0].amount) : 0;
      let actualAmount = 0;

      if (cat.transactions) {
        cat.transactions.forEach((t) => {
          const amt = Math.abs(Number(t.amount));
          actualAmount += amt;

          if (cat.type === 'income' && t.isMaaserEligible) {
            monthMaaserEligibleIncome += amt;
          } else if (cat.type === 'donations' && t.isMaaserEligible) {
            monthMaaserEligibleDonations += amt;
          }
        });
      }

      const item: BudgetVsActualItem = {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryType: cat.type,
        budgetAmount,
        actualAmount,
        difference: cat.type === 'income' ? actualAmount - budgetAmount : budgetAmount - actualAmount,
        percentUsed: budgetAmount > 0 ? Math.round((actualAmount / budgetAmount) * 100) : 0,
      };

      if (cat.type === 'income') {
        totalPlannedIncome += budgetAmount;
        totalActualIncome += actualAmount;
        incomeItems.push(item);
      } else if (cat.type === 'savings') {
        totalPlannedSavings += budgetAmount;
        totalActualSavings += actualAmount;
        savingsItems.push(item);
      } else if (cat.type === 'donations') {
        totalPlannedDonations += budgetAmount;
        totalActualDonations += actualAmount;
        donationItems.push(item);
      } else {
        totalPlannedExpenses += budgetAmount;
        totalActualExpenses += actualAmount;
        expenseItems.push(item);
      }
    });

    const initialBal = Number(maaserSettings.initialBalance);
    const pct = Number(maaserSettings.percentage);
    const monthMaaserObligation = (monthMaaserEligibleIncome * pct) / 100;
    const currentCumulativeBalance = initialBal + monthMaaserObligation - monthMaaserEligibleDonations;

    return {
      monthKey,
      totalPlannedIncome,
      totalActualIncome,
      totalPlannedExpenses,
      totalActualExpenses,
      totalPlannedSavings,
      totalActualSavings,
      totalPlannedDonations,
      totalActualDonations,
      netPlannedFree: totalPlannedIncome - (totalPlannedExpenses + totalPlannedSavings + totalPlannedDonations),
      netActualFree: totalActualIncome - (totalActualExpenses + totalActualSavings + totalActualDonations),
      incomeItems,
      expenseItems,
      savingsItems,
      donationItems,
      maaser: {
        initialBalance: initialBal,
        percentage: pct,
        monthIncomeTotal: totalActualIncome,
        monthMaaserEligibleIncome,
        monthMaaserObligation,
        monthDonationsTotal: totalActualDonations,
        monthMaaserEligibleDonations,
        currentCumulativeBalance,
      },
    };
  } catch (error) {
    console.error('Error fetching budget data:', error);
    throw error;
  }
}

export async function setCategoryBudgetAction(monthKey: string, categoryId: number, amount: number) {
  await prisma.budget.upsert({
    where: { monthKey_categoryId: { monthKey, categoryId } },
    update: { amount },
    create: { monthKey, categoryId, amount },
  });
  revalidatePath('/budget');
}

export async function updateMaaserSettingsAction(initialBalance: number, percentage: number) {
  await prisma.maaserSettings.upsert({
    where: { id: 1 },
    update: { initialBalance, percentage },
    create: { id: 1, initialBalance, percentage },
  });
  revalidatePath('/budget');
}