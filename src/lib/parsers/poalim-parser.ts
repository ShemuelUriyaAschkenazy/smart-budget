import ExcelJS from 'exceljs';

export interface ParsedTransaction {
  dateObj: Date;
  description: string;
  amount: number;
}

export async function parsePoalimFile(workbook: ExcelJS.Workbook): Promise<ParsedTransaction[]> {
  const worksheet = workbook.worksheets[0];
  const parsedRows: ParsedTransaction[] = [];

  let dateColIdx = -1;
  let descColIdx = -1;
  let debitColIdx = -1;
  let creditColIdx = -1;
  let headerRowIdx = -1;

  // 1. איתור דינמי של שורת הכותרות
  worksheet.eachRow((row, rowNumber) => {
    if (headerRowIdx !== -1) return;

    const rowValues = Array.isArray(row.values) ? row.values : [];
    const values = rowValues.map((v) => (v != null ? String(v).trim() : ''));

    const dateIdx = values.findIndex((v) => v === 'תאריך');
    const descIdx = values.findIndex((v) => v === 'הפעולה' || v === 'תיאור');
    const debitIdx = values.findIndex((v) => v === 'חובה');
    const creditIdx = values.findIndex((v) => v === 'זכות');

    if (dateIdx !== -1 && descIdx !== -1) {
      headerRowIdx = rowNumber;
      dateColIdx = dateIdx;
      descColIdx = descIdx;
      debitColIdx = debitIdx;
      creditColIdx = creditIdx;
    }
  });

  // 2. קריאת הנתונים
  if (headerRowIdx !== -1) {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIdx) return;

      const values = Array.isArray(row.values) ? row.values : [];
      const dateVal = values[dateColIdx];

      if (!dateVal) return;

      const dateObj = parseToDate(dateVal);
      const description = values[descColIdx] ? String(values[descColIdx]).trim() : '';

      const debit = debitColIdx !== -1 && values[debitColIdx] ? Number(String(values[debitColIdx]).replace(/,/g, '')) : 0;
      const credit = creditColIdx !== -1 && values[creditColIdx] ? Number(String(values[creditColIdx]).replace(/,/g, '')) : 0;

      const amount = credit > 0 ? credit : -debit;

      if (description && (debit > 0 || credit > 0)) {
        parsedRows.push({ dateObj, description, amount });
      }
    });
  }

  return parsedRows;
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