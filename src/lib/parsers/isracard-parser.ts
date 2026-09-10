import ExcelJS from 'exceljs';

export interface ParsedTransaction {
  dateObj: Date;
  description: string;
  amount: number;
}

export async function parseIsracardFile(workbook: ExcelJS.Workbook): Promise<ParsedTransaction[]> {
  const worksheet = workbook.worksheets[0];
  const parsedRows: ParsedTransaction[] = [];

  let dateColIdx = -1;
  let descColIdx = -1;
  let amountColIdx = -1;
  let headerRowIdx = -1;

  // 1. איתור דינמי של שורת הכותרות (שורה 12 בתמונה)
  worksheet.eachRow((row, rowNumber) => {
    if (headerRowIdx !== -1) return;

    const rowValues = Array.isArray(row.values) ? row.values : [];
    const values = rowValues.map((v) => (v != null ? String(v).trim() : ''));

    const dateIdx = values.findIndex((v) => v && v.includes('תאריך רכישה'));
    const descIdx = values.findIndex((v) => v && v.includes('שם בית עסק'));
    const amountIdx = values.findIndex((v) => v && v.includes('סכום חיוב'));

    if (dateIdx !== -1 && descIdx !== -1) {
      headerRowIdx = rowNumber;
      dateColIdx = dateIdx;
      descColIdx = descIdx;
      amountColIdx = amountIdx !== -1 ? amountIdx : values.findIndex((v) => v && v.includes('סכום עסקה'));
    }
  });

  // 2. קריאת התנועות בטבלה
  if (headerRowIdx !== -1) {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIdx) return;

      const values = Array.isArray(row.values) ? row.values : [];
      const rawDate = values[dateColIdx];

      if (!rawDate) return;

      const description = values[descColIdx] ? String(values[descColIdx]).trim() : '';
      if (!description || description.includes('סה"כ')) return;

      const dateObj = parseExcelDate(rawDate);
      const rawAmount = values[amountColIdx] != null ? String(values[amountColIdx]) : '';
      const cleanAmt = Number(rawAmount.replace(/[₪,\s]/g, ''));

      if (!isNaN(cleanAmt) && cleanAmt > 0) {
        parsedRows.push({
          dateObj,
          description,
          amount: -cleanAmt,
        });
      }
    });
  }

  return parsedRows;
}

function parseExcelDate(val: any): Date {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  if (typeof val === 'string') {
    const parts = val.trim().split(/[\/.-]/);
    if (parts.length === 3 && parts[0].length <= 2) {
      const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
      return new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}