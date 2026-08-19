'use server';

import { GoogleGenAI, Type } from '@google/genai';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface TransactionRow {
  id?: string;
  date: string;
  rawDate?: string;
  description: string;
  amount: number;
  source?: string;
  category?: string;
  isMaaserEligible?: boolean;
}

export interface FileAnalysisResult {
  sourceName: string;
  newRows: TransactionRow[];
  duplicateRows: TransactionRow[];
}

function parseToDate(val: any): Date {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'string') {
    const parts = val.trim().split(/[\/.-]/);
    if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
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

export async function getTransactions(monthKey?: string): Promise<TransactionRow[]> {
  const whereCondition = monthKey ? { monthKey } : {};

  const data = await prisma.transaction.findMany({
    where: whereCondition,
    orderBy: { date: 'desc' },
    include: { category: true },
  });

  return data.map((t) => ({
    id: t.id,
    date: formatDateForUI(new Date(t.date)),
    rawDate: t.date.toISOString(),
    description: t.description,
    amount: Number(t.amount),
    source: t.source || 'בנק הפועלים',
    category: t.category?.name || 'ללא קטגוריה',
    isMaaserEligible: t.isMaaserEligible,
  }));
}

// זיהוי עמיד בפני רווחים נסתרים ותווים מיוחדים
export async function isCreditCardChargeDescription(description: string): Promise<boolean> {
  if (!description) return false;
  
  // ניקוי תווים מיוחדים, רווחים כפולים והמרה לאותיות קטנות
  const cleanDesc = description
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // הסרת רווחים נסתרים
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();

  const keywords = [
    'כרטיסי אשראי',
    'כרטיס אשראי',
    'ישראכרט',
    'מקס',
    'max',
    'כאל',
    'cal',
    'ויזה',
    'מסטרקארד',
    'מאסטרקארד',
    'דיינרס',
    'אמריקן אקספרס',
    'אמקס',
  ];

  return keywords.some((kw) => cleanDesc.includes(kw));
}

export async function analyzeUploadedFile(formData: FormData): Promise<FileAnalysisResult> {
  const file = formData.get('file') as File;
  const sourceName = (formData.get('source') as string) || 'בנק הפועלים';

  if (!file) throw new Error('לא נבחר קובץ');

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  const parsedRows: { dateObj: Date; description: string; amount: number }[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < 6) return;

    const values = row.values as any[];
    const dateObj = parseToDate(values[1]);
    const description = values[2] ? String(values[2]).trim() : '';

    const debit = values[5] ? Number(String(values[5]).replace(/,/g, '')) : 0;
    const credit = values[6] ? Number(String(values[6]).replace(/,/g, '')) : 0;
    const amount = credit > 0 ? credit : -debit;

    if (description && (debit > 0 || credit > 0)) {
      parsedRows.push({ dateObj, description, amount });
    }
  });

  const existingTx = await prisma.transaction.findMany({
    select: { date: true, description: true, amount: true },
  });

  const existingSet = new Set(
    existingTx.map((t) => `${t.date.toISOString().split('T')[0]}_${t.description.trim()}_${Number(t.amount)}`)
  );

  const newRows: TransactionRow[] = [];
  const duplicateRows: TransactionRow[] = [];

  parsedRows.forEach((r) => {
    const key = `${r.dateObj.toISOString().split('T')[0]}_${r.description.trim()}_${r.amount}`;
    const rowData: TransactionRow = {
      date: formatDateForUI(r.dateObj),
      rawDate: r.dateObj.toISOString(),
      description: r.description,
      amount: r.amount,
      source: sourceName,
    };

    if (existingSet.has(key)) {
      duplicateRows.push(rowData);
    } else {
      newRows.push(rowData);
    }
  });

  return { sourceName, newRows, duplicateRows };
}

