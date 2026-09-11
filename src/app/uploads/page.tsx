'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getImportBatches, 
  deleteImportBatchAction, 
  deleteTransactionAction 
} from '../actions/parse-file';

export default function UploadsPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const data = await getImportBatches();
      setBatches(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleDeleteBatch = async (id: string, fileName: string) => {
    if (!confirm(`האם למחוק את כל ההעלאה "${fileName}"? כל התנועות שנטענו בקובץ זה יימחקו.`)) return;
    setLoading(true);
    try {
      await deleteImportBatchAction(id);
      await loadBatches();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingleTransaction = async (txId: string, description: string) => {
    if (!confirm(`האם למחוק את התנועה "${description}"?`)) return;
    try {
      await deleteTransactionAction(txId);
      await loadBatches(); // רענון כדי לעדכן את הטבלה והכמות
    } catch (err) {
      alert('שגיאה במחיקת התנועה');
    }
  };

  const toggleExpand = (batchId: string) => {
    setExpandedBatchId(expandedBatchId === batchId ? null : batchId);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8 max-w-5xl mx-auto space-y-6">
      <header className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">היסטוריית העלאות קבצים</h1>
          <p className="text-gray-600 text-sm mt-1">
            מעקב וניהול אצוות היבוא. לחץ על קובץ לצפייה ומחיקת תנועות יחידות.
          </p>
        </div>
        <Link
          href="/"
          className="text-xs bg-white border border-gray-300 hover:bg-gray-50 font-bold px-4 py-2 rounded-lg shadow-sm transition"
        >
          חזרה לתנועות
        </Link>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">קבצים שהועלו ({batches.length})</h2>
          {loading && <span className="text-xs text-blue-600 font-semibold">מעדכן...</span>}
        </div>

        {batches.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            לא נטענו קבצים עדיין.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {batches.map((b) => {
              const isExpanded = expandedBatchId === b.id;
              const transactions = b.transactions || [];

              return (
                <div key={b.id} className="bg-white transition">
                  {/* שורת האצווה/הקובץ */}
                  <div 
                    onClick={() => toggleExpand(b.id)}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs font-bold">
                        {isExpanded ? '▼' : '◄'}
                      </span>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{b.fileName || 'קובץ ללא שם'}</p>
                        <p className="text-xs text-gray-500">
                          {b.account?.name || b.provider} • {new Date(b.createdAt).toLocaleString('he-IL')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                        {b._count?.transactions || 0} תנועות
                      </span>

                      <button
                        disabled={loading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBatch(b.id, b.fileName || 'קובץ');
                        }}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded transition disabled:opacity-50"
                      >
                        מחק את כל הקובץ
                      </button>
                    </div>
                  </div>

                  {/* טבלת התנועות המורחבת */}
                  {isExpanded && (
                    <div className="bg-gray-50 p-4 border-t border-b border-gray-100">
                      <h4 className="text-xs font-bold text-gray-700 mb-3">
                        תנועות שנקלטו בקובץ זה ({transactions.length}):
                      </h4>

                      {transactions.length === 0 ? (
                        <p className="text-xs text-gray-400">אין תנועות בקובץ זה (או שכולן נמחקו).</p>
                      ) : (
                        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                          <table className="w-full text-xs text-right text-gray-600">
                            <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                              <tr>
                                <th className="p-2.5">תאריך</th>
                                <th className="p-2.5">תיאור</th>
                                <th className="p-2.5">סכום</th>
                                <th className="p-2.5">קטגוריה</th>
                                <th className="p-2.5 text-center">פעולה</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {transactions.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-gray-50">
                                  <td className="p-2.5">{new Date(tx.date).toLocaleDateString('he-IL')}</td>
                                  <td className="p-2.5 font-medium text-gray-800">{tx.description}</td>
                                  <td className="p-2.5 font-bold dir-ltr text-right">₪{Number(tx.amount).toFixed(2)}</td>
                                  <td className="p-2.5">{tx.category?.name || 'ללא קטגוריה'}</td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      onClick={() => handleDeleteSingleTransaction(tx.id, tx.description)}
                                      className="text-red-500 hover:text-red-700 font-bold p-1"
                                      title="מחק תנועה זו בלבד"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}