'use server';

import { GoogleGenAI, Type } from '@google/genai';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface TransactionRow {
  date: string;
  description: string;
  amount: number;
  source?: string;
  category?: string;
}

export async function processUploadedFile(formData: FormData) {
  const file = formData.get('file') as File;
  const sourceName = (formData.get('source') as string) || 'General Credit Card';
  
  if (!file) throw new Error('No file uploaded');

  // 1. Read Excel using ExcelJS
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  const rawRows: any[] = [];

  // Extract rows (skip header row)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip headers
    const values = row.values as any[];
    
    // Adapt row positions based on standard bank exports (Date, Description, Amount)
    if (values[1] && values[2] && values[3]) {
      rawRows.push({
        date: String(values[1]),
        description: String(values[2]),
        amount: Number(values[3]),
      });
    }
  });

  // 2. Fetch Categories and Active Rules from PostgreSQL
  const categories = await prisma.category.findMany();
  const activeRules = await prisma.aIRule.findMany({
    where: {
      OR: [
        { validUntil: null },
        { validUntil: { gte: new Date() } }
      ]
    }
  });

  const categoryNames = categories.map(c => c.name).join(', ');
  const dynamicInstructions = activeRules
    .filter(r => r.ruleType === 'prompt_instruction' && r.instructionText)
    .map(r => `- ${r.instructionText}`)
    .join('\n');

  // 3. Construct System Prompt
  const systemInstruction = `
You are a financial personal assistant classifying bank and credit card transactions.
Allowed categories: [${categoryNames}, "Uncategorized"]

Apply these custom AI rules strictly:
${dynamicInstructions || 'No specific dynamic rules provided yet.'}

Assign the most accurate category based on the transaction description, amount, and guidelines.
  `;

  // 4. Send to Gemini for Structured Output classification
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: `Classify these transactions: ${JSON.stringify(rawRows)}`,
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

  return classifiedItems.map(item => ({
    ...item,
    source: sourceName
  }));
}