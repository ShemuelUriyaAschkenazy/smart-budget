'use client';

import { TransactionRow } from '../app/actions/parse-file';

interface TableProps {
  transactions: TransactionRow[];
}

export default function TransactionsTable({ transactions }: TableProps) {
  if (!transactions || transactions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">2. Classified Transactions (AI Results)</h2>
        <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
          {transactions.length} items parsed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Source</th>
              <th className="px-6 py-3">AI Category</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item, index) => (
              <tr key={index} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.date}</td>
                <td className="px-6 py-4">{item.description}</td>
                <td className="px-6 py-4 font-semibold text-gray-800">
                  ₪{Number(item.amount).toFixed(2)}
                </td>
                <td className="px-6 py-4">{item.source}</td>
                <td className="px-6 py-4">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-1 rounded">
                    {item.category || 'Uncategorized'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}