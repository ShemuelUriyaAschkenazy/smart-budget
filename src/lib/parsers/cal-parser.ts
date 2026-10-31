import ExcelJS from "exceljs";

export interface ParsedTransaction {
  dateObj: Date;
  description: string;
  amount: number;
}

export async function parseCalFile(
  workbook: ExcelJS.Workbook,
): Promise<ParsedTransaction[]> {
  const worksheet = workbook.worksheets[0];
  const parsedRows: ParsedTransaction[] = [];

  let dateColIdx = -1;
  let descColIdx = -1;
  let chargeAmtColIdx = -1;
  let originalAmtColIdx = -1;
  let headerRowIdx = -1;

  // 1. איתור דינמי של שורת הכותרות
  worksheet.eachRow((row, rowNumber) => {
    if (headerRowIdx !== -1) return;

    const rowValues = Array.isArray(row.values) ? row.values : [];
    const values = rowValues.map((v) => (v != null ? String(v).trim() : ""));

    const dateIdx = values.findIndex((v) => v && v.includes("תאריך עסקה"));
    const descIdx = values.findIndex(
      (v) => v && (v.includes("שם בית עסק") || v.includes("שם בית העסק")),
    );
    const chargeIdx = values.findIndex((v) => v && v.includes("סכום חיוב"));
    const origIdx = values.findIndex((v) => v && v.includes("סכום עסקה"));

    if (dateIdx !== -1 && descIdx !== -1) {
      headerRowIdx = rowNumber;
      dateColIdx = dateIdx;
      descColIdx = descIdx;
      chargeAmtColIdx = chargeIdx !== -1 ? chargeIdx : origIdx;
      originalAmtColIdx = origIdx;
    }
  });

  // 2. קריאת השורות לאחר שורת הכותרת
  if (headerRowIdx !== -1) {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIdx) return;

      const values = Array.isArray(row.values) ? row.values : [];
      const rawDate = values[dateColIdx];

      if (!rawDate) return;

      const dateObj = parseExcelDate(rawDate);
      const description = values[descColIdx]
        ? String(values[descColIdx]).trim()
        : "";

      // עדיפות לסכום חיוב בפועל, ואם ריק (למשל בעסקה בקליטה) - סכום עסקה
      let chargeAmtStr =
        values[chargeAmtColIdx] != null ? String(values[chargeAmtColIdx]) : "";
      if (
        !chargeAmtStr &&
        originalAmtColIdx !== -1 &&
        values[originalAmtColIdx] != null
      ) {
        chargeAmtStr = String(values[originalAmtColIdx]);
      }

      const cleanAmt = Number(chargeAmtStr.replace(/[ ,\s]/g, ""));
      if (description && !isNaN(cleanAmt) && cleanAmt !== 0) {
        // אם הסכום בקובץ כבר מופיע כשלילי (או מכיל סימן זיכוי), נשמור כחיובי; אחרת כשלילי
        const isRefund = cleanAmt < 0 || description.includes("זיכוי");
        const finalAmount = isRefund ? Math.abs(cleanAmt) : -Math.abs(cleanAmt);
        parsedRows.push({ dateObj, description, amount: finalAmount });
      }
    });
  }

  return parsedRows;
}

// המרת תאריכי אקסל (בין אם אובייקט Date, מחרוזת, או מספר סידורי של Excel כמו 46273)
function parseExcelDate(val: any): Date {
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  if (typeof val === "number") {
    // המרת מספר סידורי של Excel לתאריך JavaScript
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    const num = Number(trimmed);
    if (!isNaN(num) && num > 30000) {
      return new Date(Math.round((num - 25569) * 86400 * 1000));
    }

    const parts = trimmed.split(/[\/.-]/);
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
