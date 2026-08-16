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

export default function Home() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  useEffect(() => {
    getTransactions().then(setTransactions);
  }, []);

  const handleDeleteRow = async (id: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
    await deleteTransactionAction(id);
  };

  const handleClearAll = async () => {
    if (confirm('האם אתה בטוח שברצונך למחוק את כל התנועות?')) {
      setTransactions([]);
      await clearAllTransactionsAction();
    }
  };

  const handleCategoryChange = async (id: string, newCategory: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category: newCategory } : t))
    );
    await updateTransactionCategoryAction(id, newCategory);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8 max-w-6xl mx-auto">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900">ניהול תקציב חכם עם AI</h1>
        <p className="text-gray-600 text-sm mt-1">
          העלה דפי חשבון מאקסל וקבל סיווג אוטומטי של תנועות הבנק והאשראי באמצעות Gemini.
        </p>
      </header>

      <FileUpload onDataParsed={(newData) => setTransactions((prev) => [...newData, ...prev])} />
      <TransactionsTable 
        transactions={transactions} 
        onDeleteRow={handleDeleteRow}
        onClearAll={handleClearAll}
        onCategoryChange={handleCategoryChange}
      />
    </main>
  );
}