'use client';

import { useState, useEffect } from 'react';
import { getCategories, CategoryItem } from '../app/actions/categories-actions';
import {
  getRules,
  createRuleAction,
  deleteRuleAction,
  RuleItem,
} from '../app/actions/rules-actions';

export default function RulesManager() {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [rulesData, catsData] = await Promise.all([
        getRules(),
        getCategories(),
      ]);
      setRules(rulesData);
      setCategories(catsData);
      if (catsData.length > 0 && !categoryId) {
        setCategoryId(Number(catsData[0].id));
      }
    } catch (err) {
      setError('שגיאה בטעינת הנתונים');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;
    setError(null);
    setLoading(true);

    try {
      await createRuleAction(keyword, Number(categoryId));
      setKeyword('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת החוק');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, kw: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את החוק עבור "${kw}"?`)) return;

    try {
      await deleteRuleAction(id);
      await loadData();
    } catch (err: any) {
      setError('שגיאה במחיקת החוק');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border-r-4 border-red-500 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-lg font-bold mb-3 text-gray-800">הוספת חוק רגיל (התאמת מילת מפתח)</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מילת מפתח בתיאור התנועה
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder='למשל: "רמי לוי", "שופרסל", "תדלוק"'
              required
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">שייך לקטגוריה</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none bg-white"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-6 rounded-lg transition disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'שומר...' : 'הוסף חוק'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">חוקים רגילים פעילים ({rules.length})</h2>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            אין חוקים רגילים מוגדרים. כל התנועות יועברו ישירות לעיבוד AI.
          </div>
        ) : (
          <table className="w-full text-sm text-right text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">מילת מפתח</th>
                <th className="px-6 py-3">קטגוריה משוייכת</th>
                <th className="px-6 py-3 text-center">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-900">{rule.keyword}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded">
                      {rule.category?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(rule.id, rule.keyword)}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded"
                    >
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}