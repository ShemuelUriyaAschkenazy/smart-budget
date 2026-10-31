import * as XLSX from "xlsx";

export interface ParsedTransaction {
  dateObj: Date;
  description: string;
  amount: number;
}

export async function parseIsracardFile(
  buffer: Buffer,
): Promise<ParsedTransaction[]> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
  });

  const parsedRows: ParsedTransaction[] = [];
  let dateColIdx = -1;
  let descColIdx = -1;
  let amountColIdx = -1;
  let headerRowIdx = -1;

  rows.forEach((row, rowNumber) => {
    if (headerRowIdx !== -1 || !Array.isArray(row)) return;

    const values = row.map((v) => (v != null ? String(v).trim() : ""));
    const dateIdx = values.findIndex((v) => v && v.includes("תאריך רכישה"));
    const descIdx = values.findIndex((v) => v && v.includes("שם בית עסק"));
    const amountIdx = values.findIndex((v) => v && v.includes("סכום חיוב"));

    if (dateIdx !== -1 && descIdx !== -1) {
      headerRowIdx = rowNumber;
      dateColIdx = dateIdx;
      descColIdx = descIdx;
      amountColIdx =
        amountIdx !== -1
          ? amountIdx
          : values.findIndex((v) => v && v.includes("סכום עסקה"));
    }
  });

  if (headerRowIdx !== -1) {
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const rawDate = row[dateColIdx];
      const description = row[descColIdx] ? String(row[descColIdx]).trim() : "";

      if (!rawDate || !description || description.includes('סה"כ')) continue;

      const dateObj = parseDateString(String(rawDate));
      const rawAmount =
        row[amountColIdx] != null ? String(row[amountColIdx]) : "";
      const cleanAmt = Number(rawAmount.replace(/[ ,\s]/g, ""));
      if (!isNaN(cleanAmt) && cleanAmt !== 0) {
        const isRefund = cleanAmt < 0 || description.includes("זיכוי");
        const finalAmount = isRefund ? Math.abs(cleanAmt) : -Math.abs(cleanAmt);
        parsedRows.push({
          dateObj,
          description,
          amount: finalAmount,
        });
      }
    }
  }

  return parsedRows;
}

function parseDateString(val: string): Date {
  const trimmed = val.trim();
  const parts = trimmed.split(/[\/.-]/);
  if (parts.length === 3 && parts[0].length <= 2) {
    const year =
      parts[2].length === 2
        ? 2000 + parseInt(parts[2], 10)
        : parseInt(parts[2], 10);
    return new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }
  const d = new Date(val);
  return !isNaN(d.getTime()) ? d : new Date();
}
