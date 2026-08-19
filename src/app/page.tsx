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

export default function Home() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');

  const loadData = async (monthKey: string) => {
    const [txData, catData] = await Promise.all([
      getTransactions(monthKey),
      getCategories(),
    ]);
    setTransactions(txData);
    setCategories(catData);
  };

  useEffect(() => {
    loadData(selectedMonth);
  }, [selectedMonth]);

  const handleDeleteRow = async (id: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
    await deleteTransactionAction(id);
  };

  const handleClearAll = async () => {
    if (confirm('האם אתה בטוח שברצונך למחוק את כל התנועות?')) {
      setTransactions([]);
      await clearAllTransactionsAction();
      await loadData(selectedMonth);
    }
  };

  const handleCategoryChange = async (id: string, newCategory: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category: newCategory } : t))
    );
    await updateTransactionCategoryAction(id, newCategory);
    await loadData(selectedMonth);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8 max-w-6xl mx-auto space-y-6">
      <header className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">ניהול תנועות וסיווג חכם</h1>
          <p className="text-gray-600 text-sm mt-1">
            העלה דפי חשבון, נהל חיובי אשראי ללא כפילות, וסווג תנועות בעזרת AI.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <label className="text-xs font-bold text-gray-700">סינון לפי חודש:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg p-1.5 text-xs font-semibold focus:outline-none bg-white"
          />
        </div>
      </header>

      <FileUpload onDataParsed={() => loadData(selectedMonth)} />

      <TransactionsTable 
        transactions={transactions}
        categories={categories} // העברת הקטגוריות המסונכרנות
        onDeleteRow={handleDeleteRow}
        onClearAll={handleClearAll}
        onCategoryChange={handleCategoryChange}
      />
    </main>
  );
}