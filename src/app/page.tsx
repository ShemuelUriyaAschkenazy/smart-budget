'use client';

import { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import TransactionsTable from '../components/TransactionsTable';
import {
  TransactionRow,
  getTransactions,
  deleteTransactionAction,
  clearAllTransactionsAction,
  updateTransactionCategoryAction
} from './actions/parse-file';
import { getCategories, CategoryItem } from './actions/categories-actions';
import { getAccounts, AccountItem } from './actions/account-actions';

export default function Home() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');

  const loadData = async (monthKey: string, source: string) => {
    const [txData, catData, accData] = await Promise.all([
      getTransactions(monthKey, source),
      getCategories(),
      getAccounts(true),
    ]);
    setTransactions(txData);
    setCategories(catData);
    setAccounts(accData);
  };

  useEffect(() => {
    loadData(selectedMonth, selectedSource);
  }, [selectedMonth, selectedSource]);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8 max-w-6xl mx-auto space-y-6">
      <header className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">ניהול עסקאות</h1>
          <p className="text-gray-600 text-sm mt-1">
            ריכוז וסיווג תנועות כספיות באוטומציה.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-gray-700">חודש:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-lg p-1 text-xs font-semibold focus:outline-none bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 border-r pr-3 border-gray-200">
              <label className="text-xs font-bold text-gray-700">מקור:</label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="border border-gray-300 rounded-lg p-1 text-xs font-semibold focus:outline-none bg-white"
              >
                <option value="ALL">כל החשבונות והכרטיסים</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <FileUpload onDataParsed={() => loadData(selectedMonth, selectedSource)} />

      <TransactionsTable
        transactions={transactions}
        categories={categories}
        onDeleteRow={async (id) => {
          setTransactions((prev) => prev.filter((item) => item.id !== id));
          await deleteTransactionAction(id);
        }}
        onClearAll={async () => {
          if (confirm('האם למחוק את כל התנועות במסד הנתונים?')) {
            setTransactions([]);
            await clearAllTransactionsAction();
            await loadData(selectedMonth, selectedSource);
          }
        }}
        onCategoryChange={async (id, newCategory) => {
          setTransactions((prev) =>
            prev.map((t) => (t.id === id ? { ...t, category: newCategory } : t))
          );
          await updateTransactionCategoryAction(id, newCategory);
          await loadData(selectedMonth, selectedSource);
        }}
      />
    </main>
  );
}