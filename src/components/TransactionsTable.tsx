'use client';

import { useState, useEffect } from 'react';
import { TransactionRow, toggleTransactionMaaserAction } from '../app/actions/parse-file';
import { CategoryItem, getCategories } from '../app/actions/categories-actions';
import { createRuleAction } from '../app/actions/rules-actions';

interface TableProps {
  transactions: TransactionRow[];
  onDeleteRow: (id: string) => void;
  onClearAll: () => void;
  onCategoryChange: (id: string, newCategory: string) => Promise<void>;
}

export default function TransactionsTable({
  transactions,
  onDeleteRow,
  onClearAll,
  onCategoryChange,
}: TableProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [pendingRule, setPendingRule] = useState<{
    description: string;
    categoryName: string;
    categoryId: number;
  } | null>(null);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  if (!transactions || transactions.length === 0) return null;

  const handleSelectChange = async (item: TransactionRow, newCatName: string) => {
    if (!item.id || item.category === newCatName) return;

    await onCategoryChange(item.id, newCatName);

    const isSuppressed = sessionStorage.getItem('suppressRulePrompt') === 'true';
    if (isSuppressed) return;

    const matchedCat = categories.find((c) => c.name === newCatName);
    if (matchedCat) {
      setPendingRule({
        description: item.description,
        categoryName: newCatName,
        categoryId: Number(matchedCat.id),
      });
    }
  };

  const handleToggleMaaser = async (item: TransactionRow) => {
    if (!item.id) return;
    const newStatus = !item.isMaaserEligible;
    await toggleTransactionMaaserAction(item.id, newStatus);
    item.isMaaserEligible = newStatus;
  };

  const handleConfirmRule = async () => {
    if (!pendingRule) return;

    try {
      await createRuleAction(pendingRule.description, pendingRule.categoryId);
      alert(`נוצר חוק חדש עבור "${pendingRule.description}" ⬅ ${pendingRule.categoryName}`);
    } catch (err: any) {
      alert(err.message || 'שגיאה ביצירת החוק');
    } finally {
      setPendingRule(null);
    }
  };

  const handleCloseModal = (checkedDontAsk: boolean) => {
    if (checkedDontAsk) {
      sessionStorage.getItem('suppressRulePrompt') && sessionStorage.setItem('suppressRulePrompt', 'true');
    }
    setPendingRule(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden relative">
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-800">2. תנועות מסווגות</h2>
          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
            {transactions.length} תנועות
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
              <th className="px-6 py-3">קטגוריה</th>
              <th className="px-6 py-3 text-center">מעשר</th>
              <th className="px-6 py-3 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item) => {
              const isUncategorized = !item.category || item.category === 'ללא קטגוריה';

              return (
                <tr
                  key={item.id}
                  className={`border-b transition ${
                    isUncategorized ? 'bg-amber-50/40 hover:bg-amber-100/50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{item.date}</td>
                  <td className="px-6 py-4">{item.description}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800 dir-ltr text-right">
                    ₪{Number(item.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">{item.source}</td>
                  <td className="px-6 py-4">
                    <select
                      value={item.category || 'ללא קטגוריה'}
                      onChange={(e) => handleSelectChange(item, e.target.value)}
                      className={`border rounded-lg p-1.5 text-xs font-semibold focus:outline-none focus:ring-2 transition cursor-pointer ${
                        isUncategorized
                          ? 'bg-amber-100 text-amber-800 border-amber-300 focus:ring-amber-400'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-400'
                      }`}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name} className="bg-white text-gray-800 font-normal">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleMaaser(item)}
                      className={`text-xs font-bold px-2 py-1 rounded transition ${
                        item.isMaaserEligible
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                      title="לחץ כדי לשנות האם תנועה זו נחשבת למעשר"
                    >
                      {item.isMaaserEligible ? '🪙 מחושב' : 'לא מחושב'}
                    </button>
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
              );
            })}
          </tbody>
        </table>
      </div>

      {pendingRule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">האם ליצור חוק קבוע?</h3>
            <p className="text-sm text-gray-600">
              הבחנת בשיוך התנועה <strong>"{pendingRule.description}"</strong> לקטגוריה{' '}
              <strong>"{pendingRule.categoryName}"</strong>.
            </p>
            <p className="text-xs text-gray-500">
              יצירת חוק תבטיח שכל תנועה עתידית עם תיאור זה תסווג אוטומטית לקטגוריה זו.
            </p>

            <div className="flex items-center gap-2 pt-2 border-t">
              <input
                type="checkbox"
                id="suppressPrompt"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                onChange={(e) => ((window as any)._tempSuppress = e.target.checked)}
              />
              <label htmlFor="suppressPrompt" className="text-xs text-gray-600 cursor-pointer">
                אל תשאל אותי שוב (תקף עד לרענון העמוד)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => handleCloseModal(!!(window as any)._tempSuppress)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                לא תודה
              </button>
              <button
                onClick={() => {
                  const suppress = !!(window as any)._tempSuppress;
                  if (suppress) {
                    sessionStorage.setItem('suppressRulePrompt', 'true');
                  }
                  handleConfirmRule();
                }}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                צור חוק קבוע
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}