export async function commitTransactionsImport(
  itemsToSave: TransactionRow[],
  sourceName: string
): Promise<TransactionRow[]> {
  if (!itemsToSave || itemsToSave.length === 0) return [];

  const existingCategories = await prisma.category.findMany();
  const regularRules = await prisma.rule.findMany({ include: { category: true } });

  let transferCategory = existingCategories.find((c) => c.name === 'כיסוי חיוב אשראי (מנוטרל)');
  if (!transferCategory) {
    transferCategory = await prisma.category.create({
      data: {
        name: 'כיסוי חיוב אשראי (מנוטרל)',
        type: 'transfer',
        isMaaserEligible: false,
        isNeutralized: true,
      },
    });
  }

  let defaultCategory = existingCategories.find((c) => c.name === 'ללא קטגוריה');
  if (!defaultCategory) {
    defaultCategory = await prisma.category.create({
      data: { name: 'ללא קטגוריה', type: 'expense', isMaaserEligible: false },
    });
  }

  const categoryMap = new Map<string, { id: number; isMaaserEligible: boolean }>();
  existingCategories.forEach((c) => categoryMap.set(c.name, { id: c.id, isMaaserEligible: c.isMaaserEligible }));
  categoryMap.set(transferCategory.name, { id: transferCategory.id, isMaaserEligible: false });
  categoryMap.set(defaultCategory.name, { id: defaultCategory.id, isMaaserEligible: false });

  const preClassifiedItems: any[] = [];
  const unclassifiedForAI: any[] = [];

  for (const row of itemsToSave) {
    const isCreditCardTransfer = await isCreditCardChargeDescription(row.description);
    const dateObj = row.rawDate ? new Date(row.rawDate) : parseToDate(row.date);

    // 1. קדימות עליונה קשיחה: חיובי אשראי נלכדים מיד
    if (isCreditCardTransfer) {
      preClassifiedItems.push({
        dateObj,
        formattedDate: row.date,
        description: row.description,
        amount: row.amount,
        categoryId: transferCategory.id,
        isMaaserEligible: false,
      });
      continue;
    }

    // 2. בדיקה מול חוקים רגילים
    const matchedRule = regularRules.find((rule) =>
      row.description.toLowerCase().includes(rule.keyword.toLowerCase())
    );

    if (matchedRule) {
      preClassifiedItems.push({
        dateObj,
        formattedDate: row.date,
        description: row.description,
        amount: row.amount,
        categoryId: matchedRule.categoryId,
        isMaaserEligible: matchedRule.category.isMaaserEligible,
      });
    } else {
      unclassifiedForAI.push({
        dateObj,
        date: row.date,
        description: row.description,
        amount: row.amount,
      });
    }
  }

  let aiClassifiedItems: any[] = [];

  if (unclassifiedForAI.length > 0) {
    const allowedCategories = Array.from(categoryMap.keys());
    const activeAIRules = await prisma.aIRule.findMany({
      where: { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] },
    });

    const dynamicInstructions = activeAIRules
      .filter((r) => r.ruleType === 'prompt_instruction' && r.instructionText)
      .map((r) => `- ${r.instructionText}`)
      .join('\n');

    // הנחיה קשיחה ל-AI לסווג חיובי אשראי אך ורק ל"כיסוי חיוב אשראי (מנוטרל)"
    const systemInstruction = `
אתה עוזר פיננסי אישי המסווג תנועות בנק בעברית.
אתה מורשה לבחור קטגוריה אך ורק מתוך הרשימה הסגורה הבאה:
[${allowedCategories.join(', ')}]

חוקי ברזל חובתיים:
1. במידה ותיאור התנועה מכיל חיובי אשראי (כמו: "ישראכרט", "מקס", "כאל", "כרטיסי אשראי", "ויזה"), חובה לבחור בדיוק בקטגוריה: "כיסוי חיוב אשראי (מנוטרל)".
2. ${dynamicInstructions || 'אין חוקים דינמיים נוספים.'}

אם תיאור התנועה אינו מתאים בצורה ברורה לאף אחת מהקטגוריות, בחר בדיוק ב: "ללא קטגוריה".
אל תמציא קטגוריות חדשות בשום אופן.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `סווג את התנועות הבאות: ${JSON.stringify(unclassifiedForAI)}`,
      config: {
        systemInstruction,
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

  const finalSavePayload = [
    ...preClassifiedItems,
    ...aiClassifiedItems.map((item, idx) => {
      const origRow = unclassifiedForAI[idx] || {};
      const catInfo = categoryMap.get(item.category || 'ללא קטגוריה') || {
        id: defaultCategory!.id,
        isMaaserEligible: false,
      };
      return {
        dateObj: origRow.dateObj || new Date(),
        formattedDate: item.date,
        description: item.description,
        amount: item.amount,
        categoryId: catInfo.id,
        isMaaserEligible: catInfo.isMaaserEligible,
      };
    }),
  ];

  const savedTransactions = await Promise.all(
    finalSavePayload.map((item) =>
      prisma.transaction.create({
        data: {
          date: item.dateObj,
          description: item.description,
          amount: item.amount,
          source: sourceName,
          monthKey: getMonthKey(item.dateObj),
          categoryId: item.categoryId,
          isMaaserEligible: item.isMaaserEligible,
        },
        include: { category: true },
      })
    )
  );

  revalidatePath('/');
  revalidatePath('/budget');

  return savedTransactions.map((t) => ({
    id: t.id,
    date: formatDateForUI(new Date(t.date)),
    rawDate: t.date.toISOString(),
    description: t.description,
    amount: Number(t.amount),
    source: t.source || sourceName,
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
      isMaaserEligible: category.isMaaserEligible,
    },
  });

  revalidatePath('/');
  revalidatePath('/budget');
}

export async function toggleTransactionMaaserAction(transactionId: string, isEligible: boolean) {
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { isMaaserEligible: isEligible },
  });

  revalidatePath('/');
  revalidatePath('/budget');
}