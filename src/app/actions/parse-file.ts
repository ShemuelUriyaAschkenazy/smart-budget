'use server';

import { GoogleGenAI, Type } from '@google/genai';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface TransactionRow {
  id?: string;
  date: string;
  description: string;
  amount: number;
  source?: string;
  category?: string;
  isMaaserEligible?: boolean;
}

function parseToDate(val: any): Date {
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }
  if (typeof val === 'string') {
    const parts = val.trim().split(/[\/.-]/);
    if (parts.length === 3) {
      if (parts[0].length <= 2 && parts[2].length === 4) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function formatDateForUI(dateObj: Date): string {
  const d = dateObj.getDate().toString().padStart(2, '0');
  const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

function getMonthKey(dateObj: Date): string {
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

export async function getTransactions(): Promise<TransactionRow[]> {
  const data = await prisma.transaction.findMany({
    include: {
      category: true,
    },
  });
  
  return data.map((t) => ({
    id: t.id,
    date: formatDateForUI(new Date(t.date)),
    description: t.description,
    amount: Number(t.amount),
    source: t.source || 'בנק הפועלים',
    category: t.category?.name || 'ללא קטגוריה',
    isMaaserEligible: t.isMaaserEligible,
  }));
}

export async function deleteTransactionAction(id: string) {
  await prisma.transaction.delete({ where: { id } });
  revalidatePath('/');
}

export async function clearAllTransactionsAction() {
  await prisma.transaction.deleteMany();
  revalidatePath('/');
}

export async function updateTransactionCategoryAction(transactionId: string, categoryName: string) {
  const category = await prisma.category.findUnique({
    where: { name: categoryName },
  });

  if (!category) throw new Error('הקטגוריה שנבחרה אינה קיימת');

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { 
      categoryId: category.id,
      isMaaserEligible: category.isMaaserEligible // סנכרון דגל המעשר לפי הדיפולט של הקטגוריה
    },
  });

  revalidatePath('/');
  revalidatePath('/budget');
}

// עדכון דגל מעשר ברמת התנועה הבודדת
export async function toggleTransactionMaaserAction(transactionId: string, isEligible: boolean) {
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { isMaaserEligible: isEligible },
  });

  revalidatePath('/');
  revalidatePath('/budget');
}

export async function processUploadedFile(formData: FormData) {
  const file = formData.get('file') as File;
  const sourceName = (formData.get('source') as string) || 'בנק הפועלים';
  
  if (!file) throw new Error('No file uploaded');

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  const rawRows: any[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < 6) return;

    const values = row.values as any[];
    const dateObj = parseToDate(values[1]);
    const description = values[2] ? String(values[2]).trim() : '';
    
    const debit = values[5] ? Number(String(values[5]).replace(/,/g, '')) : 0;
    const credit = values[6] ? Number(String(values[6]).replace(/,/g, '')) : 0;

    const amount = credit > 0 ? credit : -debit;

    if (description && (debit > 0 || credit > 0)) {
      rawRows.push({
        date: formatDateForUI(dateObj),
        rawDate: dateObj.toISOString(),
        description,
        amount,
      });
    }
  });

  const existingCategories = await prisma.category.findMany();
  const regularRules = await prisma.rule.findMany({
    include: { category: true },
  });

  let defaultCategory = existingCategories.find((c) => c.name === 'ללא קטגוריה');
  if (!defaultCategory) {
    defaultCategory = await prisma.category.create({
      data: { name: 'ללא קטגוריה', type: 'expense', isMaaserEligible: false }
    });
  }

  const categoryMap = new Map<string, { id: number; isMaaserEligible: boolean }>();
  existingCategories.forEach((c) => categoryMap.set(c.name, { id: c.id, isMaaserEligible: c.isMaaserEligible }));
  categoryMap.set(defaultCategory.name, { id: defaultCategory.id, isMaaserEligible: false });

  const preClassifiedItems: { date: string; description: string; amount: number; categoryId: number; categoryName: string; isMaaserEligible: boolean }[] = [];
  const unclassifiedForAI: any[] = [];

  for (const row of rawRows) {
    const matchedRule = regularRules.find((rule) =>
      row.description.toLowerCase().includes(rule.keyword.toLowerCase())
    );

    if (matchedRule) {
      preClassifiedItems.push({
        date: row.date,
        description: row.description,
        amount: row.amount,
        categoryId: matchedRule.categoryId,
        categoryName: matchedRule.category.name,
        isMaaserEligible: matchedRule.category.isMaaserEligible,
      });
    } else {
      unclassifiedForAI.push(row);
    }
  }

  let aiClassifiedItems: TransactionRow[] = [];

  if (unclassifiedForAI.length > 0) {
    const allowedCategories = Array.from(categoryMap.keys());
    const activeAIRules = await prisma.aIRule.findMany({
      where: {
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
    });

    const dynamicInstructions = activeAIRules
      .filter((r) => r.ruleType === 'prompt_instruction' && r.instructionText)
      .map((r) => `- ${r.instructionText}`)
      .join('\n');

    const systemInstruction = `
אתה עוזר פיננסי אישי המסווג תנועות בנק בעברית.
אתה מורשה לבחור קטגוריה אך ורק מתוך הרשימה הסגורה הבאה:
[${allowedCategories.join(', ')}]

חוקים והנחיות מיוחדות:
${dynamicInstructions || 'אין חוקים דינמיים כרגע.'}

אם תיאור התנועה אינו מתאים בצורה ברורה לאף אחת מהקטגוריות ברשימה, בחר בדיוק ב: "ללא קטגוריה".
אל תמציא קטגוריות חדשות בשום אופן.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `סווג את התנועות הבאות: ${JSON.stringify(unclassifiedForAI)}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              category: { type: Type.STRING },
            },
            required: ['date', 'description', 'amount', 'category'],
          },
        },
      },
    });

    aiClassifiedItems = JSON.parse(response.text || '[]');
  }

  const allItemsToSave = [
    ...preClassifiedItems.map((item) => ({
      date: item.date,
      description: item.description,
      amount: item.amount,
      categoryId: item.categoryId,
      isMaaserEligible: item.isMaaserEligible,
    })),
    ...aiClassifiedItems.map((item) => {
      const catInfo = categoryMap.get(item.category || 'ללא קטגוריה') || { id: defaultCategory!.id, isMaaserEligible: false };
      return {
        date: item.date,
        description: item.description,
        amount: item.amount,
        categoryId: catInfo.id,
        isMaaserEligible: catInfo.isMaaserEligible,
      };
    }),
  ];

  const savedTransactions = await Promise.all(
    allItemsToSave.map((item) => {
      const parsedDate = parseToDate(item.date);
      return prisma.transaction.create({
        data: {
          date: parsedDate,
          description: item.description,
          amount: item.amount,
          source: sourceName,
          monthKey: getMonthKey(parsedDate),
          categoryId: item.categoryId,
          isMaaserEligible: item.isMaaserEligible,
        },
        include: {
          category: true,
        },
      });
    })
  );

  revalidatePath('/');

  return savedTransactions.map((t) => ({
    id: t.id,
    date: formatDateForUI(new Date(t.date)),
    description: t.description,
    amount: Number(t.amount),
    source: t.source || sourceName,
    category: t.category?.name || 'ללא קטגוריה',
    isMaaserEligible: t.isMaaserEligible,
  }));
}