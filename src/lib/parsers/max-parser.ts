import ExcelJS from "exceljs";
import { prisma } from "../prisma";

export interface ParsedTransaction {
  dateObj: Date;
  description: string;
  amount: number;
  accountId: string;
}

export async function parseMaxFile(
  workbook: ExcelJS.Workbook,
  fallbackAccountId: string,
): Promise<ParsedTransaction[]> {
  let worksheet = workbook.getWorksheet("עסקאות במועד החיוב");
  if (!worksheet) {
    worksheet = workbook.worksheets[0];
  }

  // שליפת כל הכרטיסים הפעילים של Max מהדאטהבייס
  const maxAccounts = await prisma.financialAccount.findMany({
    where: { provider: "max", isActive: true },
  });

  // מפה לזיהוי מהיר לפי 4 ספרות אחרונות
  const digitsToAccountIdMap = new Map<string, string>();
  maxAccounts.forEach((acc) => {
    if (acc.last4Digits) {
      digitsToAccountIdMap.set(acc.last4Digits.trim(), acc.id);
    }
  });

  const parsedRows: ParsedTransaction[] = [];

  let dateColIdx = -1;
  let descColIdx = -1;
  let amountColIdx = -1;
  let digitsColIdx = -1;
  let headerRowIdx = -1;

  // 1. איתור דינמי של שורת הכותרות והעמודות
  worksheet.eachRow((row, rowNumber) => {
    if (headerRowIdx !== -1) return;

    const rowValues = Array.isArray(row.values) ? row.values : [];
    const values = rowValues.map((v) => (v != null ? String(v).trim() : ""));

    const dateIdx = values.findIndex((v) => v && v.includes("תאריך עסקה"));
    const descIdx = values.findIndex((v) => v && v.includes("שם בית העסק"));
    const amountIdx = values.findIndex((v) => v === "סכום חיוב");
    const digitsIdx = values.findIndex(
      (v) => v && v.includes("4 ספרות אחרונות"),
    );

    if (dateIdx !== -1 && descIdx !== -1) {
      headerRowIdx = rowNumber;
      dateColIdx = dateIdx;
      descColIdx = descIdx;
      digitsColIdx = digitsIdx;
      amountColIdx =
        amountIdx !== -1
          ? amountIdx
          : values.findIndex((v) => v && v.includes("סכום עסקה מקורי"));
    }
  });

  // 2. קריאת הנתונים ושיוך/אימות קפדני
  if (headerRowIdx !== -1) {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIdx) return;

      const values = Array.isArray(row.values) ? row.values : [];
      const firstVal = values[dateColIdx]
        ? String(values[dateColIdx]).trim()
        : "";

      if (firstVal.includes("סך הכל") || !firstVal) return;

      const dateObj = parseToDate(values[dateColIdx]);
      const description = values[descColIdx]
        ? String(values[descColIdx]).trim()
        : "";
      const chargeAmt = values[amountColIdx]
        ? Number(String(values[amountColIdx]).replace(/,/g, ""))
        : 0;
      // חילוץ 4 ספרות אחרונות במידה וקיימות בעמודה
      const rawDigits =
        digitsColIdx !== -1 && values[digitsColIdx]
          ? String(values[digitsColIdx]).trim()
          : "";

      let targetAccountId = fallbackAccountId;

      if (rawDigits) {
        const matchedId = digitsToAccountIdMap.get(rawDigits);

        if (matchedId) {
          targetAccountId = matchedId;
        } else {
          // מנגנון הגנה קפדני: מניעת טעינה חלקית במקרה של כרטיס לא מוכר
          throw new Error(
            `בקובץ מופיעות תנועות עבור כרטיס שמסתיים ב-(${rawDigits}), אך כרטיס זה אינו מוגדר במערכת. נא להגדיר את הכרטיס במסך החשבונות תחילה.`,
          );
        }
      }

      if (description && chargeAmt !== 0) {
        // ב-Max חיוב רגיל הוא חיובי (>0) ונשמר כשלילי במערכת. זיכוי מופיע לרוב כשלילי (<0) ולכן נשמר כחיובי
        const finalAmount = chargeAmt > 0 ? -chargeAmt : Math.abs(chargeAmt);
        parsedRows.push({
          dateObj,
          description,
          amount: finalAmount,
          accountId: targetAccountId,
        });
      }
    });
  }

  return parsedRows;
}

function parseToDate(val: any): Date {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "string") {
    const parts = val.trim().split(/[\/.-]/);
    if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
      return new Date(
        parseInt(parts[2], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[0], 10),
      );
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}
