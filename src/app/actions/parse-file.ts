'use server';

import { GoogleGenAI, Type } from '@google/genai';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface TransactionRow {
  id?: string;
  date: string;
  description: string;
  amount: number;
  source?: string;
  category?: string;
}

function formatDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    const d = val.getDate().toString().padStart(2, '0');
    const m = (val.getMonth() + 1).toString().padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return String(val).trim();
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
    const date = formatDate(values[1]);
    const description = values[2] ? String(values[2]).trim() : '';
    
    const debit = values[5] ? Number(String(values[5]).replace(/,/g, '')) : 0;
    const credit = values[6] ? Number(String(values[6]).replace(/,/g, '')) : 0;

    const amount = credit > 0 ? credit : -debit;

    if (date && description && (debit > 0 || credit > 0)) {
      rawRows.push({
        date,
        description,
        amount,
      });
    }
  });

  const categories = await prisma.category.findMany();
  const activeRules = await prisma.aIRule.findMany({
    where: {
      OR: [
        { validUntil: null },
        { validUntil: { gte: new Date() } }
      ]
    }
  });

  const categoryNames = categories.length > 0 
    ? categories.map(c => c.name).join(', ') 
    : 'מזון וסופרמרקט, דיור ומגורים, השקעות וחיסכון, חשבונות ומיסים, תחבורה ודלק, משכורת והכנסה';

  const dynamicInstructions = activeRules
    .filter(r => r.ruleType === 'prompt_instruction' && r.instructionText)
    .map(r => `- ${r.instructionText}`)
    .join('\n');

  const systemInstruction = `
אתה עוזר פיננסי אישי המסווג תנועות בנק בעברית.
קטגוריות מורשות בלבד: [${categoryNames}, "ללא קטגוריה"]

חוקים והנחיות מיוחדות:
${dynamicInstructions || 'אין חוקים דינמיים כרגע.'}

סווג כל תנועה לפי הקטגוריה המתאימה ביותר מהרשימה בלבד בהתבסס על התיאור והסכום.
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

  return classifiedItems.map((item, index) => ({
    ...item,
    id: `${Date.now()}-${index}`,
    source: sourceName
  }));
}