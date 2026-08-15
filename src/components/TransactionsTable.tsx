'use client';

import { TransactionRow } from '../app/actions/parse-file';

interface TableProps {
  transactions: TransactionRow[];
  onDeleteRow: (id: string) => void;
  onClearAll: () => void;
}

export default function TransactionsTable({ transactions, onDeleteRow, onClearAll }: TableProps) {
  if (!transactions || transactions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-800">2. תנועות מסווגות (תוצאות ה-AI)</h2>
          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
            {transactions.length} תנועות נותחו
          </span>
        </div>

        <button
          onClick={onClearAll}
          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-1.5 rounded-lg transition"
        >
          מחק את כל ההעלאה האחרונה
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3">תאריך</th>
              <th className="px-6 py-3">תיאור</th>
              <th className="px-6 py-3">סכום</th>
              <th className="px-6 py-3">מקור</th>
              <th className="px-6 py-3">קטגוריית AI</th>
              <th className="px-6 py-3 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item) => (
              <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{item.date}</td>
                <td className="px-6 py-4">{item.description}</td>
                <td className="px-6 py-4 font-semibold text-gray-800 dir-ltr text-right">
                  ₪{Number(item.amount).toFixed(2)}
                </td>
                <td className="px-6 py-4">{item.source}</td>
                <td className="px-6 py-4">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-1 rounded">
                    {item.category || 'ללא קטגוריה'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => item.id && onDeleteRow(item.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold"
                    title="מחק שורה"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}