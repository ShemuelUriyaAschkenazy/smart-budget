'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getCategories,
  createCategoryAction,
  deleteCategoryAction,
  CategoryItem,
} from '../actions/categories-actions';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError('שגיאה בטעינת הקטגוריות');
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await createCategoryAction(name, type);
      setName('');
      setSuccess('הקטגוריה נוצרה בהצלחה!');
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת הקטגוריה');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    setError(null);
    setSuccess(null);

    if (!confirm(`האם אתה בטוח שברצונך למחוק את הקטגוריה "${catName}"?`)) {
      return;
    }

    try {
      await deleteCategoryAction(id);
      setSuccess('הקטגוריה נמחקה בהצלחה');
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'שגיאה במחיקת הקטגוריה');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">ניהול קטגוריות</h1>
          <p className="text-gray-600 text-sm mt-1">הוסף, ערוך או מחק קטגוריות עבור סיווג ה-AI</p>
        </div>
        <Link
          href="/"
          className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded-lg transition"
        >
          → חזרה לדף הראשי
        </Link>
      </div>

      {/* הודעות שגיאה והצלחה */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-500 text-red-700 rounded-md shadow-sm">
          <p className="font-bold">שגיאה</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border-r-4 border-green-500 text-green-700 rounded-md shadow-sm">
          <p className="text-sm font-semibold">{success}</p>
        </div>
      )}

      {/* טופס הוספה */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-8">
        <h2 className="text-lg font-bold mb-4 text-gray-800">הוספת קטגוריה חדשה</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">שם הקטגוריה</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="למשל: תרבות ופנאי"
              required
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">סוג</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'expense' | 'income')}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none bg-white"
            >
              <option value="expense">הוצאה</option>
              <option value="income">הכנסה</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'מוסיף...' : 'הוסף קטגוריה'}
          </button>
        </form>
      </div>

      {/* רשימת הקטגוריות */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">רשימת קטגוריות קיימות ({categories.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">שם הקטגוריה</th>
                <th className="px-6 py-3">סוג</th>
                <th className="px-6 py-3">תנועות מקושרות</th>
                <th className="px-6 py-3 text-center">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const count = cat._count?.transactions || 0;
                return (
                  <tr key={cat.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{cat.name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded ${
                          cat.type === 'income'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {cat.type === 'income' ? 'הכנסה' : 'הוצאה'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                        {count} תנועות
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className={`text-xs font-semibold px-3 py-1 rounded transition ${
                          count > 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                        title={count > 0 ? 'לא ניתן למחוק קטגוריה מקושרת לתנועות' : 'מחק קטגוריה'}
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}