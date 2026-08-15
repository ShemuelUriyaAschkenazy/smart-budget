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

  // 1. שליפת הקטגוריות הקיימות בדאטהבייס בלבד
  const existingCategories = await prisma.category.findMany();
  
  // יצירת קטגוריית "ללא קטגוריה" בדאטהבייס אם היא עדיין לא קיימת
  let defaultCategory = existingCategories.find(c => c.name === 'ללא קטגוריה');
  if (!defaultCategory) {
    defaultCategory = await prisma.category.create({
      data: { name: 'ללא קטגוריה', type: 'expense' }
    });
  }

  // מיפוי שמות הקטגוריות המותרות ל-AI
  const allowedCategories = existingCategories.map(c => c.name);
  if (!allowedCategories.includes('ללא קטגוריה')) {
    allowedCategories.push('ללא קטגוריה');
  }

  const categoryMap = new Map<string, string>();
  existingCategories.forEach(c => categoryMap.set(c.name, c.id));
  categoryMap.set(defaultCategory.name, defaultCategory.id);

  const activeRules = await prisma.aIRule.findMany({
    where: {
      OR: [
        { validUntil: null },
        { validUntil: { gte: new Date() } }
      ]
    }
  });

  const dynamicInstructions = activeRules
    .filter(r => r.ruleType === 'prompt_instruction' && r.instructionText)
    .map(r => `- ${r.instructionText}`)
    .join('\n');

  // הנחיה קשיחה ל-AI לבחור אך ורק מהרשימה
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
    contents: `סווג את התנועות הבאות: ${JSON.stringify(rawRows)}`,
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

  const classifiedItems: TransactionRow[] = JSON.parse(response.text || '[]');

  // 2. שמירת התנועות מול קטגוריות קיימות בלבד (ללא יצירת קטגוריות חדשות)
  const savedTransactions = await Promise.all(
    classifiedItems.map((item) => {
      const parsedDate = parseToDate(item.date);
      const chosenCatName = item.category || 'ללא קטגוריה';
      
      // אם ה-AI החזיר קטגוריה שאינה ברשימה, נחזיר אותה ל-"ללא קטגוריה"
      const categoryId = categoryMap.get(chosenCatName) || defaultCategory!.id;

      return prisma.transaction.create({
        data: {
          date: parsedDate,
          description: item.description,
          amount: item.amount,
          source: sourceName,
          monthKey: getMonthKey(parsedDate),
          categoryId: categoryId,
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
  }));
}